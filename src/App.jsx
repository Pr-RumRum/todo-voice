import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'

const API = '/api/todos'
const headers = { 'Content-Type': 'application/json' }

const MicIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="22" />
  </svg>
)

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const ClipboardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="8" y="2" width="8" height="4" rx="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <line x1="9" y1="12" x2="15" y2="12" />
    <line x1="9" y1="16" x2="13" y2="16" />
  </svg>
)

function useSpeechRecognition(onResult) {
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      onResult(transcript)
      setListening(false)
    }

    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)

    recognitionRef.current = recognition
  }, [onResult])

  const toggle = useCallback(() => {
    if (!recognitionRef.current) return
    if (listening) {
      recognitionRef.current.stop()
      setListening(false)
    } else {
      recognitionRef.current.start()
      setListening(true)
    }
  }, [listening])

  return { listening, toggle, supported: !!recognitionRef.current || !!(window.SpeechRecognition || window.webkitSpeechRecognition) }
}

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (d.toDateString() === now.toDateString()) return time
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' · ' + time
}

function App() {
  const [todos, setTodos] = useState([])
  const [input, setInput] = useState('')
  const [filter, setFilter] = useState('all')
  const [voiceText, setVoiceText] = useState('')
  const [removing, setRemoving] = useState(new Set())
  const inputRef = useRef(null)

  useEffect(() => {
    fetch(API).then(r => r.json()).then(setTodos)
  }, [])

  useEffect(() => {
    if (voiceText) {
      const timer = setTimeout(() => setVoiceText(''), 2500)
      return () => clearTimeout(timer)
    }
  }, [voiceText])

  const addTodo = useCallback(async (text) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const todo = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed })
    }).then(r => r.json())
    setTodos(prev => [...prev, todo])
    setInput('')
  }, [])

  const toggleTodo = useCallback(async (id) => {
    const todo = todos.find(t => t.id === id)
    if (!todo) return
    const done = !todo.done
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done } : t))
    await fetch(`${API}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done })
    })
  }, [todos])

  const deleteTodo = useCallback((id) => {
    setRemoving(prev => new Set(prev).add(id))
    setTimeout(async () => {
      await fetch(`${API}/${id}`, { method: 'DELETE' })
      setTodos(prev => prev.filter(t => t.id !== id))
      setRemoving(prev => { const next = new Set(prev); next.delete(id); return next })
    }, 280)
  }, [])

  const clearCompleted = useCallback(async () => {
    await fetch(API, { method: 'DELETE' })
    setTodos(prev => prev.filter(t => !t.done))
  }, [])

  const handleVoice = useCallback((transcript) => {
    const lower = transcript.toLowerCase().trim()
    setVoiceText(transcript)

    if (lower.startsWith('add ') || lower.startsWith('new ')) {
      const text = transcript.slice(4).trim()
      if (text) addTodo(text)
      return
    }

    if (lower.startsWith('delete ') || lower.startsWith('remove ')) {
      const rest = lower.slice(lower.indexOf(' ') + 1).trim()
      if (rest === 'last') {
        const last = todos[todos.length - 1]
        if (last) deleteTodo(last.id)
      } else {
        const num = parseInt(rest)
        if (!isNaN(num) && todos[num - 1]) deleteTodo(todos[num - 1].id)
      }
      return
    }

    if (lower.startsWith('complete ') || lower.startsWith('done ') || lower.startsWith('finish ')) {
      const rest = lower.slice(lower.indexOf(' ') + 1).trim()
      if (rest === 'last') {
        const last = todos[todos.length - 1]
        if (last) toggleTodo(last.id)
      } else {
        const num = parseInt(rest)
        if (!isNaN(num) && todos[num - 1]) toggleTodo(todos[num - 1].id)
      }
      return
    }

    if (lower.includes('clear')) {
      clearCompleted()
      return
    }

    addTodo(transcript)
  }, [addTodo, deleteTodo, toggleTodo, clearCompleted, todos])

  const { listening, toggle: toggleVoice, supported } = useSpeechRecognition(handleVoice)

  const handleSubmit = (e) => {
    e.preventDefault()
    addTodo(input)
  }

  const filtered = todos.filter(t => {
    if (filter === 'active') return !t.done
    if (filter === 'done') return t.done
    return true
  })

  const remaining = todos.filter(t => !t.done).length
  const completedCount = todos.filter(t => t.done).length

  return (
    <div className="app">
      <header className="header">
        <h1>Tasks</h1>
        <p>{remaining} remaining{supported ? ' \u00b7 voice enabled' : ''}</p>
      </header>

      <form className="input-row" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="What needs to be done?"
        />
        {supported && (
          <button
            type="button"
            className={`voice-btn ${listening ? 'listening' : ''}`}
            onClick={toggleVoice}
            aria-label={listening ? 'Stop listening' : 'Start voice input'}
          >
            <MicIcon />
          </button>
        )}
      </form>

      {todos.length > 0 && (
        <div className="filters">
          {['all', 'active', 'done'].map(f => (
            <button
              key={f}
              className={filter === f ? 'active' : ''}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      )}

      <div className="todo-list">
        {filtered.length === 0 && todos.length === 0 && (
          <div className="empty">
            <div className="empty-icon"><ClipboardIcon /></div>
            <p>No tasks yet. Type or say something.</p>
          </div>
        )}
        {filtered.length === 0 && todos.length > 0 && (
          <div className="empty">
            <p>No {filter} tasks.</p>
          </div>
        )}
        {filtered.map(todo => (
          <div key={todo.id} className={`todo-item ${removing.has(todo.id) ? 'removing' : ''}`}>
            <div
              className={`checkbox ${todo.done ? 'checked' : ''}`}
              onClick={() => toggleTodo(todo.id)}
              role="checkbox"
              aria-checked={todo.done}
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && toggleTodo(todo.id)}
            >
              <CheckIcon />
            </div>
            <div className="todo-content">
              <span className={`todo-text ${todo.done ? 'completed' : ''}`}>
                {todo.text}
              </span>
              <span className="todo-time">{formatTime(todo.createdAt)}</span>
            </div>
            <button className="delete-btn" onClick={() => deleteTodo(todo.id)} aria-label="Delete task">
              <XIcon />
            </button>
          </div>
        ))}
      </div>

      {todos.length > 0 && (
        <div className="footer">
          <span>{remaining} left</span>
          {completedCount > 0 && (
            <button className="clear-btn" onClick={clearCompleted}>
              Clear completed
            </button>
          )}
        </div>
      )}

      {listening && (
        <div className="voice-feedback">
          <span className="dot" />
          Listening...
        </div>
      )}

      {voiceText && !listening && (
        <div className="voice-feedback">
          &ldquo;{voiceText}&rdquo;
        </div>
      )}
    </div>
  )
}

export default App
