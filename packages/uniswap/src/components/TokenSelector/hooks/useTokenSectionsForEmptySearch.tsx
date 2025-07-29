import { useMemo } from 'react'
import { MAX_DEFAULT_TRENDING_TOKEN_RESULTS_AMOUNT } from 'uniswap/src/components/TokenSelector/constants'
import { useRecentlySearchedTokens } from 'uniswap/src/components/TokenSelector/hooks/useRecentlySearchedTokens'
import { useTrendingTokensOptions } from 'uniswap/src/components/TokenSelector/hooks/useTrendingTokensOptions'
import { TokenSectionsHookProps } from 'uniswap/src/components/TokenSelector/types'
import { OnchainItemSectionName, type OnchainItemSection } from 'uniswap/src/components/lists/OnchainItemList/types'
import { TokenOption } from 'uniswap/src/components/lists/items/types'
import { useOnchainItemListSection } from 'uniswap/src/components/lists/utils'
import { GqlResult } from 'uniswap/src/data/types'
import { ClearRecentSearchesButton } from 'uniswap/src/features/search/ClearRecentSearchesButton'

export function useTokenSectionsForEmptySearch({
  activeAccountAddress,
  chainFilter,
}: Omit<TokenSectionsHookProps, 'input' | 'isKeyboardOpen'>): GqlResult<OnchainItemSection<TokenOption>[]> {
  const { data: trendingTokenOptions, loading } = useTrendingTokensOptions(activeAccountAddress, chainFilter)

  const recentlySearchedTokenOptions = useRecentlySearchedTokens(chainFilter)

  const recentSection = useOnchainItemListSection({
    sectionKey: OnchainItemSectionName.RecentSearches,
    options: recentlySearchedTokenOptions,
    endElement: <ClearRecentSearchesButton />,
  })

  const trendingSection = useOnchainItemListSection({
    sectionKey: OnchainItemSectionName.TrendingTokens,
    options: trendingTokenOptions?.slice(0, MAX_DEFAULT_TRENDING_TOKEN_RESULTS_AMOUNT),
  })
  const sections = useMemo(
    () => [...(recentSection ?? []), ...(trendingSection ?? [])],
    [trendingSection, recentSection],
  )

  return useMemo(
    () => ({
      data: sections,
      loading,
    }),
    [loading, sections],
  )
}
