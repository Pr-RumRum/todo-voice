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
      created_at BIGINT NOT NULL
    )
  `
}
