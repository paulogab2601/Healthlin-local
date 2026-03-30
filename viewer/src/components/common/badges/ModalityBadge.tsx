const modalityColors: Record<string, string> = {
  CT: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  MR: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  XR: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  CR: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  US: 'bg-green-500/20 text-green-300 border-green-500/30',
  NM: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  PT: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  DX: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
}

export function ModalityBadge({ modality }: { modality?: string }) {
  const code = modality?.toUpperCase() ?? '?'
  const className = modalityColors[code] ?? 'bg-bg-tertiary text-text-secondary border-bg-tertiary'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold border ${className}`}>
      {code}
    </span>
  )
}
