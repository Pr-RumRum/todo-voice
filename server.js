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
    created_at INTEGER NOT NULL
  )
`)

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/todos', (req, res) => {
  const todos = db.prepare('SELECT id, text, done, created_at as createdAt FROM todos ORDER BY created_at ASC').all()
  res.json(todos.map(t => ({ ...t, done: !!t.done })))
})

app.post('/api/todos', (req, res) => {
  const { text } = req.body
  if (!text?.trim()) return res.status(400).json({ error: 'Text required' })
  const createdAt = Date.now()
  const result = db.prepare('INSERT INTO todos (text, done, created_at) VALUES (?, 0, ?)').run(text.trim(), createdAt)
  res.json({ id: result.lastInsertRowid, text: text.trim(), done: false, createdAt })
})

app.patch('/api/todos/:id', (req, res) => {
  const { done } = req.body
  db.prepare('UPDATE todos SET done = ? WHERE id = ?').run(done ? 1 : 0, req.params.id)
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
