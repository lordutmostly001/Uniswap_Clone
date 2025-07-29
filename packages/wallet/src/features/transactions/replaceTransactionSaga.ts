import { BigNumber, providers } from 'ethers'
import { call, put, select } from 'typed-redux-saga'
import { pushNotification } from 'uniswap/src/features/notifications/slice'
import { AppNotificationType } from 'uniswap/src/features/notifications/types'
import { WalletEventName } from 'uniswap/src/features/telemetry/constants'
import { sendAnalyticsEvent } from 'uniswap/src/features/telemetry/send'
import { addTransaction, deleteTransaction } from 'uniswap/src/features/transactions/slice'
import {
  OnChainTransactionDetails,
  TransactionDetails,
  TransactionStatus,
} from 'uniswap/src/features/transactions/types/transactionDetails'
import i18n from 'uniswap/src/i18n'
import { getValidAddress } from 'uniswap/src/utils/addresses'
import { createTransactionId } from 'uniswap/src/utils/createTransactionId'
import { logger } from 'utilities/src/logger/logger'
import { signAndSubmitTransaction } from 'wallet/src/features/transactions/executeTransaction/signAndSubmitTransaction'
import { getSerializableTransactionRequest } from 'wallet/src/features/transactions/utils'
import { getPrivateProvider, getProvider, getSignerManager } from 'wallet/src/features/wallet/context'
import { selectAccounts } from 'wallet/src/features/wallet/selectors'

export function* attemptReplaceTransaction({
  transaction,
  newTxRequest,
  isCancellation = false,
}: {
  transaction: OnChainTransactionDetails
  newTxRequest: providers.TransactionRequest
  isCancellation?: boolean
}) {
  const { chainId, hash, options } = transaction
  logger.debug('replaceTransaction', '', 'Attempting tx replacement', hash)
  const replacementTxnId = createTransactionId()

  try {
    const { from, nonce } = options.request
    if (!from || !nonce || !BigNumber.from(nonce).gte(0)) {
      throw new Error(`Cannot replace invalid transaction: ${hash}`)
    }

    const accounts = yield* select(selectAccounts)
    const checksummedAddress = getValidAddress({
      address: from,
      chainId,
      withEVMChecksum: true,
      log: false,
    })
    if (!checksummedAddress) {
      throw new Error(`Cannot replace transaction, address is invalid: ${checksummedAddress}`)
    }
    const account = accounts[checksummedAddress]
    if (!account) {
      throw new Error(`Cannot replace transaction, account missing: ${hash}`)
    }

    const request: providers.TransactionRequest = {
      ...newTxRequest,
      from,
      nonce,
    }

    // If the transaction was submitted through Flashbots, use Flashbots to submit the replacement transaction
    const provider =
      transaction.options.privateRpcProvider === 'flashbots'
        ? yield* call(getPrivateProvider, chainId)
        : yield* call(getProvider, chainId)
    const signerManager = yield* call(getSignerManager)

    const { transactionResponse, populatedRequest } = yield* call(signAndSubmitTransaction, {
      request,
      account,
      provider,
      signerManager,
      isCancellation,
    })
    logger.debug('replaceTransaction', '', 'Tx submitted. New hash:', transactionResponse.hash)

    if (isCancellation) {
      yield* call(sendAnalyticsEvent, WalletEventName.CancelSubmitted, {
        original_transaction_hash: transaction.hash,
        replacement_transaction_hash: transactionResponse.hash,
        chain_id: chainId,
        nonce: transactionResponse.nonce,
      })
    }

    const replacementTransaction: TransactionDetails = {
      ...transaction,
      // Ensure we create a new, unique txn to monitor
      id: replacementTxnId,
      hash: transactionResponse.hash,
      status: isCancellation ? TransactionStatus.Cancelling : TransactionStatus.Pending,
      receipt: undefined,
      addedTime: Date.now(), // update timestamp to now
      options: {
        ...options,
        request: getSerializableTransactionRequest(populatedRequest, chainId),
        replacedTransactionHash: transaction.hash,
      },
    }

    // Add new transaction for monitoring after submitting on chain
    yield* put(addTransaction(replacementTransaction))
  } catch (error) {
    logger.error(error, {
      tags: { file: 'replaceTransactionSaga', function: 'attemptReplaceTransaction' },
      extra: { txHash: hash },
    })

    // Unable to submit txn on chain, delete from state. This can sometimes be the case where we
    // attempt to replace a txn that has already been mined. Delete new txn in case it was added
    yield* put(
      deleteTransaction({
        address: transaction.from,
        id: replacementTxnId,
        chainId: transaction.chainId,
      }),
    )

    yield* put(
      pushNotification({
        type: AppNotificationType.Error,
        address: transaction.from,
        errorMessage: isCancellation
          ? i18n.t('transaction.notification.error.cancel')
          : i18n.t('transaction.notification.error.replace'),
      }),
    )
  }
}
