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
import {
  APP_PATHS,
  AUTHENTICATED_ROUTES,
  DOCTOR_REPORT_ROUTE,
} from './routes/appRoutes.js'

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const Analytics = lazy(() => import('./pages/Analytics.jsx'))
const ReportsPage = lazy(() => import('./pages/Reports.jsx'))
const PatientProfile = lazy(() => import('./pages/PatientProfile.jsx'))
const PatientDoctors = lazy(() => import('./pages/PatientDoctors.jsx'))
const DoctorPatients = lazy(() => import('./pages/DoctorPatients.jsx'))
const DoctorPatientReport = lazy(() => import('./pages/DoctorPatientReport.jsx'))

const authenticatedPages = {
  dashboard: <Dashboard />,
  analytics: <Analytics />,
  reports: <ReportsPage />,
  doctors: <PatientDoctors />,
}

function App() {
  const { theme } = useTheme()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={APP_PATHS.dashboard} replace />} />
        <Route path="/dashboard" element={<Navigate to={APP_PATHS.dashboard} replace />} />
        <Route path="/analytics" element={<Navigate to={APP_PATHS.analytics} replace />} />
        <Route path="/reports" element={<Navigate to={APP_PATHS.reports} replace />} />
        <Route element={<ProtectedRoute guestOnly />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>
        <Route element={<ProtectedRoute role="patient" />}>
          <Route element={<AppLayout />}>
            {AUTHENTICATED_ROUTES.filter(({ key }) => key !== 'profile').map(({ path, key }) => (
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
        <Route element={<ProtectedRoute role="patient" skipProfileCompletion />}>
          <Route element={<AppLayout />}>
            <Route
              path={APP_PATHS.profile}
              element={(
                <Suspense fallback={<div className="page-loading" role="status">Loading page…</div>}>
                  <PatientProfile />
                </Suspense>
              )}
            />
          </Route>
        </Route>
        <Route element={<ProtectedRoute role="doctor" skipProfileCompletion />}>
          <Route element={<AppLayout />}>
            <Route path={APP_PATHS.doctorDashboard} element={(
              <Suspense fallback={<div className="page-loading" role="status">Loading page…</div>}>
                <DoctorPatients />
              </Suspense>
            )} />
            <Route path={APP_PATHS.doctorPatients} element={(
              <Suspense fallback={<div className="page-loading" role="status">Loading page…</div>}>
                <DoctorPatients />
              </Suspense>
            )} />
            <Route path={DOCTOR_REPORT_ROUTE} element={(
              <Suspense fallback={<div className="page-loading" role="status">Loading page…</div>}>
                <DoctorPatientReport />
              </Suspense>
            )} />
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
