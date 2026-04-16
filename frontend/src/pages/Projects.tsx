import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { projectsApi, friendsApi } from '../api'
import { CATEGORY_ICONS, categoryLabel } from '../constants/categories'
import ProjectCard from '../components/ProjectCard'
import { FriendsProjectsView } from '../components/FriendsProjectsView'
import { useAsyncData } from '../hooks/useAsyncData'
import { useProjectFilter } from '../hooks/useProjectFilter'
import type { Friend, Project } from '../types'

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
        />
      )}
    </div>
  )
}
