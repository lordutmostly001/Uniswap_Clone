import { useQuery } from '@tanstack/react-query'
import { useUnitagsClaimEligibilityQuery } from 'uniswap/src/data/apiClients/unitagsApi/useUnitagsClaimEligibilityQuery'
import { UnitagErrorCodes } from 'uniswap/src/features/unitags/types'
import { uniqueIdQuery } from 'utilities/src/device/uniqueIdQuery'

export const useCanAddressClaimUnitag = (
  address?: Address,
  isUsernameChange?: boolean,
): { canClaimUnitag: boolean; errorCode?: UnitagErrorCodes } => {
  const { data: deviceId } = useQuery(uniqueIdQuery())
  const skip = !deviceId

  const { isLoading, data } = useUnitagsClaimEligibilityQuery({
    params: skip
      ? undefined
      : {
          address,
          deviceId,
          isUsernameChange,
        },
  })

  return {
    canClaimUnitag: !isLoading && !!data?.canClaim,
    errorCode: data?.errorCode,
  }
}
