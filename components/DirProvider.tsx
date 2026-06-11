'use client'

import { useEffect } from 'react'

export default function DirProvider({ lang }: { lang: string }) {
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }, [lang])
  return null
}