import { isDynamicFeeTier } from 'components/Liquidity/utils'
import { FeeData } from 'pages/Pool/Positions/create/types'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CopyHelper } from 'theme/components/CopyHelper'
import { Flex, styled, Text, Tooltip } from 'ui/src'
import { DocumentList } from 'ui/src/components/icons/DocumentList'
import { ZERO_ADDRESS } from 'uniswap/src/constants/misc'
import { isAddress, shortenAddress } from 'utilities/src/addresses'

const PositionInfoBadge = styled(Text, {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '$spacing2',
  variant: 'body3',
  color: '$neutral2',
  backgroundColor: '$surface3',
  py: '$spacing2',
  px: '$padding6',
  variants: {
    size: {
      default: {
        variant: 'body3',
      },
      small: {
        variant: 'body4',
      },
    },
    placement: {
      start: {
        borderTopLeftRadius: '$rounded4',
        borderBottomLeftRadius: '$rounded4',
      },
      middle: {},
      end: {
        borderTopRightRadius: '$rounded4',
        borderBottomRightRadius: '$rounded4',
      },
      only: {
        borderRadius: '$rounded4',
      },
    },
  } as const,
})

function getPlacement(index: number, length: number): 'start' | 'middle' | 'end' | 'only' {
  return length === 1 ? 'only' : index === 0 ? 'start' : index === length - 1 ? 'end' : 'middle'
}

interface BadgeData {
  label: string
  tooltipContent?: string
  copyable?: boolean
  icon?: JSX.Element
}

export function LiquidityPositionInfoBadges({
  versionLabel,
  v4hook,
  feeTier,
  size = 'default',
}: {
  versionLabel?: string
  v4hook?: string
  feeTier?: FeeData
  size: 'small' | 'default'
}): JSX.Element {
  const { t } = useTranslation()

  const badges = useMemo(() => {
    return [
      versionLabel ? { label: versionLabel } : undefined,
      v4hook && v4hook !== ZERO_ADDRESS
        ? {
            label: v4hook,
            tooltipContent: t('liquidity.hooks.address.tooltip', { address: v4hook }),
            copyable: true,
            icon: <DocumentList color="$neutral2" size={16} />,
          }
        : undefined,
      feeTier
        ? isDynamicFeeTier(feeTier)
          ? { label: t('common.dynamic') }
          : { label: `${feeTier.feeAmount / 10000}%` }
        : undefined,
    ].filter(Boolean) as BadgeData[]
  }, [versionLabel, v4hook, feeTier, t])

  return (
    <>
      {badges.map(({ label, copyable, icon, tooltipContent }, index) => {
        const displayLabel = isAddress(label) ? shortenAddress(label) : label
        const key = label + index
        const content = (
          <PositionInfoBadge
            cursor={copyable ? 'pointer' : 'unset'}
            placement={getPlacement(index, badges.length)}
            size={size}
          >
            {icon}
            {copyable ? (
              <CopyHelper toCopy={label} iconSize={12} iconPosition="right">
                {displayLabel}
              </CopyHelper>
            ) : (
              displayLabel
            )}
          </PositionInfoBadge>
        )

        if (!tooltipContent) {
          return <Flex key={key}>{content}</Flex>
        }

        return (
          <Tooltip allowFlip stayInFrame placement="top" key={key}>
            <Tooltip.Trigger>{content}</Tooltip.Trigger>
            <Tooltip.Content maxWidth="fit-content">
              <Tooltip.Arrow />
              <Text variant="body4" color="$neutral2">
                {tooltipContent}
              </Text>
            </Tooltip.Content>
          </Tooltip>
        )
      })}
    </>
  )
}
