import { Link } from 'react-router-dom'

interface Crumb {
  label: string
  to?: string
}

interface NavbarProps {
  crumbs: Crumb[]
}

export function Navbar({ crumbs }: NavbarProps) {
  return (
    <nav className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary border-b border-bg-tertiary bg-bg-secondary">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <span className="text-text-muted">/</span>}
          {crumb.to ? (
            <Link to={crumb.to} className="hover:text-text-primary transition-colors">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-text-primary font-medium">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
