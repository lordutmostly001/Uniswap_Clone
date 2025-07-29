import { popupRegistry } from 'components/Popups/registry'
import { PopupType } from 'components/Popups/types'
import { DEFAULT_TXN_DISMISS_MS, L2_TXN_DISMISS_MS } from 'constants/misc'
import { useCallback } from 'react'
import { usePollPendingBatchTransactions } from 'state/activity/polling/batch'
import { usePollPendingBridgeTransactions } from 'state/activity/polling/bridge'
import { usePollPendingOrders } from 'state/activity/polling/orders'
import { usePollPendingTransactions } from 'state/activity/polling/transactions'
import type { ActivityUpdate, OnActivityUpdate } from 'state/activity/types'
import { useAppDispatch } from 'state/hooks'
import { updateSignature } from 'state/signatures/reducer'
import { SignatureType } from 'state/signatures/types'
import {
  addTransaction,
  applyTransactionHashToBatch,
  confirmBridgeDeposit,
  finalizeTransaction,
} from 'state/transactions/reducer'
import { logSwapFinalized, logUniswapXSwapFinalized } from 'tracing/swapFlowLoggers'
import { UniswapXOrderStatus } from 'types/uniswapx'
import { isL2ChainId } from 'uniswap/src/features/chains/utils'
import {
  TransactionStatus,
  TransactionType as UniswapTransactionType,
} from 'uniswap/src/features/transactions/types/transactionDetails'
import { currencyIdToChain } from 'uniswap/src/utils/currencyId'
import { useTrace } from 'utilities/src/telemetry/trace/TraceContext'

export function ActivityStateUpdater() {
  const onActivityUpdate = useOnActivityUpdate()
  return (
    <>
      {/* The polling updater is present to update activity states for chains that are not supported by the subscriptions service. */}
      <PollingActivityStateUpdater onActivityUpdate={onActivityUpdate} />
    </>
  )
}

function PollingActivityStateUpdater({ onActivityUpdate }: { onActivityUpdate: OnActivityUpdate }) {
  usePollPendingTransactions(onActivityUpdate)
  usePollPendingBatchTransactions(onActivityUpdate)
  usePollPendingBridgeTransactions(onActivityUpdate)
  usePollPendingOrders(onActivityUpdate)
  return null
}

function useOnActivityUpdate(): OnActivityUpdate {
  const dispatch = useAppDispatch()
  const analyticsContext = useTrace()

  return useCallback(
    (activity: ActivityUpdate) => {
      const popupDismissalTime = isL2ChainId(activity.chainId) ? L2_TXN_DISMISS_MS : DEFAULT_TXN_DISMISS_MS
      if (activity.type === 'transaction') {
        const { chainId, original, update } = activity

        // TODO(WEB-7631): Make batch handling explicit
        if (activity.original.batchInfo && update.hash) {
          dispatch(
            applyTransactionHashToBatch({ batchId: activity.original.batchInfo.batchId, chainId, hash: update.hash }),
          )
        }

        const hash = update.hash ?? original.hash

        // If a bridging deposit transaction is successful, we update `depositConfirmed`but keep activity pending until the cross-chain bridge transaction confirm in bridge.ts
        if (
          original.info.type === UniswapTransactionType.Bridge &&
          !original.info.depositConfirmed &&
          update.status === TransactionStatus.Success
        ) {
          dispatch(confirmBridgeDeposit({ chainId, hash, ...update }))
          return
        }

        dispatch(finalizeTransaction({ chainId, hash, ...update }))

        const batchId = original.batchInfo?.batchId

        if (original.info.type === UniswapTransactionType.Swap) {
          logSwapFinalized({
            hash,
            batchId,
            chainInId: chainId,
            chainOutId: chainId,
            analyticsContext,
            status: update.status,
            type: original.info.type,
          })
        } else if (original.info.type === UniswapTransactionType.Bridge) {
          logSwapFinalized({
            hash,
            batchId,
            chainInId: currencyIdToChain(original.info.inputCurrencyId) ?? chainId,
            chainOutId: currencyIdToChain(original.info.outputCurrencyId) ?? chainId,
            analyticsContext,
            status: update.status,
            type: original.info.type,
          })
        }

        popupRegistry.addPopup({ type: PopupType.Transaction, hash }, hash, popupDismissalTime)
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      } else if (activity.type === 'signature') {
        const { chainId, original, update } = activity

        // Return early if the order is already filled
        if (original.status === UniswapXOrderStatus.FILLED) {
          return
        }

        const updatedOrder = { ...original, ...update }
        dispatch(updateSignature(updatedOrder))

        // SignatureDetails.type should not be typed as optional, but this will be fixed when we merge activity for uniswap. The default value appeases the typechecker.
        const signatureType = updatedOrder.type ?? SignatureType.SIGN_UNISWAPX_V2_ORDER

        if (updatedOrder.status === UniswapXOrderStatus.FILLED) {
          const hash = updatedOrder.txHash
          const from = original.offerer
          // Add a transaction in addition to updating signature for filled orders
          dispatch(addTransaction({ chainId, from, hash, info: updatedOrder.swapInfo }))
          popupRegistry.addPopup({ type: PopupType.Transaction, hash }, hash, popupDismissalTime)

          // Only track swap success for non-limit orders; limit order fill-time will throw off time tracking analytics
          if (original.type !== SignatureType.SIGN_LIMIT) {
            logUniswapXSwapFinalized({
              hash,
              orderHash: updatedOrder.orderHash,
              chainId,
              analyticsContext,
              signatureType,
              status: UniswapXOrderStatus.FILLED,
            })
          }
        } else if (original.status !== updatedOrder.status) {
          const orderHash = original.orderHash
          popupRegistry.addPopup({ type: PopupType.Order, orderHash }, orderHash, popupDismissalTime)

          if (
            updatedOrder.status === UniswapXOrderStatus.CANCELLED ||
            updatedOrder.status === UniswapXOrderStatus.EXPIRED
          ) {
            logUniswapXSwapFinalized({
              orderHash: updatedOrder.orderHash,
              chainId,
              analyticsContext,
              signatureType,
              status: updatedOrder.status,
            })
          }
        }
      }
    },
    [analyticsContext, dispatch],
  )
}
