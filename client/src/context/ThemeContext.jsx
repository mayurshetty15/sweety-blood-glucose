import { useEffect, useLayoutEffect, useState } from 'react'
import ThemeContext from './themeContext.js'
import {
  isThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
} from '../utils/themeUtils.js'

function getStoredPreference() {
  try {
    const storedPreference = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isThemePreference(storedPreference) ? storedPreference : 'light'
  } catch (error) {
    console.error('Unable to read the saved theme preference.', error)
    return 'light'
  }
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(getStoredPreference)
  const theme = resolveTheme(preference)

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.dataset.themePreference = preference
  }, [preference, theme])

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, preference)
    } catch (error) {
      console.error('Unable to save the theme preference.', error)
    }
  }, [preference])

  function setThemePreference(nextPreference) {
    if (!isThemePreference(nextPreference)) {
      throw new TypeError(`Unsupported theme preference: ${nextPreference}`)
    }
    setPreference(nextPreference)
  }

  return (
    <ThemeContext.Provider value={{ preference, theme, setThemePreference }}>
      {children}
    </ThemeContext.Provider>
  )
}
