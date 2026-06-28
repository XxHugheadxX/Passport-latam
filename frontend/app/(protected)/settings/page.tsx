'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabaseAuth } from '@/app/hooks/useSupabaseAuth'
import { useWallet } from '@/app/hooks/useWallet'
import Link from 'next/link'

export default function SettingsPage() {
  const router = useRouter()
  const { user, supabase, loading: authLoading, signOut } = useSupabaseAuth()
  const { address, isConnected, connect, disconnect } = useWallet()
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [user, authLoading, router])

  if (authLoading) return <div className="flex-1 flex items-center justify-center"><span className="loading loading-spinner loading-sm text-champagne" /></div>

  const handleDeleteAccount = async () => {
    if (confirmText !== 'ELIMINAR') return
    setDeleting(true)
    setDeleteError(null)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) throw new Error('No hay sesión activa')

      const res = await fetch('/api/delete-account', {
        method: 'DELETE',
        headers: { authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al eliminar cuenta')

      await signOut()
      router.push('/login')
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Error al eliminar cuenta')
      setDeleting(false)
    }
  }

  return (
    <div className="flex-1 p-4 md:p-8 max-w-lg mx-auto w-full space-y-6">
      <h1 className="text-lg font-bold text-espresso">Configuración</h1>

      {/* Account */}
      <div className="bg-ivory/95 backdrop-blur-sm rounded-2xl shadow-2xl p-7 border">
        <h2 className="text-sm font-semibold text-espresso mb-4">Cuenta</h2>
        <div className="text-xs text-espresso/70 space-y-2">
          <p><span className="text-espresso/50">Email:</span> {user?.email}</p>
          <p><span className="text-espresso/50">ID:</span> <span className="font-mono">{user?.id}</span></p>
        </div>
      </div>

      {/* Wallet */}
      <div className="bg-ivory/95 backdrop-blur-sm rounded-2xl shadow-2xl p-7 border">
        <h2 className="text-sm font-semibold text-espresso mb-4">Wallet Stellar</h2>
        {isConnected && address ? (
          <div className="space-y-3">
            <p className="text-xs font-mono text-espresso/70 bg-white/50 p-2 rounded border break-all">{address}</p>
            <button onClick={disconnect} className="btn btn-sm border border-red-200 text-red-600 hover:bg-red-50 w-full">
              Desconectar wallet
            </button>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-xs text-espresso/50 mb-3">Conectá tu wallet Stellar para firmar transacciones</p>
            <button onClick={connect} className="btn btn-sm bg-espresso hover:bg-charcoal text-ivory border-none">
              Conectar wallet
            </button>
          </div>
        )}
      </div>

      {/* Company quick link */}
      <div className="bg-ivory/95 backdrop-blur-sm rounded-2xl shadow-2xl p-7 border">
        <h2 className="text-sm font-semibold text-espresso mb-2">Empresa</h2>
        <p className="text-xs text-espresso/50 mb-3">Editá los datos de tu perfil de empresa</p>
        <Link href="/company" className="btn btn-sm border text-espresso w-full">Ir a perfil de empresa</Link>
      </div>

      {/* Delete account
      <div className="bg-ivory/95 backdrop-blur-sm rounded-2xl shadow-2xl p-7 border border-red-200">
        <h2 className="text-sm font-semibold text-red-600 mb-2">Eliminar cuenta</h2>
        <p className="text-xs text-espresso/60 mb-4 leading-relaxed">
          Esta acción eliminará todos los datos de tu empresa: productos, pasaportes,
          eventos de trazabilidad y tu cuenta de usuario. Los pasaportes emitidos en
          Stellar permanecerán inmutables en la blockchain.
        </p>
        <p className="text-xs font-semibold text-red-500 mb-2">Escribí ELIMINAR para confirmar</p>
        <input
          type="text"
          className="input input-sm bg-white border border-red-300 text-espresso w-full mb-3"
          value={confirmText}
          onChange={e => setConfirmText(e.target.value)}
          placeholder="ELIMINAR"
        />
        <button
          onClick={handleDeleteAccount}
          disabled={confirmText !== 'ELIMINAR' || deleting}
          className="btn btn-sm bg-red-600 hover:bg-red-700 text-white border-none w-full disabled:opacity-40"
        >
          {deleting ? <><span className="loading loading-spinner loading-xs" /> Eliminando...</> : 'Eliminar cuenta'}
        </button>
        {deleteError && <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">{deleteError}</div>}
      </div>
      */}

      {/* Sign out */}
      <button
        onClick={async () => { await signOut(); router.push('/login') }}
        className="btn btn-sm border border-red-200 text-red-600 hover:bg-red-50 w-full"
      >
        Cerrar sesión
      </button>
    </div>
  )
}
