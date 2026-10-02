/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import fr from './fr'
import mg from './mg'
import type { Language, TranslationDictionary, TranslationKey, Translator } from './types'

const storageKey = 'pitikorana.language'
const dictionaries: Record<Language, TranslationDictionary> = { fr, mg }

interface LanguageContextValue {
  language: Language
  setLanguage: (language: Language) => void
  t: Translator
}

export const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

function isLanguage(value: string | null): value is Language { return value === 'fr' || value === 'mg' }

function getInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'fr'
  try {
    const storedLanguage = window.localStorage.getItem(storageKey)
    return isLanguage(storedLanguage) ? storedLanguage : 'fr'
  } catch { return 'fr' }
}

function resolve(dictionary: TranslationDictionary, key: TranslationKey): string | undefined {
  let value: unknown = dictionary
  for (const part of key.split('.')) {
    if (value === null || typeof value !== 'object') return undefined
    value = (value as Record<string, unknown>)[part]
  }
  return typeof value === 'string' ? value : undefined
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(getInitialLanguage)

  useEffect(() => {
    document.documentElement.lang = language
    try { window.localStorage.setItem(storageKey, language) } catch { /* Preference persistence is optional. */ }
  }, [language])

  const t = useCallback<Translator>((key) => resolve(dictionaries[language], key) ?? resolve(dictionaries.fr, key) ?? key, [language])
  const value = useMemo(() => ({ language, setLanguage, t }), [language, t])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}