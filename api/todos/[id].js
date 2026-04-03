import { getDb, initDb } from '../_db.js'

export default async function handler(req, res) {
  await initDb()
  const sql = getDb()
  const { id } = req.query

  if (req.method === 'PATCH') {
    const { done } = req.body
    await sql`UPDATE todos SET done = ${done} WHERE id = ${id}`
    return res.json({ ok: true })
  }

  if (req.method === 'DELETE') {
    await sql`DELETE FROM todos WHERE id = ${id}`
    return res.json({ ok: true })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
