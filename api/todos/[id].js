import { getDb, initDb } from '../_db.js'

export default async function handler(req, res) {
  await initDb()
  const sql = getDb()
  const { id } = req.query

  if (req.method === 'PATCH') {
    const { done, group } = req.body
    if (typeof done !== 'undefined' && 'group' in req.body) {
      await sql`UPDATE todos SET done = ${done}, group_name = ${group} WHERE id = ${id}`
    } else if (typeof done !== 'undefined') {
      await sql`UPDATE todos SET done = ${done} WHERE id = ${id}`
    } else if ('group' in req.body) {
      await sql`UPDATE todos SET group_name = ${group} WHERE id = ${id}`
    }
    return res.json({ ok: true })
  }

  if (req.method === 'DELETE') {
    await sql`DELETE FROM todos WHERE id = ${id}`
    return res.json({ ok: true })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
