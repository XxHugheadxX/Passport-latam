'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabaseAuth } from '@/app/hooks/useSupabaseAuth'
import Link from 'next/link'
import { PassportCard, PassportSummary } from '@/app/components/PassportCard'

export default function DashboardPage() {
  const router = useRouter()
  const { user, supabase, getCompany, loading: authLoading } = useSupabaseAuth()

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [user, authLoading, router])
  const [passports, setPassports] = useState<PassportSummary[]>([])
  const [productsWithoutPassport, setProductsWithoutPassport] = useState<any[]>([])
  const [company, setCompany] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const c = await getCompany()
      setCompany(c)
      if (!c) { setLoading(false); return }

      const { data: passportsData } = await supabase
        .from('passports')
        .select('*, products(id, name, category, origin_country, images)')
        .eq('company_id', c.id)
        .order('created_at', { ascending: false })
      if (passportsData) {
        setPassports(passportsData.map((p: any) => ({
          id: p.passport_id,
          productName: p.products?.name || 'Sin nombre',
          category: p.products?.category || '-',
          originCountry: p.products?.origin_country || '-',
          status: p.is_active ? 'active' : 'transferred',
          createdAt: p.created_at,
          ownerAddress: p.owner_address,
          imageUrl: p.products?.images?.[0],
        })))
      }

      const passportProductIds = new Set((passportsData || []).map((p: any) => p.product_id))
      const { data: allProducts } = await supabase
        .from('products')
        .select('id, name, category, origin_country')
        .eq('company_id', c.id)
        .order('created_at', { ascending: false })
      if (allProducts) {
        setProductsWithoutPassport(allProducts.filter(p => !passportProductIds.has(p.id)))
      }

      setLoading(false)
    }
    load()
  }, [user, supabase, getCompany])

  return (
    <div className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">
      {loading ? (
        <div className="space-y-6">
          <div className="skeleton h-12 w-48 mb-4" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-64" />)}
          </div>
        </div>
      ) : !company ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </div>
            <h2 className="text-xl font-bold mb-2">Completá tu perfil de empresa</h2>
            <p className="text-base-content/60 mb-6">Necesitás un perfil de empresa para poder emitir pasaportes digitales en Stellar.</p>
            <Link href="/emit" className="btn btn-primary btn-lg">Crear perfil de empresa</Link>
          </div>
        </div>
      ) : passports.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            </div>
            <h2 className="text-xl font-bold mb-2">Aún no tenés pasaportes</h2>
            <p className="text-base-content/60 mb-6">Emití tu primer pasaporte digital para que tus productos sean verificables en Stellar.</p>
            <Link href="/emit" className="btn btn-primary btn-lg gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Emitir pasaporte
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold">Mis pasaportes</h1>
              <p className="text-base-content/60 text-sm mt-1">{company.name}</p>
            </div>
            <Link href="/emit" className="btn btn-primary btn-lg gap-2 shadow-xs">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Emitir pasaporte
            </Link>
          </div>

          <div className="stats shadow-sm mb-8 w-full bg-primary text-primary-content">
            <div className="stat">
              <div className="stat-title text-primary-content/70">Total</div>
              <div className="stat-value">{passports.length}</div>
            </div>
            <div className="stat">
              <div className="stat-title text-primary-content/70">Activos</div>
              <div className="stat-value">{passports.filter(p => p.status === 'active').length}</div>
            </div>
            <div className="stat">
              <div className="stat-title text-primary-content/70">Transferidos</div>
              <div className="stat-value">{passports.filter(p => p.status !== 'active').length}</div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {passports.map(p => <PassportCard key={p.id} passport={p} />)}
          </div>

          {productsWithoutPassport.length > 0 && (
            <div className="mt-12">
              <h2 className="text-lg font-bold mb-4">Productos sin pasaporte</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {productsWithoutPassport.map(p => (
                  <div key={p.id} className="border border-base-200 rounded-xl p-4 bg-base-50">
                    <p className="font-medium text-sm">{p.name}</p>
                    <p className="text-xs text-base-content/50 mt-1">{p.category} · {p.origin_country}</p>
                    <Link href="/emit" className="btn btn-xs btn-ghost text-primary mt-3 gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Emitir pasaporte
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}