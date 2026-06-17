import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import no from './locales/no.json'

let savedLang = 'no'
try {
  savedLang = localStorage.getItem('lang') ?? 'no'
} catch {
  // storage unavailable — keep the default
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    no: { translation: no },
  },
  lng: savedLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

if (typeof document !== 'undefined') {
  document.documentElement.lang = savedLang
  i18n.on('languageChanged', lng => {
    document.documentElement.lang = lng
  })
}

export default i18n
