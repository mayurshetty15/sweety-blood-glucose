import { HeartHandshake, ShieldCheck } from 'lucide-react'
import BrandLogo from '../components/BrandLogo.jsx'

function AuthLayout({ children }) {
  return (
    <main className="auth-page">
      <div className="auth-shell">
        <aside className="auth-aside">
          <BrandLogo />
          <div className="auth-aside__message">
            <span className="auth-kicker">A little more in tune</span>
            <h1>A thoughtful space for your health journey.</h1>
            <p>
              Keep your glucose tracking experience clear, personal, and easy
              to return to.
            </p>
            <div className="auth-assurance">
              <span className="auth-assurance__icon">
                <ShieldCheck size={19} aria-hidden="true" />
              </span>
              <span>Your account, your personal space</span>
            </div>
          </div>
          <div className="auth-aside__footer">
            <HeartHandshake size={18} aria-hidden="true" />
            <span>Small steps, at your own pace.</span>
          </div>
          <span className="auth-decoration auth-decoration--one" aria-hidden="true" />
          <span className="auth-decoration auth-decoration--two" aria-hidden="true" />
        </aside>
        <section className="auth-main">
          <div className="auth-form-panel">{children}</div>
        </section>
      </div>
    </main>
  )
}

export default AuthLayout
