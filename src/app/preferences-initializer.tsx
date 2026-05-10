'use client'

import { useEffect } from 'react'

export default function PreferencesInitializer() {
  useEffect(() => {
    const fontsize = localStorage.getItem('fontsize') || 'medium'
    const colormode = localStorage.getItem('colormode') || 'light'
    document.body.dataset.fontsize = fontsize
    document.body.dataset.colormode = colormode
  }, [])

  return null
}
