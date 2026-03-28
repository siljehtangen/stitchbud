import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n'
import { FaHome } from 'react-icons/fa'
import { ImBooks } from 'react-icons/im'
import { LiaUserFriendsSolid } from 'react-icons/lia'
import { GrProjects } from 'react-icons/gr'
import { useTheme, type Theme } from '../context/ThemeContext'

const THEMES: { id: Theme; color: string }[] = [
  { id: 'beige',    color: '#C8A87A' },
  { id: 'blue',     color: '#6AA8C4' },
  { id: 'green',    color: '#78A073' },
  { id: 'lavender', color: '#9A87CA' },
]

function LanguageSwitcher() {
  const { i18n: i18nInstance } = useTranslation()
  const current = i18nInstance.language

  function setLang(lang: string) {
    i18n.changeLanguage(lang)
    localStorage.setItem('lang', lang)
  }

  return (
    <div className="flex items-center bg-soft-brown/20 rounded-full p-0.5 gap-0.5">
      {(['no', 'en'] as const).map(lang => (
        <button
          key={lang}
          onClick={() => setLang(lang)}
          className={`text-xs font-semibold px-3 py-1 rounded-full transition-all ${
            current === lang
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-warm-gray hover:text-gray-700'
          }`}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

export default function Layout() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()

  const navItems = [
    { to: '/', label: t('nav_home'), icon: <FaHome />, exact: true },
    { to: '/projects', label: t('nav_projects'), icon: <GrProjects />, exact: false },
    { to: '/library', label: t('nav_library'), icon: <ImBooks />, exact: false },
  ]

  return (
    <div className="min-h-screen flex flex-col max-w-2xl mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-cream/90 backdrop-blur-sm border-b border-sand-blue/40 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800 tracking-tight flex items-center gap-1.5">
          <LiaUserFriendsSolid className="text-sand-green-dark text-2xl" /> {t('app_name')}
        </h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {THEMES.map(th => (
              <button
                key={th.id}
                onClick={() => setTheme(th.id)}
                className={`w-4 h-4 rounded-full transition-all hover:scale-110 ${
                  theme === th.id ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'opacity-60 hover:opacity-100'
                }`}
                style={{ backgroundColor: th.color }}
                aria-label={th.id}
              />
            ))}
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pb-24 px-4 pt-4">
        <Outlet />
      </main>

      {/* FAB */}
      <button
        onClick={() => navigate('/projects/new')}
        className="fixed bottom-20 right-6 w-14 h-14 bg-sand-green hover:bg-sand-green-dark shadow-lg rounded-full flex items-center justify-center text-2xl transition-all duration-200 hover:scale-105 z-10"
        aria-label={t('add_project_aria')}
      >
        +
      </button>

      {/* Bottom nav */}
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
