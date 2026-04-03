import { getDb, initDb } from '../_db.js'

export default async function handler(req, res) {
  await initDb()
  const sql = getDb()

  if (req.method === 'GET') {
    const rows = await sql`SELECT id, text, done, created_at as "createdAt" FROM todos ORDER BY created_at ASC`
    return res.json(rows)
  }

  if (req.method === 'POST') {
    const { text } = req.body
    if (!text?.trim()) return res.status(400).json({ error: 'Text required' })
    const createdAt = Date.now()
    const [row] = await sql`
      INSERT INTO todos (text, done, created_at) VALUES (${text.trim()}, false, ${createdAt})
      RETURNING id, text, done, created_at as "createdAt"
    `
    return res.json(row)
  }

  if (req.method === 'DELETE') {
    await sql`DELETE FROM todos WHERE done = true`
    return res.json({ ok: true })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
