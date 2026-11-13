import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isThemePreference,
  resolveTheme,
  THEME_PREFERENCES,
  THEME_STORAGE_KEY,
} from '../src/utils/themeUtils.js'

test('exposes only the light and dark theme preferences', () => {
  assert.deepEqual(THEME_PREFERENCES, ['light', 'dark'])
  assert.equal(THEME_STORAGE_KEY, 'sweety-theme')
  assert.equal(isThemePreference('light'), true)
  assert.equal(isThemePreference('dark'), true)
  assert.equal(isThemePreference('system'), false)
  assert.equal(isThemePreference('sepia'), false)
})

test('resolves only the selected light or dark theme', () => {
  assert.equal(resolveTheme('light'), 'light')
  assert.equal(resolveTheme('dark'), 'dark')
  assert.throws(() => resolveTheme('system'), TypeError)
  assert.throws(() => resolveTheme('sepia'), TypeError)
})
