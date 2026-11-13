import { Moon, Sun } from 'lucide-react'
import useTheme from '../context/useTheme.js'

const THEME_OPTIONS = [
  { value: 'light', label: 'Light mode', Icon: Sun },
  { value: 'dark', label: 'Dark mode', Icon: Moon },
]

function ThemeSwitcher() {
  const { preference, setThemePreference } = useTheme()

  return (
    <div className="theme-switcher" role="group" aria-label="Color theme">
      {THEME_OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          className="theme-switcher__option"
          type="button"
          aria-label={label}
          aria-pressed={preference === value}
          title={label}
          onClick={() => setThemePreference(value)}
        >
          <Icon size={16} aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}

export default ThemeSwitcher
