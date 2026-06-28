'use client'

import { useEffect, useState } from 'react'
import { generatePassportQR, getVerifyUrl } from '@/app/lib/qr'

export function PassportQR({ passportId, className = '' }: { passportId: string; className?: string }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    generatePassportQR(passportId).then(setQrDataUrl).catch(() => setError('Error al generar QR'))
  }, [passportId])

  if (error) return <div className="text-error text-sm">{error}</div>
  if (!qrDataUrl) return <div className="skeleton w-48 h-48" />

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <img src={qrDataUrl} alt={`QR del pasaporte ${passportId}`} className="w-48 h-48" />
      <a
        href={qrDataUrl}
        download={`passport-${passportId}.png`}
        className="btn btn-sm btn-outline"
      >
        Descargar QR
      </a>
      <p className="text-xs text-base-content/60 text-center break-all max-w-xs">
        {getVerifyUrl(passportId)}
      </p>
    </div>
  )
}