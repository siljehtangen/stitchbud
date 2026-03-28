import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n'
import { useTheme, type Theme } from '../context/ThemeContext'
import { GiChopsticks, GiPirateHook, GiSewingMachine, GiButterfly } from 'react-icons/gi'
import { PiYarnFill } from 'react-icons/pi'
import { LiaUserFriendsSolid } from 'react-icons/lia'

const THEMES: { id: Theme; color: string }[] = [
  { id: 'beige',    color: '#C8A87A' },
  { id: 'blue',     color: '#6AA8C4' },
  { id: 'green',    color: '#78A073' },
  { id: 'lavender', color: '#9A87CA' },
]

export default function Landing() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const currentLang = i18n.language

  function setLang(lang: string) {
    i18n.changeLanguage(lang)
    localStorage.setItem('lang', lang)
  }

  const orbitIcons = [
    {
      icon: <GiChopsticks className="text-sand-green-dark text-lg" />,
      label: t('category_knitting'),
      desc: t('landing_feat_knitting'),
      border: 'border-sand-green/30',
      position: 'absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-1/2',
      tooltipSide: 'top',
    },
    {
      icon: <GiPirateHook className="text-sand-blue-deep text-lg" />,
      label: t('category_crochet'),
      desc: t('landing_feat_crochet'),
      border: 'border-sand-blue/30',
      position: 'absolute top-1/2 -right-1 translate-x-1/2 -translate-y-1/2',
      tooltipSide: 'right',
    },
    {
      icon: <GiSewingMachine className="text-warm-gray text-lg" />,
      label: t('category_sewing'),
      desc: t('landing_feat_sewing'),
      border: 'border-soft-brown/40',
      position: 'absolute -bottom-1 left-1/2 -translate-x-1/2 translate-y-1/2',
      tooltipSide: 'bottom',
    },
    {
      icon: <PiYarnFill className="text-sand-green-dark text-lg" />,
      label: t('landing_feat_yarn_label'),
      desc: t('landing_feat_yarn'),
      border: 'border-sand-green/25',
      position: 'absolute top-1/2 -left-1 -translate-x-1/2 -translate-y-1/2',
      tooltipSide: 'left',
    },
  ]

  return (
    <div className="min-h-screen bg-cream flex flex-col max-w-2xl mx-auto overflow-hidden">

      {/* ── Header ── */}
      <header className="px-5 pt-5 pb-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <LiaUserFriendsSolid className="text-sand-green-dark text-2xl" />
          <span className="text-lg font-semibold text-gray-800 tracking-tight">{t('app_name')}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {THEMES.map(th => (
              <button
                key={th.id}
                onClick={() => setTheme(th.id)}
                className={`w-4 h-4 rounded-full transition-all hover:scale-110 ${
                  theme === th.id ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'opacity-55 hover:opacity-90'
                }`}
                style={{ backgroundColor: th.color }}
                aria-label={th.id}
              />
            ))}
          </div>
          <div className="flex items-center bg-soft-brown/20 rounded-full p-0.5 gap-0.5">
            {(['no', 'en'] as const).map(lang => (
              <button
                key={lang}
                onClick={() => setLang(lang)}
                className={`text-xs font-semibold px-3 py-1 rounded-full transition-all ${
                  currentLang === lang
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-warm-gray hover:text-gray-700'
                }`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-16">

        {/* Decorative blob area */}
        <div className="relative flex items-center justify-center mt-10 mb-12">
          {/* Background soft blobs */}
          <div className="animate-blob-1 absolute w-64 h-64 rounded-full bg-gradient-to-br from-sand-green/25 to-sand-blue/20 blur-3xl" />
          <div className="animate-blob-2 absolute w-44 h-44 rounded-full bg-gradient-to-tl from-soft-brown/30 to-sand-green/15 blur-2xl translate-x-12 -translate-y-4" />
          <div className="animate-blob-3 absolute w-28 h-28 rounded-full bg-gradient-to-br from-sand-blue/20 to-soft-brown/20 blur-2xl -translate-x-16 translate-y-8" />

          {/* Outer ring */}
          <div className="relative w-52 h-52 rounded-full border border-sand-blue/30 flex items-center justify-center">
            {/* Middle ring */}
            <div className="w-40 h-40 rounded-full bg-gradient-to-br from-sand-green/30 to-sand-blue/25 border border-sand-green/20 flex items-center justify-center shadow-sm">
              {/* Inner circle */}
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-sand-green/50 to-sand-blue/40 flex items-center justify-center shadow-inner">
                <GiButterfly className="animate-butterfly text-sand-green-dark text-4xl" />
              </div>
            </div>

            {/* Orbiting icons with tooltips */}
            {orbitIcons.map(({ icon, label, desc, border, position, tooltipSide }) => (
              <div key={label} className={`${position} group`}>
                <div className={`w-9 h-9 rounded-full bg-cream ${border} border shadow-sm flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-125 hover:shadow-md hover:border-sand-green-dark/50`}>
                  {icon}
                </div>
                {/* Tooltip */}
                <div className={`
                  pointer-events-none absolute z-10 w-32
                  bg-white/95 border border-sand-blue/20 rounded-xl shadow-md px-3 py-2
                  opacity-0 group-hover:opacity-100 transition-opacity duration-200
                  ${tooltipSide === 'top'    ? 'bottom-full mb-2 left-1/2 -translate-x-1/2' : ''}
                  ${tooltipSide === 'right'  ? 'left-full ml-2 top-1/2 -translate-y-1/2' : ''}
                  ${tooltipSide === 'bottom' ? 'top-full mt-2 left-1/2 -translate-x-1/2' : ''}
                  ${tooltipSide === 'left'   ? 'right-full mr-2 top-1/2 -translate-y-1/2' : ''}
                `}>
                  <p className="text-xs font-semibold text-gray-800 mb-0.5">{label}</p>
                  <p className="text-[10px] text-warm-gray leading-snug">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Headline & subtitle */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 leading-tight tracking-tight mb-3">
            {t('landing_headline')}
          </h1>
          <p className="text-sm text-warm-gray leading-relaxed max-w-xs mx-auto">
            {t('landing_subtitle')}
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate('/home')}
          className="btn-primary px-10 py-3 text-base font-semibold shadow-md hover:shadow-lg transition-shadow"
        >
          {t('landing_login')}
        </button>

      </main>

      {/* ── Footer ── */}
      <footer className="pb-6 text-center flex-shrink-0">
        <p className="text-xs text-warm-gray/50">{t('landing_footer')}</p>
      </footer>

    </div>
  )
}
