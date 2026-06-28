'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabaseAuth } from '@/app/hooks/useSupabaseAuth'
import Link from 'next/link'

export default function ProductsPage() {
  const router = useRouter()
  const { user, supabase, getCompany, loading: authLoading } = useSupabaseAuth()
  const [company, setCompany] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [passportIds, setPassportIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const c = await getCompany()
      setCompany(c)
      if (!c) { setLoading(false); return }

      const { data: allProducts } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', c.id)
        .order('created_at', { ascending: false })
      setProducts(allProducts || [])

      const { data: passports } = await supabase
        .from('passports')
        .select('product_id')
        .eq('company_id', c.id)
      if (passports) setPassportIds(new Set(passports.map(p => p.product_id)))

      setLoading(false)
    }
    load()
  }, [user, supabase, getCompany])

  const handleDelete = async (productId: string) => {
    if (!confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) return
    setDeleting(productId)
    setDeleteError(null)
    const { error } = await supabase.from('products').delete().eq('id', productId)
    if (error) {
      if (error.message.includes('row-level security')) {
        setDeleteError('No tenés permiso para eliminar productos. Configurá la política RLS en Supabase.')
      } else if (error.message.includes('foreign key')) {
        setDeleteError('No se puede eliminar: el producto tiene un pasaporte asociado.')
      } else {
        setDeleteError(error.message)
      }
    } else {
      setProducts(prev => prev.filter(p => p.id !== productId))
    }
    setDeleting(null)
  }

  if (authLoading || loading) return <div className="flex-1 flex items-center justify-center"><span className="loading loading-spinner loading-sm text-champagne" /></div>

  if (!company) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md">
        <h2 className="text-lg font-bold text-espresso mb-2">Creá tu empresa primero</h2>
        <p className="text-xs text-espresso/50 mb-4">Necesitás un perfil de empresa para gestionar productos.</p>
        <Link href="/company" className="btn btn-sm bg-espresso hover:bg-charcoal text-ivory border-none">Ir a perfil</Link>
      </div>
    </div>
  )

  return (
    <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-espresso">Productos</h1>
          <p className="text-xs text-espresso/50 mt-0.5">{products.length} producto{products.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/emit" className="btn btn-sm bg-espresso hover:bg-charcoal text-ivory border-none gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nuevo producto
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-espresso/40 mb-4">Aún no creaste productos</p>
          <Link href="/emit" className="btn btn-sm bg-espresso hover:bg-charcoal text-ivory border-none">Crear primer producto</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {deleteError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">{deleteError}</div>
          )}
          {products.map(p => {
            const hasPassport = passportIds.has(p.id)
            return (
              <div key={p.id} className="bg-ivory/95 backdrop-blur-sm rounded-xl border p-4 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-espresso truncate">{p.name}</p>
                  <p className="text-xs text-espresso/50 mt-0.5">
                    {p.category} · {p.origin_country}
                    {p.year && ` · ${p.year}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {hasPassport ? (
                    <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Con pasaporte</span>
                  ) : (
                    <Link href={`/emit?productId=${p.id}`} className="btn btn-xs bg-espresso hover:bg-charcoal text-ivory border-none">Emitir</Link>
                  )}
                  {!hasPassport && (
                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={deleting === p.id}
                      className="btn btn-xs border border-red-200 text-red-500 hover:bg-red-50"
                    >
                      {deleting === p.id ? <span className="loading loading-spinner loading-xs" /> : 'Eliminar'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
