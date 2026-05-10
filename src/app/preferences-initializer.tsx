'use client'

import { useEffect } from 'react'

export function ThemeInitializer() {
  useEffect(() => {
    if (window.location.pathname.startsWith('/reserve')) {
      // 予約ページは端末設定に従うため何もしない
      return
    }
    const fontsize = localStorage.getItem('fontsize') || 'medium'
    const colormode = localStorage.getItem('colormode') || 'light'
    document.body.dataset.fontsize = fontsize
    document.body.dataset.colormode = colormode
  }, [])

  return null
}
