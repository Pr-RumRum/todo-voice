import express from 'express'
import Database from 'better-sqlite3'
import cors from 'cors'

const db = new Database('todos.db')
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY,
    text TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    group_name TEXT
  )
`)

// Migration: add group_name to existing databases
try {
  db.exec('ALTER TABLE todos ADD COLUMN group_name TEXT')
} catch {}

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/todos', (req, res) => {
  const todos = db.prepare(
    'SELECT id, text, done, created_at as createdAt, group_name as "group" FROM todos ORDER BY created_at ASC'
  ).all()
  res.json(todos.map(t => ({ ...t, done: !!t.done, group: t.group || null })))
})

app.post('/api/todos', (req, res) => {
  const { text, group } = req.body
  if (!text?.trim()) return res.status(400).json({ error: 'Text required' })
  const createdAt = Date.now()
  const groupName = group?.trim() || null
  const result = db.prepare(
    'INSERT INTO todos (text, done, created_at, group_name) VALUES (?, 0, ?, ?)'
  ).run(text.trim(), createdAt, groupName)
  res.json({ id: result.lastInsertRowid, text: text.trim(), done: false, createdAt, group: groupName })
})

app.patch('/api/todos/:id', (req, res) => {
  const { done, group } = req.body
  const { id } = req.params
  if (typeof done !== 'undefined' && 'group' in req.body) {
    db.prepare('UPDATE todos SET done = ?, group_name = ? WHERE id = ?').run(done ? 1 : 0, group || null, id)
  } else if (typeof done !== 'undefined') {
    db.prepare('UPDATE todos SET done = ? WHERE id = ?').run(done ? 1 : 0, id)
  } else if ('group' in req.body) {
    db.prepare('UPDATE todos SET group_name = ? WHERE id = ?').run(group || null, id)
  }
  res.json({ ok: true })
})

app.delete('/api/todos/:id', (req, res) => {
  db.prepare('DELETE FROM todos WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

app.delete('/api/todos', (req, res) => {
  db.prepare('DELETE FROM todos WHERE done = 1').run()
  res.json({ ok: true })
})

app.listen(3001, () => console.log('API running on http://localhost:3001'))
