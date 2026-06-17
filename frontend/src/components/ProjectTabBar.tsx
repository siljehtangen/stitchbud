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
    <div role="tablist" className="flex gap-1 bg-soft-brown/15 p-1 rounded-[14px]">
      {tabs.map(t => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={activeTab === t.id}
          aria-label={t.label}
          onClick={() => onSelect(t.id)}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 rounded-[10px] text-xs font-medium transition-colors ${
            activeTab === t.id ? 'bg-sand-green text-ink shadow-warm' : 'text-warm-gray hover:text-ink'
          }`}
        >
          <span aria-hidden="true">{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  )
}
