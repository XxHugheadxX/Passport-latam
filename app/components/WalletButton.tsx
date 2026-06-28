'use client'

import { useWallet } from '@/app/hooks/useWallet'

export function WalletButton({ className = '' }: { className?: string }) {
  const { address, isConnected, connect, disconnect, isConnecting } = useWallet()

  if (isConnected && address) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-sm font-mono text-base-content/70">
          {address.slice(0, 4)}...{address.slice(-4)}
        </span>
        <button
          onClick={disconnect}
          className="btn btn-sm btn-ghost btn-circle text-error"
          title="Desconectar wallet"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={connect}
      disabled={isConnecting}
      className={`btn btn-sm btn-primary gap-2 ${className}`}
    >
      {isConnecting ? (
        <><span className="loading loading-spinner loading-xs" /> Conectando...</>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          <span>Conectar Wallet</span>
        </>
      )}
    </button>
  )
}