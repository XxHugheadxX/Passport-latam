'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useSupabaseAuth } from '@/app/hooks/useSupabaseAuth'
import { useState } from 'react'

export function NavBar() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, signOut, loading: authLoading } = useSupabaseAuth()

  const hide = pathname === '/login' || pathname.startsWith('/verify') || pathname.startsWith('/transfer')
  if (hide) return null

  if (authLoading) return (
    <div className="navbar bg-base-100">
      <div className="navbar-start"><span className="loading loading-spinner loading-sm ml-4" /></div>
    </div>
  )

  return (
    <nav className="navbar bg-base-100 shadow-sm border-b border-base-200 z-50">
      <div className="navbar-start">
        <Link href={user ? '/dashboard' : '/'} className="btn btn-ghost text-xl font-bold text-espresso tracking-tight">
          Passport LATAM
        </Link>
      </div>

      <div className="navbar-center hidden md:flex gap-1">
        {!user && <Link href="/" className="btn btn-ghost btn-sm">Inicio</Link>}
      </div>

      <div className="navbar-end gap-2">
        {!user && (
          <Link href="/login" className="btn btn-primary btn-sm hidden md:flex">Iniciar sesión</Link>
        )}

        {user && (
          <div className="dropdown dropdown-end">
            <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                {user.email?.slice(0, 1).toUpperCase()}
              </div>
            </label>
            <ul tabIndex={0} className="menu menu-sm dropdown-content bg-base-100 rounded-box z-50 mt-3 w-56 p-2 shadow-lg border border-base-200">
              <li>
                <span className="px-2 py-1.5 text-xs text-base-content/50 truncate">{user.email}</span>
              </li>
              <li><hr className="my-1" /></li>
              <li><Link href="/dashboard" className="py-2 text-sm">Dashboard</Link></li>
              <li><Link href="/emit" className="py-2 text-sm">Emitir pasaporte</Link></li>
              <li><Link href="/settings" className="py-2 text-sm">Configuración</Link></li>
              <li><hr className="my-1" /></li>
              <li>
                <button
                  onClick={async () => { await signOut(); router.push('/login') }}
                  className="py-2 text-sm text-error"
                >
                  Cerrar sesión
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
    </nav>
  )
}
