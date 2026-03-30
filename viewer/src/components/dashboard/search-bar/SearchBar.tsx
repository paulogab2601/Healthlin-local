import { useEffect, useRef, useState } from 'react'
import { useDashboardStore } from '@/store/dashboard'

export function SearchBar() {
  const { searchQuery, setSearchQuery } = useDashboardStore()
  const [value, setValue] = useState(searchQuery)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce 300ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setSearchQuery(value), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [value, setSearchQuery])

  // Atalho "/"
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Buscar paciente, ID... (pressione / para focar)"
        className="w-full rounded-md bg-bg-tertiary border border-bg-tertiary pl-10 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
      />
    </div>
  )
}
