import { useState, useEffect } from 'react'
import { useNavigate, type NavigateFunction } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { projectsApi, friendsApi } from '../api'
import { CATEGORY_ICONS, categoryLabel } from '../constants/categories'
import ProjectCard from '../components/ProjectCard'
import { useAsyncData } from '../hooks/useAsyncData'
import { useProjectFilter } from '../hooks/useProjectFilter'
import type { Friend, Project } from '../types'
import { projectCoverImageUrls } from '../projectOverviewMedia'

type Mode = 'mine' | 'friends'

export default function Projects() {
  const { data: projects, loading, error } = useAsyncData(() => projectsApi.getAll(), [])
  const { filter, setFilter, search, setSearch, filtered, newProjectPath } = useProjectFilter(projects)
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [mode, setMode] = useState<Mode>('mine')

  const [friends, setFriends] = useState<Friend[]>([])
  const [friendsLoading, setFriendsLoading] = useState(false)
  const [allFriendsProjects, setAllFriendsProjects] = useState<{ friend: Friend; projects: Project[] }[]>([])
  const [allProjectsLoading, setAllProjectsLoading] = useState(false)
  const [friendFilter, setFriendFilter] = useState<string | null>(null)

  useEffect(() => {
    if (mode !== 'friends') return
    setFriendsLoading(true)
    setAllFriendsProjects([])
    friendsApi.getFriends()
      .then(f => {
        setFriends(f)
        setFriendsLoading(false)
        if (f.length === 0) return
        setAllProjectsLoading(true)
        Promise.all(
          f.map(async friend => ({
            friend,
            projects: await friendsApi.getFriendProjects(friend.userId).catch(() => [] as Project[])
          }))
        ).then(results => {
          setAllFriendsProjects(results)
          setAllProjectsLoading(false)
        })
      })
      .catch(() => setFriendsLoading(false))
  }, [mode])

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMode('mine')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            mode === 'mine'
              ? 'bg-sand-green text-gray-800 shadow-sm'
              : 'bg-soft-brown/20 text-warm-gray hover:bg-soft-brown/40'
          }`}
        >
          {t('projects_mode_mine')}
        </button>
        <button
          onClick={() => setMode('friends')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            mode === 'friends'
              ? 'bg-sand-green text-gray-800 shadow-sm'
              : 'bg-soft-brown/20 text-warm-gray hover:bg-soft-brown/40'
          }`}
        >
          {t('projects_mode_friends')}
        </button>
      </div>

      {mode === 'mine' ? (
        <>
          <input
            type="search"
            className="input text-sm py-2 w-full"
            placeholder={t('projects_search_placeholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <div className="flex gap-2 flex-wrap">
            {(['ALL', 'KNITTING', 'CROCHET', 'SEWING'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filter === cat
                    ? 'bg-sand-green text-gray-800 shadow-sm'
                    : 'bg-soft-brown/20 text-warm-gray hover:bg-soft-brown/40'
                }`}
              >
                {cat === 'ALL' ? t('filter_all') : <><span className="leading-none flex-shrink-0">{CATEGORY_ICONS[cat]}</span><span>{categoryLabel(cat, t)}</span></>}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12 text-warm-gray">{t('loading')}</div>
          ) : error ? (
            <div className="text-center py-12 text-red-400 text-sm">{t('load_failed')}</div>
          ) : filtered.length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-warm-gray text-sm">{t('no_projects_found')}</p>
              <button onClick={() => navigate(newProjectPath)} className="btn-primary mt-4 text-sm">
                {t('add_project')}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(project => (
                <ProjectCard key={project.id} project={project} onClick={() => navigate(`/projects/${project.id}`)} />
              ))}
            </div>
          )}
        </>
      ) : (
        <FriendsProjectsView
          friends={friends}
          loading={friendsLoading}
          allProjectsLoading={allProjectsLoading}
          allFriendsProjects={allFriendsProjects}
          friendFilter={friendFilter}
          onFriendFilterChange={setFriendFilter}
          t={t}
          navigate={navigate}
        />
      )}
    </div>
  )
}

function FriendsProjectsView({
  friends,
  loading,
  allProjectsLoading,
  allFriendsProjects,
  friendFilter,
  onFriendFilterChange,
  t,
  navigate,
}: {
  friends: Friend[]
  loading: boolean
  allProjectsLoading: boolean
  allFriendsProjects: { friend: Friend; projects: Project[] }[]
  friendFilter: string | null
  onFriendFilterChange: (userId: string | null) => void
  t: TFunction
  navigate: NavigateFunction
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  if (loading) {
    return <div className="text-center py-12 text-warm-gray">{t('loading')}</div>
  }

  if (friends.length === 0) {
    return (
      <div className="card text-center py-10">
        <p className="text-warm-gray text-sm">{t('projects_friends_empty')}</p>
        <button onClick={() => navigate('/friends')} className="btn-primary mt-4 text-sm">
          {t('projects_go_to_friends')}
        </button>
      </div>
    )
  }

  const visibleItems: { friend: Friend; project: Project }[] = allFriendsProjects
    .filter(fp => friendFilter === null || fp.friend.userId === friendFilter)
    .flatMap(fp => fp.projects.map(p => ({ friend: fp.friend, project: p })))

  const selectedFriend = friendFilter ? friends.find(f => f.userId === friendFilter) : null
  const selectedLabel = selectedFriend
    ? (selectedFriend.displayName ?? selectedFriend.email)
    : t('friends_filter_all')

  const filteredFriendsForDropdown = searchQuery.trim()
    ? friends.filter(f => (f.displayName ?? f.email).toLowerCase().includes(searchQuery.toLowerCase()))
    : friends

  return (
    <div className="space-y-4">
      {/* Friend filter dropdown */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(o => !o)}
          className="input flex items-center justify-between w-full text-sm text-left"
        >
          <span className={selectedFriend ? 'text-gray-800' : 'text-warm-gray'}>{selectedLabel}</span>
          <span className="text-warm-gray ml-2 flex-shrink-0">▾</span>
        </button>

        {dropdownOpen && (
          <>
            <div className="fixed inset-0 z-[9]" onClick={() => setDropdownOpen(false)} />
            <div className="absolute z-10 mt-1 w-full bg-white border border-soft-brown/20 rounded-xl shadow-lg overflow-hidden">
              <div className="p-2">
                <input
                  type="search"
                  className="input text-sm py-1.5 w-full"
                  placeholder={t('friends_filter_placeholder')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
              <ul className="max-h-48 overflow-y-auto pb-1">
                <li>
                  <button
                    onClick={() => { onFriendFilterChange(null); setDropdownOpen(false); setSearchQuery('') }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-soft-brown/10 transition-colors ${friendFilter === null ? 'font-semibold text-gray-800' : 'text-warm-gray'}`}
                  >
                    {t('friends_filter_all')}
                  </button>
                </li>
                {filteredFriendsForDropdown.map(f => (
                  <li key={f.friendshipId}>
                    <button
                      onClick={() => { onFriendFilterChange(f.userId); setDropdownOpen(false); setSearchQuery('') }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-soft-brown/10 transition-colors ${friendFilter === f.userId ? 'font-semibold text-gray-800' : 'text-warm-gray'}`}
                    >
                      {f.displayName ?? f.email}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>

      {/* Projects */}
      {allProjectsLoading ? (
        <div className="text-center py-12 text-warm-gray">{t('loading')}</div>
      ) : visibleItems.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-warm-gray text-sm">{t('friends_no_public_projects')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleItems.map(({ friend, project }) => (
            <FriendProjectCard
              key={`${friend.userId}-${project.id}`}
              project={project}
              friendName={friendFilter === null ? (friend.displayName ?? friend.email) : undefined}
              t={t}
              onClick={() => navigate(
                `/friends/${friend.userId}/projects/${project.id}`,
                { state: { friendName: friend.displayName ?? friend.email } }
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function FriendProjectCard({ project, t, onClick, friendName }: { project: Project; t: TFunction; onClick?: () => void; friendName?: string }) {
  const coverUrls = projectCoverImageUrls(project)
  return (
    <div className="card flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      {coverUrls[0] ? (
        <img src={coverUrls[0]} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" loading="lazy" />
      ) : (
        <div className="w-12 h-12 rounded-xl bg-sand-blue/30 flex items-center justify-center text-2xl flex-shrink-0">
          {project.category === 'KNITTING' ? '🧶' : project.category === 'CROCHET' ? '🪡' : '🧵'}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{project.name}</p>
        <p className="text-xs text-warm-gray">
          {categoryLabel(project.category, t)}{friendName ? ` · ${friendName}` : ''}
        </p>
        {project.description && (
          <p className="text-xs text-gray-600 truncate mt-0.5">{project.description}</p>
        )}
      </div>
    </div>
  )
}
