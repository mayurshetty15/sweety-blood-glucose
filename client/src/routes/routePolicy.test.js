import assert from 'node:assert/strict'
import { test } from 'node:test'
import { APP_PATHS } from './appRoutes.js'
import { getAuthenticatedHome, getProtectedRedirect } from './routePolicy.js'

test('routes doctors to their dashboard and incomplete patients to profile setup', () => {
  assert.equal(getAuthenticatedHome({ role: 'doctor' }), APP_PATHS.doctorDashboard)
  assert.equal(
    getAuthenticatedHome({ role: 'patient', profile_complete: false }),
    APP_PATHS.profile,
  )
  assert.equal(
    getAuthenticatedHome({ role: 'patient', profile_complete: true }),
    APP_PATHS.dashboard,
  )
})

test('rejects role-inappropriate routes and requires incomplete patients to finish profile', () => {
  assert.equal(
    getProtectedRedirect({
      isAuthenticated: true,
      user: { role: 'patient', profile_complete: true },
      role: 'doctor',
    }),
    APP_PATHS.dashboard,
  )
  assert.equal(
    getProtectedRedirect({
      isAuthenticated: true,
      user: { role: 'patient', profile_complete: false },
      role: 'patient',
      pathname: APP_PATHS.analytics,
    }),
    APP_PATHS.profile,
  )
})
