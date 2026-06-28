'use client'

import { useState } from 'react'
import Link from 'next/link'

export function PublicHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <nav className="navbar absolute top-0 left-0 right-0 z-50 bg-transparent">
        <div className="navbar-start">
          <Link href="/" className="btn btn-ghost text-xl font-bold tracking-tight text-ivory">
            <span className="hidden sm:inline">Passport <span className="text-champagne">LATAM</span></span>
            <span className="sm:hidden">P<span className="text-champagne">L</span></span>
          </Link>
        </div>

        <div className="navbar-center hidden md:flex gap-1">
          <Link href="/" className="btn btn-ghost btn-sm text-ivory/80 hover:text-ivory hover:bg-ivory/10">Inicio</Link>
          <Link href="/verify" className="btn btn-ghost btn-sm text-ivory/80 hover:text-ivory hover:bg-ivory/10">Verificar producto</Link>
          <Link href="/login" className="btn btn-ghost btn-sm text-ivory/80 hover:text-ivory hover:bg-ivory/10">Empresas</Link>
        </div>

        <div className="navbar-end gap-2">
          <Link href="/verify" className="btn btn-sm hidden sm:flex border border-ivory/20 hover:text-white hover:bg-ivory/10 hover:border-ivory/30">
            Verificar un producto
          </Link>
          <Link href="/login" className="btn btn-sm bg-champagne text-charcoal font-semibold hover:bg-champagne/90 border-none">
            Registrar mi producto
          </Link>
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
        </div>
      </nav>

      {mobileOpen && (
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
