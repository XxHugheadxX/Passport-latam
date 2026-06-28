'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useSupabaseAuth } from '@/app/hooks/useSupabaseAuth'
import { useWallet } from '@/app/hooks/useWallet'
import { useState } from 'react'

export function NavBar() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, signOut, loading: authLoading } = useSupabaseAuth()
  const { address, isConnected, connect, disconnect } = useWallet()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isLanding = pathname === '/'
  const isAuth = pathname === '/login'

  if (isAuth) return null

  if (authLoading) return (
    <div className={`navbar ${isLanding ? 'absolute top-0 left-0 right-0 z-50 bg-transparent' : 'bg-base-100'}`}>
      <div className="navbar-start"><span className="loading loading-spinner loading-sm ml-4" /></div>
    </div>
  )

  return (
    <>
      <nav className={`navbar z-50 transition-all duration-300 ${isLanding ? 'absolute top-0 left-0 right-0 bg-transparent' : 'bg-base-100 shadow-sm border-b border-base-200'}`}>
        <div className="navbar-start">
          <Link href={user ? '/dashboard' : '/'} className={`btn btn-ghost text-xl font-bold tracking-tight ${isLanding ? 'text-ivory' : 'text-espresso'}`}>
            <span className="hidden sm:inline">Passport <span className="text-champagne">LATAM</span></span>
            <span className="sm:hidden">P<span className="text-champagne">L</span></span>
          </Link>
        </div>

        {isLanding && (
          <div className="navbar-center hidden md:flex gap-1">
            <Link href="/" className="btn btn-ghost btn-sm text-ivory/80 hover:text-ivory hover:bg-ivory/10">Inicio</Link>
            <Link href="/verify" className="btn btn-ghost btn-sm text-ivory/80 hover:text-ivory hover:bg-ivory/10">Verificar producto</Link>
            <Link href="/login" className="btn btn-ghost btn-sm text-ivory/80 hover:text-ivory hover:bg-ivory/10">Empresas</Link>
          </div>
        )}

        {!isLanding && (
          <div className="navbar-center hidden md:flex gap-1">
            {!user && <Link href="/" className="btn btn-ghost btn-sm">Inicio</Link>}
          </div>
        )}

        <div className="navbar-end gap-2">
          {isLanding && (
            <>
              <Link href="/verify" className="btn btn-sm hidden sm:flex border border-ivory/20 text-justify hover:bg-ivory/10 hover:border-ivory/30">
                Verificar un producto
              </Link>
              <Link href="/login" className="btn btn-sm bg-champagne text-charcoal font-semibold hover:bg-champagne/90 border-none">
                Registrar mi producto
              </Link>
            </>
          )}

          {!isLanding && !user && (
            <Link href="/login" className="btn btn-primary btn-sm hidden md:flex">Iniciar sesión</Link>
          )}

          {(user || isConnected) && (
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isLanding ? 'bg-ivory/20 text-ivory' : 'bg-primary/10 text-primary'}`}>
                  {user ? user.email?.slice(0, 1).toUpperCase() : address?.slice(0, 2)}
                </div>
              </label>
              <ul tabIndex={0} className="menu menu-sm dropdown-content bg-base-100 rounded-box z-50 mt-3 w-56 p-2 shadow-lg border border-base-200">
                {user && (
                  <li>
                    <span className="px-2 py-1.5 text-xs text-base-content/50 truncate">{user.email}</span>
                  </li>
                )}
                {isConnected && address && (
                  <li>
                    <span className="px-2 py-1.5 text-xs font-mono text-base-content/50 truncate">{address.slice(0, 6)}...{address.slice(-4)}</span>
                  </li>
                )}

                <li><hr className="my-1" /></li>

                {user && (
                  <>
                    <li><Link href="/dashboard" className="py-2 text-sm">Dashboard</Link></li>
                    <li><Link href="/emit" className="py-2 text-sm">Emitir pasaporte</Link></li>
                    <li><hr className="my-1" /></li>
                  </>
                )}

                {isConnected ? (
                  <li><button onClick={disconnect} className="py-2 text-sm text-error">Desconectar wallet</button></li>
                ) : (
                  <li><button onClick={connect} className="py-2 text-sm">Conectar wallet Stellar</button></li>
                )}

                <li><hr className="my-1" /></li>

                {user ? (
                  <li><button onClick={async () => { await signOut(); router.push('/login') }} className="py-2 text-sm">Cerrar sesión</button></li>
                ) : (
                  <li><Link href="/login" className="py-2 text-sm">Iniciar sesión</Link></li>
                )}
              </ul>
            </div>
          )}

          {isLanding && (
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="btn btn-ghost btn-sm text-ivory md:hidden"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          )}
        </div>
      </nav>

      {isLanding && mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-charcoal/95 backdrop-blur-md" onClick={() => setMobileOpen(false)} />
          <div className="relative z-50 flex flex-col items-center justify-center h-full gap-6 px-4">
            <Link href="/" onClick={() => setMobileOpen(false)} className="text-2xl text-ivory font-bold">Inicio</Link>
            <Link href="/verify" onClick={() => setMobileOpen(false)} className="text-2xl text-ivory/80 font-medium">Verificar producto</Link>
            <Link href="/login" onClick={() => setMobileOpen(false)} className="text-2xl text-ivory/80 font-medium">Empresas</Link>
            <hr className="w-24 border-ivory/20 my-4" />
            <Link href="/verify" onClick={() => setMobileOpen(false)} className="btn btn-lg border border-ivory/20 text-ivory hover:bg-ivory/10 w-full max-w-xs">
              Verificar un producto
            </Link>
            <Link href="/login" onClick={() => setMobileOpen(false)} className="btn btn-lg bg-champagne text-charcoal font-semibold hover:bg-champagne/90 border-none w-full max-w-xs">
              Registrar mi producto
            </Link>
          </div>
        </div>
      )}
    </>
  )
}