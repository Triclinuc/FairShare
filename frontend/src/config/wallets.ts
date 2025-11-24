// Wallet configuration and constants

export const WALLET_NAMES = {
  BEARBY: 'BEARBY',
  MASSASTATION: 'MASSASTATION',
  METAMASK: 'METAMASK',
} as const

export type WalletName = typeof WALLET_NAMES[keyof typeof WALLET_NAMES]

export const WALLET_INFO = {
  BEARBY: {
    name: 'Bearby',
    icon: '🐻',
    description: 'Browser extension wallet for Massa',
    downloadUrl: 'https://bearby.io',
    color: '#FF6B35',
  },
  MASSASTATION: {
    name: 'Massa Station',
    icon: '🚉',
    description: 'Official Massa desktop wallet',
    downloadUrl: 'https://station.massa',
    color: '#00A896',
  },
  METAMASK: {
    name: 'MetaMask Snap',
    icon: '🦊',
    description: 'Use MetaMask with Massa',
    downloadUrl: 'https://snaps.metamask.io/snap/npm/massalabs/metamask-snap/',
    color: '#F6851B',
  },
} as const

// Feature availability matrix
export const WALLET_FEATURES = {
  BEARBY: {
    connect: true,
    disconnect: true,
    listenAccountChanges: true,
    listenNetworkChanges: true,
  },
  MASSASTATION: {
    connect: false,
    disconnect: false,
    listenAccountChanges: false,
    listenNetworkChanges: false,
  },
  METAMASK: {
    connect: true,
    disconnect: true,
    listenAccountChanges: true,
    listenNetworkChanges: true,
  },
} as const

// Helper to get wallet display info
export function getWalletInfo(walletName: string) {
  const normalizedName = walletName.toUpperCase() as WalletName
  return WALLET_INFO[normalizedName] || {
    name: walletName,
    icon: '💼',
    description: 'Massa wallet',
    downloadUrl: '',
    color: '#666666',
  }
}

// Helper to check if wallet supports a feature
export function walletSupportsFeature(
  walletName: string,
  feature: keyof typeof WALLET_FEATURES.BEARBY
): boolean {
  const normalizedName = walletName.toUpperCase() as WalletName
  const features = WALLET_FEATURES[normalizedName]
  if (!features) return false
  return features[feature]
}

// Format address for display
export function formatAddress(address: string, startChars = 6, endChars = 4): string {
  if (address.length <= startChars + endChars) return address
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`
}
