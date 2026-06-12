'use client'

import { createContext, useContext, useMemo } from 'react'
import { getT, Lang } from '@/lib/translations'

const LanguageContext = createContext<Lang>('en')

export function LanguageProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LanguageContext.Provider value={lang}>{children}</LanguageContext.Provider>
}

export function useT() {
  const lang = useContext(LanguageContext)
  // Memoised by lang — stable reference across re-renders
  // lang only changes on profile save + hard reload, so t is stable for the entire session
  return useMemo(() => getT(lang), [lang])
}
