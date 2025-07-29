import { useMemo } from 'react'
import { useCommonTokensOptions } from 'uniswap/src/components/TokenSelector/hooks/useCommonTokensOptions'
import { useCurrencies } from 'uniswap/src/components/TokenSelector/hooks/useCurrencies'
import {
  currencyInfosToTokenOptions,
  useCurrencyInfosToTokenOptions,
} from 'uniswap/src/components/TokenSelector/hooks/useCurrencyInfosToTokenOptions'
import { TokenOption } from 'uniswap/src/components/lists/items/types'
import { COMMON_BASES } from 'uniswap/src/constants/routing'
import { GqlResult } from 'uniswap/src/data/types'
import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { currencyId } from 'uniswap/src/utils/currencyId'

export function useCommonTokensOptionsWithFallback(
  address: Address | undefined,
  chainFilter: UniverseChainId | null,
): GqlResult<TokenOption[] | undefined> {
  const { data, error, refetch, loading } = useCommonTokensOptions(address, chainFilter)
  const commonBases = chainFilter ? currencyInfosToTokenOptions(COMMON_BASES[chainFilter]) : undefined
  const commonBasesCurrencyIds = useMemo(
    () => commonBases?.map((token) => currencyId(token.currencyInfo.currency)).filter(Boolean) ?? [],
    [commonBases],
  )
  const { data: commonBasesCurrencies } = useCurrencies(commonBasesCurrencyIds)
  const commonBasesTokenOptions = useCurrencyInfosToTokenOptions({
    currencyInfos: commonBasesCurrencies,
    portfolioBalancesById: {},
  })

  const shouldFallback = data?.length === 0 && commonBases?.length

  return useMemo(
    () => ({
      data: shouldFallback ? commonBasesTokenOptions : data,
      error: shouldFallback ? undefined : error,
      refetch,
      loading,
    }),
    [commonBasesTokenOptions, data, error, loading, refetch, shouldFallback],
  )
}
