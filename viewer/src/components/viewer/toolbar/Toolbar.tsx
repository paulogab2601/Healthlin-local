import { useViewerStore } from '@/store/viewer'
import { useCornerstone } from '@/hooks/viewer/useCornerstone'
import type { ToolMode } from '@/types/viewer'

interface Tool {
  mode: ToolMode
  label: string
  icon: React.ReactNode
}

const TOOLS: Tool[] = [
  {
    mode: 'Pan',
    label: 'Pan',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
      </svg>
    ),
  },
  {
    mode: 'Zoom',
    label: 'Zoom',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
      </svg>
    ),
  },
  {
    mode: 'WindowLevel',
    label: 'W/L',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
      </svg>
    ),
  },
  {
    mode: 'Length',
    label: 'Medição',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
      </svg>
    ),
  },
  {
    mode: 'Angle',
    label: 'Ângulo',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
      </svg>
    ),
  },
  {
    mode: 'RectangleROI',
    label: 'ROI',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
      </svg>
    ),
  },
]

export function Toolbar() {
  const { activeTool, setActiveTool } = useViewerStore()
  const { activateTool } = useCornerstone()

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-bg-secondary border-b border-bg-tertiary">
      {TOOLS.map((tool) => (
        <button
          key={tool.mode}
          onClick={() => { setActiveTool(tool.mode); activateTool(tool.mode) }}
          title={tool.label}
          className={[
            'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors',
            activeTool === tool.mode
              ? 'bg-accent text-white'
              : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary',
          ].join(' ')}
        >
          {tool.icon}
          <span className="hidden sm:inline">{tool.label}</span>
        </button>
      ))}
    </div>
  )
}
