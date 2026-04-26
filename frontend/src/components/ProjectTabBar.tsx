import type { ProjectTab } from '../hooks/useProjectTabs'

export function ProjectTabBar({
  tabs,
  activeTab,
  onSelect,
}: {
  tabs: { id: ProjectTab; label: string; icon: React.ReactNode }[]
  activeTab: ProjectTab
  onSelect: (tab: ProjectTab) => void
}) {
  return (
    <div className="flex gap-1 bg-sand-blue/20 p-1 rounded-xl">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg text-xs font-medium transition-colors ${
            activeTab === t.id ? 'bg-white shadow-sm text-gray-800' : 'text-warm-gray hover:text-gray-700'
          }`}
        >
          <span>{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  )
}
