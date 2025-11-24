import { Link } from "react-router-dom";
import { useState } from "react";
import { useWallet } from "../../contexts/WalletContext";
import { formatAddress } from "../../config/wallets";
import WalletModal from "../ui/WalletModal";
import Logo from "../ui/Logo";

export default function Header() {
  const { isConnected, address, isDetecting, disconnect } = useWallet();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="bg-white shadow-sm border-gray-200 border-b">
      <div className="mx-auto px-4 container">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Logo size="md" className="text-green-600" />
            <span className="font-bold text-gray-900 text-xl">FairShare</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              to="/"
              className="font-medium text-gray-600 hover:text-gray-900"
            >
              My Groups
            </Link>
            <Link
              to="/create"
              className="font-medium text-gray-600 hover:text-gray-900"
            >
              Create Group
            </Link>
          </nav>

          {/* Wallet Connection */}
          <div className="relative">
            {isDetecting ? (
              <div className="px-4 py-2 text-gray-500 text-sm">
                Detecting wallets...
              </div>
            ) : isConnected && address ? (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center space-x-2 bg-green-50 hover:bg-green-100 px-4 py-2 border border-green-200 rounded-lg transition-colors"
                >
                  <span className="text-green-600">👨🏽‍💻</span>
                  <span className="font-medium text-green-700 text-sm">
                    {formatAddress(address)}
                  </span>
                </button>

                {showDropdown && (
                  <div className="right-0 z-50 absolute bg-white shadow-lg mt-2 py-1 border border-gray-200 rounded-lg w-48">
                    <button
                      onClick={() => {
                        disconnect();
                        setShowDropdown(false);
                      }}
                      className="hover:bg-red-50 px-4 py-2 w-full text-red-600 text-sm text-left"
                    >
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowWalletModal(true)}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium text-white transition-colors"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Wallet Modal */}
      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      />
    </header>
  );
}
