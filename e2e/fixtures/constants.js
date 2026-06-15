import fs from 'node:fs'
import path from 'node:path'

/**
 * Shared E2E identifiers — the single source of truth for credentials, seeded
 * data, and storageState file access. Imported by global-setup AND the specs so
 * a value like the seeded deal title never drifts between setup and assertions.
 */

export const PASSWORD = 'Passw0rd!23'
export const SEED_DEAL_TITLE = 'קרואסון בדיקה'

/** The three baseline users global-setup provisions + logs in. */
export const EMAILS = {
  customer: 'e2e-customer@lastminute.test',
  owner: 'e2e-owner@lastminute.test',
  admin: process.env.E2E_ADMIN_EMAIL || 'oryariv2000@gmail.com',
}

/** storageState files (Playwright runs with cwd = project root). */
export const AUTH_DIR = path.join(process.cwd(), 'e2e', '.auth')
export const authFile = (f) => path.join(AUTH_DIR, f)
export const hasAuth = (f) => fs.existsSync(authFile(f))
