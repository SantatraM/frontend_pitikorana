import { useContext } from 'react'
import { LanguageContext } from '../i18n/LanguageContext'

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage doit être utilisé dans LanguageProvider.')
  return context
}