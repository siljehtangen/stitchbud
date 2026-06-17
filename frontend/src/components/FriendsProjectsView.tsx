import { useState, useEffect, useRef } from 'react'
import { FiChevronRight, FiChevronDown, FiUser } from 'react-icons/fi'
import { LiaUserFriendsSolid } from 'react-icons/lia'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Friend, Project } from '../types'
import { categoryLabel, CATEGORY_ICONS } from '../constants/categories'
import { projectCoverImageUrls } from '../projectOverviewMedia'

export function FriendsProjectsView({
  friends,
  loading,
  allProjectsLoading,
  allFriendsProjects,
  friendFilter,
  onFriendFilterChange,
}: {
  friends: Friend[]
  loading: boolean
  allProjectsLoading: boolean
  allFriendsProjects: { friend: Friend; projects: Project[] }[]
  friendFilter: string | null
  onFriendFilterChange: (userId: string | null) => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (dropdownOpen) searchRef.current?.focus()
  }, [dropdownOpen])

  if (loading) {
    return <div className="text-center py-12 text-warm-gray">{t('loading')}</div>
  }

  if (friends.length === 0) {
    return (
      <div className="card text-center py-10">
        <p className="text-warm-gray text-sm">{t('projects_friends_empty')}</p>
        <button
          onClick={() => navigate('/friends')}
          className="btn-primary mt-4 text-sm inline-flex items-center gap-1.5"
        >
          <LiaUserFriendsSolid className="text-base" />
          {t('projects_go_to_friends')}
        </button>
      </div>
    )
  }

  const visibleItems: { friend: Friend; project: Project }[] = allFriendsProjects
    .filter(fp => friendFilter === null || fp.friend.userId === friendFilter)
    .flatMap(fp => fp.projects.map(p => ({ friend: fp.friend, project: p })))

  const selectedFriend = friendFilter ? friends.find(f => f.userId === friendFilter) : null
  const selectedLabel = selectedFriend ? (selectedFriend.displayName ?? selectedFriend.email) : t('friends_filter_all')

  const filteredFriendsForDropdown = searchQuery.trim()
    ? friends.filter(f => (f.displayName ?? f.email).toLowerCase().includes(searchQuery.toLowerCase()))
    : friends

  return (
    <div className="space-y-4">
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(o => !o)}
          className="input flex items-center justify-between w-full max-w-md text-sm text-left"
        >
          <span className={selectedFriend ? 'text-ink' : 'text-warm-gray'}>{selectedLabel}</span>
          <FiChevronDown className="w-4 h-4 text-warm-gray ml-2 flex-shrink-0" />
        </button>

        {dropdownOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-[9]"
              aria-label={t('close')}
              onClick={() => setDropdownOpen(false)}
            />
            <div className="absolute z-10 mt-1 w-full bg-white border border-soft-brown/20 rounded-xl shadow-lg overflow-hidden">
              <div className="p-2">
                <input
                  ref={searchRef}
                  type="search"
                  className="input text-sm py-1.5 w-full"
                  placeholder={t('friends_filter_placeholder')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <ul className="max-h-48 overflow-y-auto pb-1">
                <li>
                  <button
                    onClick={() => {
                      onFriendFilterChange(null)
                      setDropdownOpen(false)
                      setSearchQuery('')
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-soft-brown/10 transition-colors inline-flex items-center gap-2 ${friendFilter === null ? 'font-semibold text-ink' : 'text-warm-gray'}`}
                  >
                    <LiaUserFriendsSolid className="text-base flex-shrink-0" />
                    {t('friends_filter_all')}
                  </button>
                </li>
                {filteredFriendsForDropdown.map(f => (
                  <li key={f.friendshipId}>
                    <button
                      onClick={() => {
                        onFriendFilterChange(f.userId)
                        setDropdownOpen(false)
                        setSearchQuery('')
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-soft-brown/10 transition-colors inline-flex items-center gap-2 ${friendFilter === f.userId ? 'font-semibold text-ink' : 'text-warm-gray'}`}
                    >
                      <FiUser className="text-sm flex-shrink-0" />
                      {f.displayName ?? f.email}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>

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
              onClick={() =>
                navigate(`/friends/${friend.userId}/projects/${project.id}`, {
                  state: { friendName: friend.displayName ?? friend.email },
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}

function FriendProjectCard({
  project,
  onClick,
  friendName,
}: {
  project: Project
  onClick?: () => void
  friendName?: string
}) {
  const { t } = useTranslation()
  const coverUrls = projectCoverImageUrls(project)
  return (
    <div
      role="button"
      tabIndex={0}
      className="card flex items-center gap-3 cursor-pointer hover:shadow-md transition-all group"
      onClick={onClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
    >
      {coverUrls[0] ? (
        <img src={coverUrls[0]} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" loading="lazy" />
      ) : (
        <div className="w-12 h-12 rounded-xl bg-sand-blue/30 flex items-center justify-center text-xl flex-shrink-0">
          {CATEGORY_ICONS[project.category]}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink truncate">{project.name}</p>
        <p className="text-xs text-warm-gray">
          {categoryLabel(project.category, t)}
          {friendName ? ` · ${friendName}` : ''}
        </p>
        {project.description && <p className="text-xs text-gray-600 truncate mt-0.5">{project.description}</p>}
      </div>
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-soft-brown/10 group-hover:bg-soft-brown/20 flex items-center justify-center transition-colors ml-1">
        <FiChevronRight className="w-3.5 h-3.5 text-warm-gray group-hover:text-ink/80 transition-colors" />
      </div>
    </div>
  )
}
