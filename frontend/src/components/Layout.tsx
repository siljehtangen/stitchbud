import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FaHome, FaUser } from 'react-icons/fa'
import { ImBooks } from 'react-icons/im'
import { LiaUserFriendsSolid } from 'react-icons/lia'
import { GrProjects } from 'react-icons/gr'
import { FiPlus } from 'react-icons/fi'
import { LanguageSwitcher, ThemeColorPicker } from './LanguageSwitcher'
import { UserAvatar } from './UserAvatar'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const { user } = useAuth()

  const displayName = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? null
  const avatarUrl = user?.user_metadata?.avatar_url ?? null

  const navItems = [
    { to: '/home', label: t('nav_home'), icon: <FaHome />, exact: true },
    { to: '/projects', label: t('nav_projects'), icon: <GrProjects />, exact: false },
    { to: '/library', label: t('nav_library'), icon: <ImBooks />, exact: false },
    { to: '/friends', label: t('nav_friends'), icon: <LiaUserFriendsSolid />, exact: false },
    { to: '/profile', label: t('nav_profile'), icon: <FaUser />, exact: false },
  ]

  // Desktop horizontal nav: everything except Profile (Profile lives on the avatar)
  const topNavItems = navItems.slice(0, 4)

  const showFab = location.pathname === '/home' || location.pathname === '/projects'

  return (
    <div className="min-h-screen flex flex-col">
      {/* Desktop / tablet top bar */}
      <header className="hidden md:block sticky top-0 z-20 bg-cream/80 backdrop-blur-md border-b border-[rgb(var(--border-light))]">
        <div className="max-w-6xl mx-auto h-[68px] px-6 lg:px-10 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity justify-self-start"
          >
            <LiaUserFriendsSolid className="text-sand-green-dark text-2xl" />
            <span className="font-serif text-2xl leading-none text-ink tracking-tight">{t('app_name')}</span>
          </button>

          <nav className="flex items-center gap-1 justify-self-center">
            {topNavItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    isActive ? 'bg-sand-green text-ink' : 'text-warm-gray hover:text-ink hover:bg-soft-brown/20'
                  }`
                }
              >
                <span className="text-base flex items-center">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3 justify-self-end">
            <ThemeColorPicker />
            <LanguageSwitcher />
            <NavLink
              to="/profile"
              aria-label={t('nav_profile')}
              className="rounded-full transition-transform hover:scale-105"
            >
              <UserAvatar name={displayName} email={user?.email ?? ''} avatarUrl={avatarUrl} />
            </NavLink>
          </div>
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-20 bg-cream/90 backdrop-blur-sm border-b border-[rgb(var(--border-light))] px-4 py-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/home')}
          className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
        >
          <LiaUserFriendsSolid className="text-sand-green-dark text-2xl" />
          <span className="font-serif text-2xl leading-none text-ink tracking-tight">{t('app_name')}</span>
        </button>
        <div className="flex items-center gap-3">
          <ThemeColorPicker />
          <LanguageSwitcher />
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-6 lg:px-10 pt-5 md:pt-10 pb-28 md:pb-12">
        <Outlet />
      </main>

      {/* Mobile floating bottom nav */}
      <nav className="md:hidden fixed bottom-4 inset-x-4 z-20 bg-white/90 backdrop-blur-md border border-[rgb(var(--border-light))] rounded-[22px] shadow-warm flex justify-around py-1.5">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] px-2 py-1 rounded-2xl transition-colors ${
                isActive ? 'text-ink bg-sand-green/40' : 'text-warm-gray hover:text-ink'
              }`
            }
          >
            <span className="text-xl flex items-center justify-center">{item.icon}</span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Mobile FAB */}
      {showFab && (
        <button
          type="button"
          onClick={() => navigate('/projects/new')}
          aria-label={t('new_project')}
          className="md:hidden fixed bottom-24 right-5 z-20 w-[54px] h-[54px] rounded-full bg-sand-green-dark text-ink flex items-center justify-center shadow-warm-lg active:scale-95 transition-transform"
        >
          <FiPlus className="text-2xl" />
        </button>
      )}
    </div>
  )
}
