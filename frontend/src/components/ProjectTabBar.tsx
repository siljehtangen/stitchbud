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
    <div role="tablist" className="flex gap-1 bg-[rgb(var(--border-light))]/70 p-1.5 rounded-2xl">
      {tabs.map(t => {
        const active = activeTab === t.id
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={t.label}
            onClick={() => onSelect(t.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] py-2 px-1 rounded-xl text-[13px] font-medium transition-all duration-200 ease-out ${
              active ? 'bg-white text-ink shadow-warm' : 'text-warm-gray hover:text-ink'
            }`}
          >
            <span
              aria-hidden="true"
              className={`text-base leading-none transition-colors duration-200 ease-out ${
                active ? 'text-sand-green-dark' : 'text-warm-gray'
              }`}
            >
              {t.icon}
            </span>
            <span>{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}
