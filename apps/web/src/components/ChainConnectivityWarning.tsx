import useCurrentBlockTimestamp from 'hooks/useCurrentBlockTimestamp'
import { PageType, useIsPage } from 'hooks/useIsPage'
import useMachineTimeMs from 'hooks/useMachineTime'
import styled from 'lib/styled-components'
import ms from 'ms'
import { useMemo, useState } from 'react'
import { X } from 'react-feather'
import { Trans } from 'react-i18next'
import { ExternalLink } from 'theme/components/Links'
import { CautionTriangle } from 'theme/components/icons/CautionTriangle'
import { ClickableTamaguiStyle } from 'theme/components/styles'
import { Flex, styled as tamaguiStyled } from 'ui/src'
import { iconSizes } from 'ui/src/theme'
import { useUniswapContext } from 'uniswap/src/contexts/UniswapContext'
import { getChainInfo } from 'uniswap/src/features/chains/chainInfo'
import { DEFAULT_MS_BEFORE_WARNING } from 'uniswap/src/features/chains/evm/rpc'
import { useEnabledChains } from 'uniswap/src/features/chains/hooks/useEnabledChains'
import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { AVERAGE_L1_BLOCK_TIME_MS } from 'uniswap/src/features/transactions/hooks/usePollingIntervalByChain'

const BodyRow = styled.div`
  color: ${({ theme }) => theme.neutral1};
  font-weight: 485;
  font-size: 14px;
  line-height: 20px;
`
const Link = styled(ExternalLink)`
  color: ${({ theme }) => theme.black};
  text-decoration: underline;
`
const TitleRow = styled.div`
  align-items: center;
  display: flex;
  justify-content: flex-start;
`
const TitleText = styled.div`
  color: ${({ theme }) => theme.neutral1};
  font-weight: 535;
  font-size: 16px;
  line-height: 24px;
  margin: 0px 12px;
`
const Wrapper = styled.div`
  background-color: ${({ theme }) => theme.surface1};
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.surface3};
  z-index: 2;
  display: block;
  max-width: 348px;
  padding: 16px 20px;
  position: fixed;
  bottom: 16px;
  right: 16px;
`
const CloseButton = tamaguiStyled(X, {
  ...ClickableTamaguiStyle,
  size: iconSizes.icon20,
})

export function ChainConnectivityWarning() {
  const { defaultChainId } = useEnabledChains()
  const [hide, setHide] = useState(false)
  const { swapInputChainId: chainId } = useUniswapContext()
  const info = getChainInfo(chainId ?? defaultChainId)
  const label = info.label

  const isLandingPage = useIsPage(PageType.LANDING)

  const waitMsBeforeWarning = useMemo(
    () => (chainId ? getChainInfo(chainId).blockWaitMsBeforeWarning : undefined) ?? DEFAULT_MS_BEFORE_WARNING,
    [chainId],
  )
  const machineTime = useMachineTimeMs(AVERAGE_L1_BLOCK_TIME_MS)
  const blockTime = useCurrentBlockTimestamp({ refetchInterval: ms('5min') })

  const warning = Boolean(!!blockTime && machineTime - Number(blockTime) * 1000 > waitMsBeforeWarning)

  if (hide || !warning || isLandingPage) {
    return null
  }

  return (
    <Wrapper>
      <Flex row justifyContent="space-between" alignItems="center" mb="$spacing8">
        <TitleRow>
          <CautionTriangle />
          <TitleText>
            <Trans i18nKey="network.warning" />
          </TitleText>
        </TitleRow>
        <CloseButton onClick={() => setHide(true)} />
      </Flex>
      <BodyRow>
        {chainId === UniverseChainId.Mainnet ? (
          <Trans i18nKey="network.lostConnection" />
        ) : (
          <Trans i18nKey="network.mightBeDown" values={{ network: label }} />
        )}{' '}
        {info.statusPage !== undefined && (
          <span>
            <Trans i18nKey="common.checkNetwork" components={{ link: <Link href={info.statusPage || ''} /> }} />
          </span>
        )}
      </BodyRow>
    </Wrapper>
  )
}
