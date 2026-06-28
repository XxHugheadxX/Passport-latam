'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useWallet } from '@/app/hooks/useWallet'
import { useSupabaseAuth } from '@/app/hooks/useSupabaseAuth'

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href: '/products', label: 'Productos', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { href: '/emit', label: 'Emitir', icon: 'M12 4v16m8-8H4' },
  { href: '/transfer', label: 'Transferir', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
  { href: '/company', label: 'Empresa', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { href: '/settings', label: 'Configuración', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
]

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { address, isConnected, connect, disconnect } = useWallet()
  const { user } = useSupabaseAuth()

  return (
    <main className="flex-1 flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex w-56 shrink-0 bg-ivory border-r border-base-200 flex-col">
        <nav className="flex-1 p-3 space-y-1">
          {links.map(link => {
            const active = pathname === link.href || pathname.startsWith(link.href + '/')
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-espresso text-ivory shadow-sm'
                    : 'text-espresso/60 hover:bg-espresso/5 hover:text-espresso'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                </svg>
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-base-200">
          {isConnected && address ? (
            <div className="text-xs text-espresso/50 truncate">
              <span className="font-mono">{address.slice(0, 6)}...{address.slice(-4)}</span>
              <button onClick={disconnect} className="block mt-1 text-red-500/70 hover:text-red-500 text-[10px]">
                Desconectar
              </button>
            </div>
          ) : user && (
            <button onClick={connect} className="text-xs text-espresso/60 hover:text-espresso flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Conectar wallet
            </button>
          )}
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col bg-base-200 min-w-0 pb-16 md:pb-0">
        {children}
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-ivory border-t border-base-200 flex">
        {links.map(link => {
          const active = pathname === link.href || pathname.startsWith(link.href + '/')
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                active ? 'text-espresso' : 'text-espresso/50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
              </svg>
              {link.label}
            </Link>
          )
        })}
      </nav>
    </main>
  )
}
