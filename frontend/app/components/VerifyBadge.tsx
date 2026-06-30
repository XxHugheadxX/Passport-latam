'use client'

interface VerifyBadgeProps {
  onChainHash: string | null
  offChainHash: string | null
  loading?: boolean
}

export function VerifyBadge({ onChainHash, offChainHash, loading }: VerifyBadgeProps) {
  if (loading) return <div className="badge badge-ghost gap-2"><span className="loading loading-spinner loading-xs" /> Verificando...</div>
  if (!onChainHash) return null

  const match = onChainHash === offChainHash

  if (match) return <div className="badge badge-success gap-2 text-white">Verificado en Stellar</div>

  return (
    <div className="tooltip" data-tip="El hash on-chain no coincide con los datos off-chain">
      <div className="badge badge-error gap-2 text-white">Hash no coincide</div>
    </div>
  )
}