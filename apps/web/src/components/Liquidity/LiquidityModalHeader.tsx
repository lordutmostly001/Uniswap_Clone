import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Flex, ModalCloseIcon, Text, TouchableArea } from 'ui/src'
import { BackArrow } from 'ui/src/components/icons/BackArrow'
import { TransactionSettings } from 'uniswap/src/features/transactions/swap/components/SwapFormSettings/SwapFormSettings'
import { Deadline } from 'uniswap/src/features/transactions/swap/components/SwapFormSettings/settingsConfigurations/deadline/Deadline/Deadline'
import { Slippage } from 'uniswap/src/features/transactions/swap/components/SwapFormSettings/settingsConfigurations/slippage/Slippage/Slippage'

export function LiquidityModalHeader({
  title,
  closeModal,
  goBack,
}: {
  title: string
  closeModal: () => void
  goBack?: () => void
}) {
  const { t } = useTranslation()

  const CloseIconComponent = useMemo(
    () => <ModalCloseIcon testId="LiquidityModalHeader-close" onClose={closeModal} />,
    [closeModal],
  )

  return (
    <Flex row justifyContent="space-between" alignItems="center" gap="$spacing4" width="100%">
      {goBack ? (
        <TouchableArea onPress={goBack}>
          <BackArrow color="$neutral1" size="$icon.24" />
        </TouchableArea>
      ) : (
        CloseIconComponent
      )}
      <Text variant="body2" flexGrow={1} textAlign="center" pr={24}>
        {title}
      </Text>
      {!goBack ? (
        <TransactionSettings
          adjustTopAlignment={false}
          settings={[Slippage, Deadline]}
          defaultTitle={t('pool.positions.transaction.settings')}
        />
      ) : (
        <Flex position="absolute" top="0" right="0" p="$spacing4">
          {CloseIconComponent}
        </Flex>
      )}
    </Flex>
  )
}
