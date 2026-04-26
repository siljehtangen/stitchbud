import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FaHome, FaUser } from 'react-icons/fa'
import { ImBooks } from 'react-icons/im'
import { LiaUserFriendsSolid } from 'react-icons/lia'
import { GrProjects } from 'react-icons/gr'
import { LanguageSwitcher, ThemeColorPicker } from './LanguageSwitcher'

export default function Layout() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const navItems = [
    { to: '/home', label: t('nav_home'), icon: <FaHome />, exact: true },
    { to: '/projects', label: t('nav_projects'), icon: <GrProjects />, exact: false },
    { to: '/library', label: t('nav_library'), icon: <ImBooks />, exact: false },
    { to: '/friends', label: t('nav_friends'), icon: <LiaUserFriendsSolid />, exact: false },
    { to: '/profile', label: t('nav_profile'), icon: <FaUser />, exact: false },
  ]

  return (
    <div className="min-h-screen flex flex-col max-w-2xl mx-auto">
      <header className="sticky top-0 z-10 bg-cream/90 backdrop-blur-sm border-b border-sand-blue/40 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800 tracking-tight">
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
          >
            <LiaUserFriendsSolid className="text-sand-green-dark text-2xl" /> {t('app_name')}
          </button>
        </h1>
        <div className="flex items-center gap-3">
          <ThemeColorPicker />
          <LanguageSwitcher />
        </div>
      </header>

      <main className="flex-1 pb-24 px-4 pt-4">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-white/95 backdrop-blur-sm border-t border-sand-blue/30 flex justify-around py-2 z-10">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-6 py-1.5 rounded-xl transition-colors ${
                isActive ? 'text-gray-800 bg-sand-blue/35' : 'text-warm-gray hover:text-gray-700'
              }`
            }
          >
            <span className="text-xl flex items-center justify-center">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
