import { Button } from '../buttons/Button'

interface ConnectionErrorProps {
  onRetry: () => void
  overlay?: boolean
}

export function ConnectionError({ onRetry, overlay = false }: ConnectionErrorProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="rounded-full bg-danger/10 p-4">
        <svg className="h-8 w-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <div>
        <h3 className="text-base font-semibold text-text-primary">Servidor de imagens indisponível</h3>
        <p className="mt-1 text-sm text-text-secondary">
          Não foi possível conectar ao Orthanc. Verifique se o servidor está em execução.
        </p>
      </div>
      <Button variant="secondary" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  )

  if (overlay) {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg-primary/80 backdrop-blur-sm rounded-lg">
        {content}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-danger/30 bg-danger/5">
      {content}
    </div>
  )
}
