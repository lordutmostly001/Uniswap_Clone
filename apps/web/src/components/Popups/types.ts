import { UniverseChainId } from 'uniswap/src/features/chains/types'
import { FORTransaction } from 'uniswap/src/features/fiatOnRamp/types'
import { CurrencyId } from 'uniswap/src/types/currency'

export enum PopupType {
  Transaction = 'transaction',
  Order = 'order',
  FailedSwitchNetwork = 'failedSwitchNetwork',
  SwitchNetwork = 'switchNetwork',
  Bridge = 'bridge',
  Mismatch = 'mismatch',
  FORTransaction = 'forTransaction',
}

export enum SwitchNetworkAction {
  Swap = 'swap',
  Send = 'send',
  Buy = 'buy',
  Sell = 'sell',
  Limit = 'limit',
  LP = 'lp',
  PoolFinder = 'poolFinder',
}

export type PopupContent =
  | {
      type: PopupType.Transaction
      hash: string
    }
  | {
      type: PopupType.Order
      orderHash: string
    }
  | {
      type: PopupType.FailedSwitchNetwork
      failedSwitchNetwork: UniverseChainId
    }
  | {
      type: PopupType.SwitchNetwork
      chainId: UniverseChainId
      action: SwitchNetworkAction
    }
  | {
      type: PopupType.Bridge
      inputChainId: UniverseChainId
      outputChainId: UniverseChainId
    }
  | {
      type: PopupType.Mismatch
    }
  | {
      type: PopupType.FORTransaction
      transaction: FORTransaction
      currencyId: CurrencyId
    }
