import { getDb, initDb } from '../_db.js'

export default async function handler(req, res) {
  try {
    await initDb()
  } catch (err) {
    console.error('initDb failed:', err)
    return res.status(500).json({ error: 'DB init failed' })
  }

  const sql = getDb()
  // Always parse id as integer — Neon HTTP driver does not auto-cast string→int
  const numId = parseInt(req.query.id, 10)
  if (isNaN(numId)) return res.status(400).json({ error: 'Invalid id' })

  if (req.method === 'PATCH') {
    const { done, group } = req.body
    try {
      if (typeof done !== 'undefined' && 'group' in req.body) {
        await sql`UPDATE todos SET done = ${done}, group_name = ${group ?? null} WHERE id = ${numId}`
      } else if (typeof done !== 'undefined') {
        await sql`UPDATE todos SET done = ${done} WHERE id = ${numId}`
      } else if ('group' in req.body) {
        await sql`UPDATE todos SET group_name = ${group ?? null} WHERE id = ${numId}`
      }
      return res.json({ ok: true })
    } catch (err) {
      console.error('PATCH failed:', err)
      return res.status(500).json({ error: 'Update failed' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      const result = await sql`DELETE FROM todos WHERE id = ${numId} RETURNING id`
      if (result.length === 0) {
        // Row not found — still return ok so client stays in sync
        console.warn(`DELETE: no row found for id=${numId}`)
      }
      return res.json({ ok: true, deleted: result.length })
    } catch (err) {
      console.error('DELETE failed:', err)
      return res.status(500).json({ error: 'Delete failed' })
    }
  }

  res.status(405).json({ error: 'Method not allowed' })
}
