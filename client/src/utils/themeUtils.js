export const THEME_STORAGE_KEY = 'sweety-theme'
export const THEME_PREFERENCES = ['light', 'dark']

export function isThemePreference(value) {
  return THEME_PREFERENCES.includes(value)
}

export function resolveTheme(preference) {
  if (!isThemePreference(preference)) {
    throw new TypeError(`Unsupported theme preference: ${preference}`)
  }
  return preference
}
