import { Link } from 'react-router-dom'
import BrandLogo from '../components/BrandLogo.jsx'

function NotFound() {
  return (
    <main className="not-found-page">
      <BrandLogo />
      <span className="not-found-code">404</span>
      <h1>We can’t find that page</h1>
      <p>The address may be incorrect, or the page may have moved.</p>
      <Link className="primary-button not-found-link" to="/">
        Back to Sweety
      </Link>
    </main>
  )
}

export default NotFound
