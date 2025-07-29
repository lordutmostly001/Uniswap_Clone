import { arrayify, isHexString } from 'ethers/lib/utils'
import { signTypedData } from 'uniswap/src/features/transactions/signing'
import { ensureLeading0x } from 'uniswap/src/utils/addresses'
import { SignMessageInfo } from 'wallet/src/features/wallet/signing/signing'
import { EthTypedMessage } from 'wallet/src/features/wallet/signing/types'

// https://docs.ethers.io/v5/api/signer/#Signer--signing-methods
export async function signMessage({ message, account, signerManager, provider }: SignMessageInfo): Promise<string> {
  // Mobile code does not explicitly connect to provider,
  // Web needs to connect to provider to ensure correct chain
  const unconnectedSigner = await signerManager.getSignerForAccount(account)
  const signer = provider ? unconnectedSigner.connect(provider) : unconnectedSigner
  // If message is a hex string, we arrayify to get the byte data
  // else ethers will treat the string as if it is utf8
  const formattedMessage = isHexString(message) ? arrayify(message) : message
  const signature = await signer.signMessage(formattedMessage)
  return ensureLeading0x(signature)
}

export async function signTypedDataMessage({
  message,
  account,
  signerManager,
  provider,
}: SignMessageInfo): Promise<string> {
  const parsedData: EthTypedMessage = JSON.parse(message)
  // ethers computes EIP712Domain type for you, so we should not pass it in directly
  // or else ethers will get confused about which type is the primary type
  // https://github.com/ethers-io/ethers.js/issues/687#issuecomment-714069471
  delete parsedData.types.EIP712Domain

  // Mobile code does not explicitly connect to provider,
  // Web needs to connect to provider to ensure correct chain
  const unconnectedSigner = await signerManager.getSignerForAccount(account)
  const signer = provider ? unconnectedSigner.connect(provider) : unconnectedSigner

  return signTypedData({
    domain: parsedData.domain,
    types: parsedData.types,
    value: parsedData.message,
    signer,
  })
}
