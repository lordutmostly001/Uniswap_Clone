import { SignatureType } from 'state/signatures/types'
import { logSwapFinalized, logUniswapXSwapFinalized } from 'tracing/swapFlowLoggers'
import { UniswapXOrderStatus } from 'types/uniswapx'
import { SwapEventName } from 'uniswap/src/features/telemetry/constants'
import { sendAnalyticsEvent } from 'uniswap/src/features/telemetry/send'
import { maybeLogFirstSwapAction } from 'uniswap/src/features/transactions/swap/utils/maybeLogFirstSwapAction'
import {
  TransactionOriginType,
  TransactionStatus,
  TransactionType,
} from 'uniswap/src/features/transactions/types/transactionDetails'

vi.mock('uniswap/src/features/telemetry/send', () => ({
  sendAnalyticsEvent: vi.fn(),
}))

vi.mock('uniswap/src/features/transactions/swap/utils/SwapEventTimestampTracker', async () => {
  const actual = await vi.importActual('uniswap/src/features/transactions/swap/utils/SwapEventTimestampTracker')
  return {
    ...actual,
    timestampTracker: {
      hasTimestamp: () => false,
      setElapsedTime: () => 100,
      getElapsedTime: () => 100,
    },
  }
})

describe('swapFlowLoggers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('logSwapSuccess calls sendAnalyticsEvent with correct parameters', () => {
    const mockHash = 'mockHash'
    const mockBatchId = undefined
    const mockChainId = 1
    const mockAnalyticsContext = { page: 'mockContext' }

    logSwapFinalized({
      hash: mockHash,
      batchId: mockBatchId,
      chainInId: mockChainId,
      chainOutId: mockChainId,
      analyticsContext: mockAnalyticsContext,
      status: TransactionStatus.Success,
      type: TransactionType.Swap,
    })

    expect(sendAnalyticsEvent).toHaveBeenCalledWith(SwapEventName.SwapTransactionCompleted, {
      transactionOriginType: TransactionOriginType.Internal,
      routing: 'classic',
      time_to_swap: 100,
      time_to_swap_since_first_input: 100,
      hash: mockHash,
      chain_id: mockChainId,
      chain_id_in: mockChainId,
      chain_id_out: mockChainId,
      ...mockAnalyticsContext,
    })
  })

  it('logUniswapXSwapSuccess calls sendAnalyticsEvent with correct parameters', () => {
    const mockHash = 'mockHash'
    const mockOrderHash = 'mockOrderHash'
    const mockChainId = 1
    const mockAnalyticsContext = { page: 'mockContext' }

    logUniswapXSwapFinalized({
      hash: mockHash,
      orderHash: mockOrderHash,
      chainId: mockChainId,
      analyticsContext: mockAnalyticsContext,
      signatureType: SignatureType.SIGN_UNISWAPX_V2_ORDER,
      status: UniswapXOrderStatus.FILLED,
    })

    expect(sendAnalyticsEvent).toHaveBeenCalledWith(SwapEventName.SwapTransactionCompleted, {
      transactionOriginType: TransactionOriginType.Internal,
      routing: 'uniswap_x_v2',
      time_to_swap: 100,
      time_to_swap_since_first_input: 100,
      hash: mockHash,
      order_hash: mockOrderHash,
      chain_id: mockChainId,
      ...mockAnalyticsContext,
    })
  })

  it('maybeLogFirstSwapAction calls sendAnalyticsEvent with correct parameters', () => {
    const mockAnalyticsContext = { page: 'mockContext' }

    maybeLogFirstSwapAction(mockAnalyticsContext)
    expect(sendAnalyticsEvent).toHaveBeenCalledWith(SwapEventName.SwapFirstAction, {
      time_to_first_swap_action: 100,
      ...mockAnalyticsContext,
    })
  })
})
