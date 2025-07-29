import { PartialMessage } from '@bufbuild/protobuf'
import { createPromiseClient } from '@connectrpc/connect'
import { UseQueryResult, queryOptions, useQuery } from '@tanstack/react-query'
import { DataApiService } from '@uniswap/client-data-api/dist/data/v1/api_connect'
import { ListTransactionsRequest, ListTransactionsResponse } from '@uniswap/client-data-api/dist/data/v1/api_pb'
import { uniswapGetTransport } from 'uniswap/src/data/rest/base'
import { WithoutWalletAccount, transformInput } from 'uniswap/src/data/rest/utils'
import { ReactQueryCacheKey } from 'utilities/src/reactQuery/cache'
import type { QueryOptionsResult } from 'utilities/src/reactQuery/queryOptions'

type GetListTransactionsInput<TSelectData = ListTransactionsResponse> = {
  input?: WithoutWalletAccount<PartialMessage<ListTransactionsRequest>> & {
    evmAddress?: string
    svmAddress?: string
  }
} & Pick<GetListTransactionsQuery<TSelectData>, 'enabled' | 'refetchInterval' | 'select'>

const transactionsClient = createPromiseClient(DataApiService, uniswapGetTransport)

/**
 * Wrapper around query for DataApiService/ListTransactions
 * This fetches data for user transactions
 */
export function useListTransactionsQuery<TSelectData = ListTransactionsResponse>(
  params: GetListTransactionsInput<TSelectData>,
): UseQueryResult<TSelectData, Error> {
  // TODO(WALL-6996): use useInfiniteQuery to support infinite scrolling and pagination
  return useQuery(getListTransactionsQuery(params))
}

type GetListTransactionsQuery<TSelectData = ListTransactionsResponse> = QueryOptionsResult<
  ListTransactionsResponse | undefined,
  Error,
  TSelectData,
  readonly [
    ReactQueryCacheKey.ListTransactions,
    Address | undefined,
    PartialMessage<ListTransactionsRequest> | undefined,
  ]
>

export const getListTransactionsQuery = <TSelectData = ListTransactionsResponse>({
  input,
  enabled,
  refetchInterval,
  select,
}: GetListTransactionsInput<TSelectData>): GetListTransactionsQuery<TSelectData> => {
  const transformedInput = transformInput(input)

  const { walletAccount, ...inputWithoutAddress } = transformedInput ?? {}
  const address = walletAccount?.platformAddresses[0]?.address

  return queryOptions({
    queryKey: [ReactQueryCacheKey.ListTransactions, address, inputWithoutAddress],
    queryFn: () =>
      transformedInput ? transactionsClient.listTransactions(transformedInput) : Promise.resolve(undefined),
    placeholderData: (prev) => prev, // this prevents the loading skeleton from appearing when refetching
    refetchInterval,
    enabled: !!input && enabled,
    subscribed: !!enabled,
    select,
  })
}
