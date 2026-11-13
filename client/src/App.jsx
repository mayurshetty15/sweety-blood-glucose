import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import ProtectedRoute from './routes/ProtectedRoute.jsx'
import AppLayout from './layouts/AppLayout.jsx'
import useTheme from './context/useTheme.js'
import Login from './pages/Login.jsx'
import NotFound from './pages/NotFound.jsx'
import Register from './pages/Register.jsx'
import { APP_PATHS, AUTHENTICATED_ROUTES } from './routes/appRoutes.js'

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const Analytics = lazy(() => import('./pages/Analytics.jsx'))
const ReportsPage = lazy(() => import('./pages/Reports.jsx'))

const authenticatedPages = {
  dashboard: <Dashboard />,
  analytics: <Analytics />,
  reports: <ReportsPage />,
}

function App() {
  const { theme } = useTheme()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={APP_PATHS.dashboard} replace />} />
        <Route element={<ProtectedRoute guestOnly />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            {AUTHENTICATED_ROUTES.map(({ path, key }) => (
              <Route
                key={key}
                path={path}
                element={(
                  <Suspense fallback={<div className="page-loading" role="status">Loading page…</div>}>
                    {authenticatedPages[key]}
                  </Suspense>
                )}
              />
            ))}
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
      <ToastContainer
        position="top-right"
        autoClose={3500}
        closeOnClick
        pauseOnFocusLoss
        draggable
        theme={theme}
      />
    </BrowserRouter>
  )
}

export default App
