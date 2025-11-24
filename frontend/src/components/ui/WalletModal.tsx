import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '../../contexts/WalletContext';
import { getWalletInfo, formatAddress } from '../../config/wallets';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const {
    availableWallets,
    availableAccounts,
    selectWallet,
    selectAccount,
    isConnecting,
    error,
  } = useWallet();

  const [step, setStep] = useState<'wallets' | 'accounts'>('wallets');

  const handleWalletSelect = async (wallet: typeof availableWallets[0]) => {
    try {
      const accounts = await selectWallet(wallet);
      if (accounts.length === 1) {
        await selectAccount(0);
        onClose();
      } else {
        setStep('accounts');
      }
    } catch (err) {
      console.error('Failed to connect wallet:', err);
    }
  };

  const handleAccountSelect = async (index: number) => {
    await selectAccount(index);
    onClose();
    setStep('wallets');
  };

  const handleClose = () => {
    setStep('wallets');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/50"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">
              {step === 'wallets' ? 'Connect Wallet' : 'Select Account'}
            </h2>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            {step === 'wallets' ? (
              <div className="space-y-3">
                {availableWallets.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">
                    No wallets detected. Please install Bearby or Massa Station.
                  </p>
                ) : (
                  availableWallets.map((wallet) => {
                    const info = getWalletInfo(wallet.name());
                    return (
                      <button
                        key={wallet.name()}
                        onClick={() => handleWalletSelect(wallet)}
                        disabled={isConnecting}
                        className="w-full flex items-center space-x-4 p-4 border border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-colors disabled:opacity-50"
                      >
                        <span className="text-3xl">{info.icon}</span>
                        <div className="text-left">
                          <p className="font-medium text-gray-900">{info.name}</p>
                          <p className="text-sm text-gray-500">{info.description}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => setStep('wallets')}
                  className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to wallets
                </button>

                {availableAccounts?.map((acc, index) => (
                  <button
                    key={acc.address}
                    onClick={() => handleAccountSelect(index)}
                    className="w-full flex items-center space-x-4 p-4 border border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-colors"
                  >
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 font-medium">{index + 1}</span>
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Account {index + 1}</p>
                      <p className="text-sm text-gray-500 font-mono">
                        {formatAddress(acc.address)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
