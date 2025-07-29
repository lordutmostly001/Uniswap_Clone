import { PoolStats } from '@uniswap/client-explore/dist/uniswap/explore/v1/service_pb'
import { ProtocolVersion } from '@uniswap/client-pools/dist/pools/v1/types_pb'
import { useMemo } from 'react'
import { OnchainItemListOptionType, PoolOption } from 'uniswap/src/components/lists/items/types'
import { getNativeAddress } from 'uniswap/src/constants/addresses'
import { V2_DEFAULT_FEE_TIER } from 'uniswap/src/constants/pools'
import { parseRestProtocolVersion } from 'uniswap/src/data/rest/utils'
import { fromGraphQLChain } from 'uniswap/src/features/chains/utils'
import { useCurrencyInfos } from 'uniswap/src/features/tokens/useCurrencyInfo'
import { CurrencyId } from 'uniswap/src/types/currency'
import { buildCurrencyId, isNativeCurrencyAddress } from 'uniswap/src/utils/currencyId'

export function usePoolStatsToPoolOptions(poolStats: PoolStats[] | undefined): PoolOption[] {
  const { pools: sortedPools, currencyIds } = useMemo(() => {
    if (!poolStats) {
      return { pools: [], currencyIds: [] }
    }

    const currencyIdSet = new Set<CurrencyId>()
    const pools = poolStats.filter((pool) => {
      if (!pool.token0 || !pool.token1) {
        return false
      }

      const token0Chain = fromGraphQLChain(pool.token0.chain)
      const token1Chain = fromGraphQLChain(pool.token1.chain)
      if (!token0Chain || !token1Chain) {
        return false
      }

      const token0CurrencyId = buildCurrencyId(
        token0Chain,
        isNativeCurrencyAddress(token0Chain, pool.token0.address) ? getNativeAddress(token0Chain) : pool.token0.address,
      )
      const token1CurrencyId = buildCurrencyId(
        token1Chain,
        isNativeCurrencyAddress(token1Chain, pool.token1.address) ? getNativeAddress(token1Chain) : pool.token1.address,
      )

      currencyIdSet.add(token0CurrencyId)
      currencyIdSet.add(token1CurrencyId)
      return true
    })

    return { pools, currencyIds: Array.from(currencyIdSet) }
  }, [poolStats])

  // Fetch currency infos for the currency ids
  const currencyInfos = useCurrencyInfos(currencyIds)

  return useMemo((): PoolOption[] => {
    const currencyIdToCurrencyInfo = new Map(
      currencyInfos.map((currencyInfo) => [currencyInfo?.currencyId.toLowerCase(), currencyInfo]),
    )

    // Build PoolOptions for the top pools
    return sortedPools
      .map((pool) => {
        if (!pool.token0 || !pool.token1) {
          return undefined
        }

        const poolChain = fromGraphQLChain(pool.chain)
        const token0Chain = fromGraphQLChain(pool.token0.chain)
        const token1Chain = fromGraphQLChain(pool.token1.chain)
        const protocolVersion = parseRestProtocolVersion(pool.protocolVersion)

        if (!poolChain || !token0Chain || !token1Chain || !protocolVersion) {
          return undefined
        }

        const token0CurrencyId = buildCurrencyId(
          token0Chain,
          isNativeCurrencyAddress(token0Chain, pool.token0.address)
            ? getNativeAddress(token0Chain)
            : pool.token0.address,
        )
        const token1CurrencyId = buildCurrencyId(
          token1Chain,
          isNativeCurrencyAddress(token1Chain, pool.token1.address)
            ? getNativeAddress(token1Chain)
            : pool.token1.address,
        )

        const token0CurrencyInfo = currencyIdToCurrencyInfo.get(token0CurrencyId.toLowerCase())
        const token1CurrencyInfo = currencyIdToCurrencyInfo.get(token1CurrencyId.toLowerCase())

        if (!token0CurrencyInfo || !token1CurrencyInfo) {
          return undefined
        }

        const poolOption: PoolOption = {
          type: OnchainItemListOptionType.Pool,
          poolId: pool.id,
          chainId: poolChain,
          protocolVersion,
          hookAddress: pool.hook?.address,
          feeTier: protocolVersion === ProtocolVersion.V2 ? V2_DEFAULT_FEE_TIER : pool.feeTier ?? V2_DEFAULT_FEE_TIER,
          token0CurrencyInfo,
          token1CurrencyInfo,
        }
        return poolOption
      })
      .filter((option): option is PoolOption => option !== undefined)
  }, [currencyInfos, sortedPools])
}
