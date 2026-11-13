import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'

function AppLayout() {
  return (
    <div className="dashboard-page tracker-page">
      <Navbar />
      <main className="dashboard-main tracker-main">
        <div className="tracker-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default AppLayout
