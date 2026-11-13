import { HeartPulse } from 'lucide-react'
import { Link } from 'react-router-dom'

function BrandLogo() {
  return (
    <Link className="brand-logo" to="/" aria-label="Sweety home">
      <span className="brand-logo__mark" aria-hidden="true">
        <HeartPulse size={22} strokeWidth={2.25} />
      </span>
      <span className="brand-logo__name">sweety</span>
    </Link>
  )
}

export default BrandLogo
