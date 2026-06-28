'use client'

import Link from 'next/link'

export interface PassportSummary {
  id: string
  productName: string
  category: string
  originCountry: string
  status: string
  createdAt: string
  ownerAddress?: string
  imageUrl?: string
}

export function PassportCard({ passport, className = '' }: { passport: PassportSummary; className?: string }) {
  return (
    <div className={`card card-compact bg-base-100 shadow-sm border border-base-200 hover:shadow-md transition-shadow ${className}`}>
      <figure className="h-32 bg-base-200">
        {passport.imageUrl ? (
          <img src={passport.imageUrl} alt={passport.productName} className="object-cover w-full h-full" />
        ) : (
          <div className="flex items-center justify-center w-full h-full text-base-content/20">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
          </div>
        )}
      </figure>
      <div className="card-body">
        <div className="flex items-start justify-between gap-2">
          <h3 className="card-title text-sm truncate">{passport.productName}</h3>
          <span className={`badge badge-sm ${passport.status === 'active' ? 'badge-success' : passport.status === 'transferred' ? 'badge-info' : 'badge-ghost'}`}>
            {passport.status}
          </span>
        </div>
        <div className="text-xs text-base-content/60 space-y-1">
          <p>Origen: {passport.originCountry}</p>
          <p>Categoría: {passport.category}</p>
          <p className="font-mono">ID: {passport.id.slice(0, 10)}...</p>
          <p>Emitido: {new Date(passport.createdAt).toLocaleDateString('es-ES')}</p>
        </div>
        <div className="card-actions justify-end mt-2">
          <Link href={`/passport/${passport.id}`} className="btn btn-sm btn-outline">
            Ver detalle
          </Link>
        </div>
      </div>
    </div>
  )
}