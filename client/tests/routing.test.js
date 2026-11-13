import assert from 'node:assert/strict'
import test from 'node:test'
import { matchRoutes } from 'react-router-dom'
import {
  APP_PATHS,
  AUTHENTICATED_ROUTES,
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
    [APP_PATHS.dashboard, APP_PATHS.analytics, APP_PATHS.reports],
  )
})

test('protected and guest-only routes redirect according to authentication state', () => {
  assert.equal(getProtectedRedirect(false), '/login')
  assert.equal(getProtectedRedirect(true), null)
  assert.equal(getProtectedRedirect(true, true), APP_PATHS.dashboard)
  assert.equal(getProtectedRedirect(false, true), null)
})
