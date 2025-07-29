import { PersistState } from 'redux-persist'
import { TransactionInfo } from 'state/transactions/types'
import { TransactionStatus } from 'uniswap/src/data/graphql/uniswap-data-api/__generated__/types-and-hooks'
import { UniverseChainId } from 'uniswap/src/features/chains/types'

interface SerializableTransactionReceipt {
  to: string
  from: string
  contractAddress: string
  transactionIndex: number
  blockHash: string
  transactionHash: string
  blockNumber: number
  status?: number
}

export interface OldTransactionState {
  [chainId: number]: {
    [txHash: string]: Omit<TransactionDetails, 'status'> & {
      receipt?: SerializableTransactionReceipt
      lastCheckedBlockNumber?: number
      confirmedTime?: number
      deadline?: number
    }
  }
}

interface BaseTransactionDetails {
  status: TransactionStatus
  hash: string
  batchInfo?: { connectorId?: string; batchId: string; chainId: UniverseChainId }
  addedTime: number
  from: string
  info: TransactionInfo
  nonce?: number
  cancelled?: true
}

interface PendingTransactionDetails extends BaseTransactionDetails {
  status: TransactionStatus.Pending
  lastCheckedBlockNumber?: number
  deadline?: number
}

interface ConfirmedTransactionDetails extends BaseTransactionDetails {
  status: TransactionStatus.Confirmed | TransactionStatus.Failed
  confirmedTime: number
}

type TransactionDetails = PendingTransactionDetails | ConfirmedTransactionDetails

export interface NewTransactionState {
  [chainId: number]: {
    [txHash: string]: TransactionDetails
  }
}

export type PersistAppStateV12 = {
  _persist: PersistState
} & { transactions?: OldTransactionState }

/**
 * Migration for the change that refactored TransactionDetails into a union discriminated by `status` and removed `receipt`.
 */
export const migration12 = (state: PersistAppStateV12 | undefined) => {
  if (!state?.transactions) {
    return state
  }

  // eslint-disable-next-line guard-for-in
  for (const chainId in state.transactions) {
    const transactionsForChain = state.transactions[chainId]
    // eslint-disable-next-line guard-for-in
    for (const txHash in transactionsForChain) {
      const { receipt, ...tx } = transactionsForChain[txHash]

      const status = receipt
        ? receipt.status === 1
          ? TransactionStatus.Confirmed
          : TransactionStatus.Failed
        : TransactionStatus.Pending

      ;(tx as unknown as { status: TransactionStatus }).status = status

      transactionsForChain[txHash] = tx
    }
  }

  return { ...state, _persist: { ...state._persist, version: 12 } }
}
