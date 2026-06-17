import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { GiChopsticks, GiPirateHook, GiSewingMachine, GiButterfly } from 'react-icons/gi'
import { PiYarnFill } from 'react-icons/pi'
import { LiaUserFriendsSolid } from 'react-icons/lia'
import { FiLogIn } from 'react-icons/fi'
import { LanguageSwitcher, ThemeColorPicker } from '../components/LanguageSwitcher'

export default function Landing() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const orbitIcons = [
    {
      icon: <GiChopsticks className="text-sand-green-dark text-xl" />,
      label: t('category_knitting'),
      desc: t('landing_feat_knitting'),
      border: 'border-sand-green-dark/30',
      position: 'absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-1/2',
      tooltipSide: 'top',
    },
    {
      icon: <GiPirateHook className="text-sand-green-dark text-xl" />,
      label: t('category_crochet'),
      desc: t('landing_feat_crochet'),
      border: 'border-sand-green-dark/30',
      position: 'absolute top-1/2 -right-1 translate-x-1/2 -translate-y-1/2',
      tooltipSide: 'right',
    },
    {
      icon: <GiSewingMachine className="text-sand-green-dark text-xl" />,
      label: t('category_sewing'),
      desc: t('landing_feat_sewing'),
      border: 'border-sand-green-dark/30',
      position: 'absolute -bottom-1 left-1/2 -translate-x-1/2 translate-y-1/2',
      tooltipSide: 'bottom',
    },
    {
      icon: <PiYarnFill className="text-sand-green-dark text-xl" />,
      label: t('landing_feat_yarn_label'),
      desc: t('landing_feat_yarn'),
      border: 'border-sand-green-dark/30',
      position: 'absolute top-1/2 -left-1 -translate-x-1/2 -translate-y-1/2',
      tooltipSide: 'left',
    },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-cream via-cream to-sand-green/15 overflow-hidden">
      <header className="px-5 md:px-10 pt-5 pb-3 flex items-center justify-between flex-shrink-0 w-full max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <LiaUserFriendsSolid className="text-sand-green-dark text-2xl" />
          <span className="font-serif text-2xl leading-none text-ink tracking-tight">{t('app_name')}</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeColorPicker />
          <LanguageSwitcher />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-16 w-full max-w-2xl mx-auto">
        <div className="relative flex items-center justify-center mt-10 mb-12">
          <div className="animate-blob-1 absolute w-72 h-72 rounded-full bg-gradient-to-br from-sand-green/25 to-sand-green-dark/15 blur-3xl" />
          <div className="animate-blob-2 absolute w-48 h-48 rounded-full bg-gradient-to-tl from-sand-green-dark/20 to-sand-green/15 blur-2xl translate-x-12 -translate-y-4" />
          <div className="animate-blob-3 absolute w-28 h-28 rounded-full bg-gradient-to-br from-sand-green/20 to-sand-green-dark/15 blur-2xl -translate-x-16 translate-y-8" />

          <div className="relative w-56 h-56 md:w-64 md:h-64 rounded-full bg-gradient-to-br from-sand-green/20 to-sand-green-dark/12 flex items-center justify-center">
            <div className="w-44 h-44 md:w-48 md:h-48 rounded-full bg-gradient-to-br from-sand-green/25 to-sand-green-dark/15 border border-sand-green-dark/15 flex items-center justify-center">
              <div className="w-28 h-28 rounded-full bg-white/70 border border-sand-green-dark/20 flex items-center justify-center shadow-warm">
                <GiButterfly className="animate-butterfly text-sand-green-dark text-5xl" />
              </div>
            </div>

            {orbitIcons.map(({ icon, label, desc, border, position, tooltipSide }) => (
              <div key={label} className={`${position} group`}>
                <div
                  className={`w-12 h-12 rounded-full bg-white ${border} border shadow-warm flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 hover:shadow-warm-lg`}
                >
                  {icon}
                </div>
                <div
                  className={`
                  pointer-events-none absolute z-10 w-32
                  bg-white/95 border border-[rgb(var(--border-light))] rounded-xl shadow-warm px-3 py-2
                  opacity-0 group-hover:opacity-100 transition-opacity duration-200
                  ${tooltipSide === 'top' ? 'bottom-full mb-2 left-1/2 -translate-x-1/2' : ''}
                  ${tooltipSide === 'right' ? 'left-full ml-2 top-1/2 -translate-y-1/2' : ''}
                  ${tooltipSide === 'bottom' ? 'top-full mt-2 left-1/2 -translate-x-1/2' : ''}
                  ${tooltipSide === 'left' ? 'right-full mr-2 top-1/2 -translate-y-1/2' : ''}
                `}
                >
                  <p className="text-xs font-semibold text-ink mb-0.5">{label}</p>
                  <p className="text-[10px] text-warm-gray leading-snug">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="font-serif text-[36px] md:text-[56px] text-ink leading-[1.05] tracking-tight mb-3">
            {t('landing_headline')}
          </h1>
          <p className="text-sm md:text-base text-warm-gray leading-relaxed max-w-sm mx-auto">
            {t('landing_subtitle')}
          </p>
        </div>

        <button
          onClick={() => navigate('/auth')}
          className="btn-primary px-10 py-3 text-base font-semibold inline-flex items-center justify-center gap-2"
        >
          <FiLogIn className="text-lg" />
          {t('landing_login')}
        </button>
      </main>

      <footer className="pb-6 text-center flex-shrink-0">
        <p className="text-xs text-warm-gray/60">{t('landing_footer')}</p>
      </footer>
    </div>
  )
}
