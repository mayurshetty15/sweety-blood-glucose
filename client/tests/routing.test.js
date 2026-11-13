import assert from 'node:assert/strict'
import test from 'node:test'
import { matchRoutes } from 'react-router-dom'
import {
  APP_PATHS,
  AUTHENTICATED_ROUTES,
  DOCTOR_REPORT_ROUTE,
} from '../src/routes/appRoutes.js'
import { getProtectedRedirect } from '../src/routes/routePolicy.js'

test('all authenticated navigation targets resolve to their own route', () => {
  const routes = AUTHENTICATED_ROUTES.map(({ path }) => ({ path }))

  for (const { path } of AUTHENTICATED_ROUTES) {
    const match = matchRoutes(routes, path)
    assert.equal(match?.at(-1)?.route.path, path)
  }

  assert.deepEqual(
    AUTHENTICATED_ROUTES.map(({ path }) => path),
    [
      APP_PATHS.dashboard,
      APP_PATHS.analytics,
      APP_PATHS.reports,
      APP_PATHS.profile,
      APP_PATHS.doctors,
    ],
  )
})

test('protected and guest-only routes redirect according to authentication state', () => {
  const patient = { role: 'patient', profile_complete: true }
  assert.equal(getProtectedRedirect({ isAuthenticated: false }), '/login')
  assert.equal(
    getProtectedRedirect({ isAuthenticated: true, user: patient }),
    null,
  )
  assert.equal(
    getProtectedRedirect({ isAuthenticated: true, user: patient, guestOnly: true }),
    APP_PATHS.dashboard,
  )
  assert.equal(
    getProtectedRedirect({ isAuthenticated: false, guestOnly: true }),
    null,
  )
  assert.equal(DOCTOR_REPORT_ROUTE, '/doctor/patients/:patientId/report')
  assert.equal(
    getProtectedRedirect({
      isAuthenticated: true,
      user: { role: 'doctor' },
      role: 'doctor',
    }),
    null,
  )
})
