'use client'

interface TxStatusProps {
  status: 'idle' | 'building' | 'signing' | 'submitting' | 'success' | 'error'
  txHash?: string | null
  error?: string | null
  message?: string | null
}

export function TxStatus({ status, txHash, error, message }: TxStatusProps) {
  if (status === 'idle') return null

  const statusConfig = {
    idle: { icon: null, text: '', className: '' },
    building: { icon: <span className="loading loading-spinner loading-xs" />, text: message || 'Preparando transacción...', className: 'alert-info' },
    signing: { icon: <span className="loading loading-spinner loading-xs" />, text: message || 'Firmando en tu wallet...', className: 'alert-info' },
    submitting: { icon: <span className="loading loading-spinner loading-xs" />, text: message || 'Enviando a Stellar...', className: 'alert-info' },
    success: { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>, text: message || '¡Transacción confirmada!', className: 'alert-success' },
    error: { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>, text: error || 'Error en la transacción', className: 'alert-error' },
  }

  const config = statusConfig[status]

  return (
    <div className={`alert ${config.className} shadow-sm`}>
      <div className="flex items-center gap-2">
        {config.icon}
        <span className="text-sm">{config.text}</span>
      </div>
      {txHash && (
        <p className="text-xs text-base-content/60 mt-1 break-all">
          Hash: {txHash}
        </p>
      )}
    </div>
  )
}