import { LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import BrandLogo from './BrandLogo.jsx'
import ThemeSwitcher from './ThemeSwitcher.jsx'
import useAuth from '../context/useAuth.js'
import { AUTHENTICATED_ROUTES } from '../routes/appRoutes.js'

function Navbar() {
  const { user, logout } = useAuth()
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const displayName = user?.name || user?.email || 'Account'
  const profileInitial = displayName.charAt(0).toUpperCase()

  return (
    <header className="dashboard-header tracker-header">
      <div className="tracker-brand">
        <BrandLogo />
        <span className="tracker-brand__divider" aria-hidden="true" />
        <span className="tracker-brand__label">Blood Glucose Tracker</span>
      </div>
      <nav
        className={`tracker-nav${isMobileNavOpen ? ' is-open' : ''}`}
        id="dashboard-navigation"
        aria-label="Main navigation"
      >
        {AUTHENTICATED_ROUTES.map(({ path, label }) => (
          <NavLink
            key={path}
            to={path}
            end
            onClick={() => setIsMobileNavOpen(false)}
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="tracker-header__actions">
        <div className="tracker-profile">
          <span className="tracker-profile__avatar" aria-hidden="true">
            {profileInitial}
          </span>
          <span className="tracker-user">{displayName}</span>
        </div>
        <ThemeSwitcher />
        <button
          className="secondary-button tracker-logout"
          type="button"
          aria-label="Sign out"
          onClick={logout}
        >
          <LogOut size={17} aria-hidden="true" />
          <span>Sign out</span>
        </button>
        <button
          className="tracker-menu-toggle"
          type="button"
          aria-label={isMobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-controls="dashboard-navigation"
          aria-expanded={isMobileNavOpen}
          onClick={() => setIsMobileNavOpen((open) => !open)}
        >
          {isMobileNavOpen
            ? <X size={20} aria-hidden="true" />
            : <Menu size={20} aria-hidden="true" />}
        </button>
      </div>
    </header>
  )
}

export default Navbar
