import { neon } from '@neondatabase/serverless'

let sql

export function getDb() {
  if (!sql) {
    sql = neon(process.env.DATABASE_URL)
  }
  return sql
}

export async function initDb() {
  const sql = getDb()
  await sql`
    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      text TEXT NOT NULL,
      done BOOLEAN NOT NULL DEFAULT false,
      created_at BIGINT NOT NULL,
      group_name TEXT
    )
  `
  // Migration: add group_name to existing tables that predate this column
  await sql`ALTER TABLE todos ADD COLUMN IF NOT EXISTS group_name TEXT`
}
