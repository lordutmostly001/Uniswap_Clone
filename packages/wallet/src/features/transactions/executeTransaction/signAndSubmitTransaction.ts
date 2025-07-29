import { providers } from 'ethers'
import { AccountMeta } from 'uniswap/src/features/accounts/types'
import { DEFAULT_NATIVE_ADDRESS } from 'uniswap/src/features/chains/evm/defaults'
import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { logger } from 'utilities/src/logger/logger'
import { ONE_SECOND_MS } from 'utilities/src/time/time'
import { PublicClient } from 'viem'
import { getAccountDelegationDetails } from 'wallet/src/features/smartWallet/delegation/utils'
import {
  convertToEIP7702,
  createSignedAuthorization,
  signAndSerializeEIP7702Transaction,
} from 'wallet/src/features/transactions/executeTransaction/eip7702Utils'
import { SignerManager } from 'wallet/src/features/wallet/signing/SignerManager'
import { hexlifyTransaction } from 'wallet/src/utils/transaction'

export async function signAndSubmitTransaction({
  request,
  account,
  provider,
  signerManager,
  viemClient,
  isCancellation,
  isRemoveDelegation,
}: {
  request: providers.TransactionRequest
  account: AccountMeta
  provider: providers.Provider
  signerManager: SignerManager
  viemClient?: PublicClient
  isCancellation?: boolean
  isRemoveDelegation?: boolean
}): Promise<{
  transactionResponse: providers.TransactionResponse
  populatedRequest: providers.TransactionRequest
  timestampBeforeSign: number
  timestampBeforeSend: number
}> {
  const signer = await signerManager.getSignerForAccount(account)
  const connectedSigner = signer.connect(provider)
  const hexRequest = hexlifyTransaction(request)
  const populatedRequest = await connectedSigner.populateTransaction(hexRequest)
  const chainId = populatedRequest.chainId ?? UniverseChainId.Mainnet

  // For smart wallet transactions, check if the transaction needs delegation.
  // Cancellations should be excluded
  if (populatedRequest.to === populatedRequest.from && !isCancellation) {
    const delegationInfo = await getAccountDelegationDetails(account.address, chainId)
    logger.debug(
      'signAndSubmitTransaction',
      'signAndSubmitTransaction',
      'needs delegation to contract:',
      delegationInfo.contractAddress,
    )
    if (!delegationInfo.contractAddress) {
      throw new Error('Delegation contract address not found')
    }

    let newDelegationContractAddress: Address | undefined
    if (isRemoveDelegation) {
      newDelegationContractAddress = DEFAULT_NATIVE_ADDRESS
      logger.debug('signAndSubmitTransaction', 'signAndSubmitTransaction', 'Remove delegation request')
    } else {
      // new delegation or contract address update
      if (delegationInfo.needsDelegation) {
        newDelegationContractAddress = delegationInfo.contractAddress
        logger.debug(
          'signAndSubmitTransaction',
          'signAndSubmitTransaction',
          'New delegation contract address:',
          newDelegationContractAddress,
        )
      }
    }

    if (newDelegationContractAddress && viemClient) {
      const timestampBeforeSign = Date.now()

      // Authorization nonce needs to be +1 of the nonce of the transaction
      const authorizationNonce = Number(populatedRequest.nonce) + 1
      const signedAuthorization = await createSignedAuthorization({
        signer: connectedSigner,
        walletAddress: account.address as `0x${string}`,
        chainId,
        contractAddress: newDelegationContractAddress,
        nonce: authorizationNonce,
      })

      // Convert to EIP-7702 transaction format
      const viemTxRequest = convertToEIP7702({
        ethersTx: populatedRequest,
        walletAddress: account.address as `0x${string}`,
        signedAuthorization,
      })
      const serializedTxWithSignature = await signAndSerializeEIP7702Transaction({
        signer: connectedSigner,
        tx: viemTxRequest,
        address: account.address,
        chainId,
      })
      logger.debug(
        'signAndSubmitTransaction',
        'signAndSubmitTransaction',
        'serializedTxWithSignature',
        serializedTxWithSignature,
      )

      const timestampBeforeSend = Date.now()
      // Send the raw transaction
      const transactionHash = await viemClient.sendRawTransaction({
        serializedTransaction: serializedTxWithSignature,
      })
      logger.debug('signAndSubmitTransaction', 'signAndSubmitTransaction', 'transactionHash', transactionHash)

      let transactionResponse: providers.TransactionResponse | undefined
      let retryCount = 0
      // Retry after a few seconds in case the transaction has not been picked up by other RPC
      while (!transactionResponse) {
        try {
          transactionResponse = await provider.getTransaction(transactionHash)
        } catch (error) {
          logger.debug('signAndSubmitTransaction', 'signAndSubmitTransaction', 'Transaction not found, retrying...')
          // eslint-disable-next-line max-depth
          if (retryCount > 10) {
            throw error
          }
          retryCount++
          await new Promise((resolve) => setTimeout(resolve, ONE_SECOND_MS))
        }
      }
      return { transactionResponse, populatedRequest, timestampBeforeSign, timestampBeforeSend }
    }
  }

  // Traditional transaction signing fallback
  const timestampBeforeSign = Date.now()
  const signedTx = await connectedSigner.signTransaction(populatedRequest)
  const timestampBeforeSend = Date.now()
  const transactionResponse = await provider.sendTransaction(signedTx)
  return { transactionResponse, populatedRequest, timestampBeforeSign, timestampBeforeSend }
}
