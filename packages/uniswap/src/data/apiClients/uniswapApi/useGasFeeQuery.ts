import { TransactionRequest } from '@ethersproject/providers'
import { UseQueryResult, keepPreviousData, skipToken } from '@tanstack/react-query'
import { uniswapUrls } from 'uniswap/src/constants/urls'
import { useQueryWithImmediateGarbageCollection } from 'uniswap/src/data/apiClients/hooks/useQueryWithImmediateGarbageCollection'
import { UseQueryWithImmediateGarbageCollectionApiHelperHookArgs } from 'uniswap/src/data/apiClients/types'
import { GasFeeResultWithoutState, createFetchGasFee } from 'uniswap/src/data/apiClients/uniswapApi/UniswapApiClient'
import { getActiveGasStrategy } from 'uniswap/src/features/gas/utils'
import { useStatsigClientStatus } from 'uniswap/src/features/gating/hooks'
import { ReactQueryCacheKey } from 'utilities/src/reactQuery/cache'

export function useGasFeeQuery({
  params,
  // Warning: only use when it's Ok to return old data even when params change.
  shouldUsePreviousValueDuringLoading,
  ...rest
}: UseQueryWithImmediateGarbageCollectionApiHelperHookArgs<
  { tx: TransactionRequest; fallbackGasLimit?: number; smartContractDelegationAddress?: Address },
  GasFeeResultWithoutState
> & { shouldUsePreviousValueDuringLoading?: boolean }): UseQueryResult<GasFeeResultWithoutState> {
  const { isStatsigReady } = useStatsigClientStatus()
  const queryKey = [ReactQueryCacheKey.UniswapApi, uniswapUrls.gasServicePath, params]

  return useQueryWithImmediateGarbageCollection<GasFeeResultWithoutState>({
    queryKey,
    queryFn: params
      ? (): Promise<GasFeeResultWithoutState> => fetchGasFeeQuery({ ...params, isStatsigReady })
      : skipToken,
    ...(shouldUsePreviousValueDuringLoading && { placeholderData: keepPreviousData }),
    ...rest,
  })
}

export async function fetchGasFeeQuery(params: {
  tx: TransactionRequest
  fallbackGasLimit?: number
  smartContractDelegationAddress?: Address
  isStatsigReady: boolean
}): Promise<GasFeeResultWithoutState> {
  const { tx, smartContractDelegationAddress, isStatsigReady } = params
  const gasStrategy = getActiveGasStrategy({ chainId: tx.chainId, type: 'general', isStatsigReady })
  const fetchGasFee = createFetchGasFee({ gasStrategy, smartContractDelegationAddress })
  return fetchGasFee(params)
}
