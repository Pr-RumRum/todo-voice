import { neon } from '@neondatabase/serverless'

let sql
let initialized = false

export function getDb() {
  if (!sql) {
    sql = neon(process.env.DATABASE_URL)
  }
  return sql
}

export async function initDb() {
  // Only run DDL once per function instance (warm-start safe)
  if (initialized) return
  const db = getDb()
  await db`
    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      text TEXT NOT NULL,
      done BOOLEAN NOT NULL DEFAULT false,
      created_at BIGINT NOT NULL,
      group_name TEXT
    )
  `
  // Idempotent migration for pre-existing tables
  try {
    await db`ALTER TABLE todos ADD COLUMN IF NOT EXISTS group_name TEXT`
  } catch {}
  initialized = true
}
