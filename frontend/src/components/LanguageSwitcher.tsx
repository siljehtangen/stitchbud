import { useTranslation } from 'react-i18next'
import { FiGlobe } from 'react-icons/fi'
import i18n from '../i18n'
import { useTheme, type Theme } from '../context/ThemeContext'

export const THEMES: { id: Theme; color: string }[] = [
  { id: 'beige', color: '#C8A87A' },
  { id: 'blue', color: '#6AA8C4' },
  { id: 'green', color: '#78A073' },
  { id: 'lavender', color: '#9A87CA' },
]

export function setLang(lang: string) {
  i18n.changeLanguage(lang)
  localStorage.setItem('lang', lang)
}

export function ThemeColorPicker() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  return (
    <div className="flex items-center gap-1.5">
      {THEMES.map(th => (
        <button
          key={th.id}
          onClick={() => setTheme(th.id)}
          className={`w-4 h-4 rounded-full transition-all hover:scale-110 ${
            theme === th.id ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'opacity-60 hover:opacity-100'
          }`}
          style={{ backgroundColor: th.color }}
          aria-label={t(`theme_${th.id}` as 'theme_beige')}
        />
      ))}
    </div>
  )
}

export function LanguageSwitcher() {
  const { i18n: i18nInstance } = useTranslation()
  const current = i18nInstance.language

  return (
    <div className="flex items-center bg-soft-brown/20 rounded-full p-0.5 gap-0.5">
      {(['no', 'en'] as const).map(lang => (
        <button
          key={lang}
          onClick={() => setLang(lang)}
          className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full transition-all ${
            current === lang ? 'bg-white text-ink shadow-sm' : 'text-warm-gray hover:text-ink/80'
          }`}
        >
          <FiGlobe className="text-xs" />
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
