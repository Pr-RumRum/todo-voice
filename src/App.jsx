import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'

const API = '/api/todos'
const PIN = '930420'
const SESSION_KEY = 'todo_auth'
const LOCK_TIMEOUT = 5 * 60 * 1000

// ── Icons ──────────────────────────────────────────────────────────────────

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

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

const BackspaceIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z" />
    <line x1="18" y1="9" x2="12" y2="15" />
    <line x1="12" y1="9" x2="18" y2="15" />
  </svg>
)

// ── Speech Recognition Hook ────────────────────────────────────────────────

function useSpeechRecognition(onResult) {
  const [listening, setListening] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const recognitionRef = useRef(null)
  const onResultRef = useRef(onResult)

  useEffect(() => {
    onResultRef.current = onResult
  }, [onResult])

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i]
        if (r.isFinal) final += r[0].transcript
        else interim += r[0].transcript
      }
      setInterimTranscript(final || interim)
      if (final) {
        onResultRef.current(final.trim())
      }
    }

    recognition.onspeechend = () => {
      try { recognition.stop() } catch {}
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      setInterimTranscript('')
      setListening(false)
    }

    recognition.onend = () => {
      setInterimTranscript('')
      setListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      recognition.onresult = null
      recognition.onspeechend = null
      recognition.onerror = null
      recognition.onend = null
      try { recognition.abort() } catch {}
    }
  }, [])

  const start = useCallback(() => {
    if (!recognitionRef.current || listening) return
    try {
      recognitionRef.current.start()
      setListening(true)
    } catch (e) {
      console.error('Failed to start speech recognition:', e)
    }
  }, [listening])

  const stop = useCallback(() => {
    if (!recognitionRef.current) return
    try { recognitionRef.current.stop() } catch {}
    setListening(false)
  }, [])

  return {
    listening,
    interimTranscript,
    start,
    stop,
    supported: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
  }
}

// ── Inactivity Lock Hook ───────────────────────────────────────────────────

function useInactivityLock(onLock, active) {
  const timerRef = useRef(null)
  const activeRef = useRef(active)
  const onLockRef = useRef(onLock)

  activeRef.current = active
  onLockRef.current = onLock

  useEffect(() => {
    const arm = () => {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        if (activeRef.current) onLockRef.current()
      }, LOCK_TIMEOUT)
    }

    const onActivity = () => {
      if (!activeRef.current) return
      arm()
    }

    const events = ['click', 'touchstart', 'keydown', 'touchmove']
    events.forEach(e => window.addEventListener(e, onActivity, { passive: true }))

    return () => {
      clearTimeout(timerRef.current)
      events.forEach(e => window.removeEventListener(e, onActivity))
    }
  }, [])

  useEffect(() => {
    if (active) {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        if (activeRef.current) onLockRef.current()
      }, LOCK_TIMEOUT)
    } else {
      clearTimeout(timerRef.current)
    }
  }, [active])
}

// ── Lock Screen ────────────────────────────────────────────────────────────

function LockScreen({ onUnlock }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  const submit = useCallback((digit) => {
    if (error) return
    const next = pin + digit
    if (next.length > 6) return
    setPin(next)
    if (next.length === 6) {
      if (next === PIN) {
        sessionStorage.setItem(SESSION_KEY, '1')
        onUnlock()
      } else {
        setError(true)
        setTimeout(() => {
          setPin('')
          setError(false)
        }, 700)
      }
    }
  }, [pin, error, onUnlock])

  const del = useCallback(() => {
    if (!error) setPin(p => p.slice(0, -1))
  }, [error])

  useEffect(() => {
    const handler = (e) => {
      if (e.key >= '0' && e.key <= '9') submit(e.key)
      else if (e.key === 'Backspace') del()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [submit, del])

  return (
    <div className="lock-screen">
      <div className="lock-content">
        <div className="lock-icon-wrap">
          <LockIcon />
        </div>
        <h2 className="lock-title">Tasks</h2>
        <p className="lock-sub">Enter your PIN to continue</p>
        <div className={`pin-dots ${error ? 'pin-shake' : ''}`}>
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className={`pin-dot ${i < pin.length ? 'filled' : ''} ${error ? 'error' : ''}`}
            />
          ))}
        </div>
        <p className="pin-error">{error ? 'Incorrect PIN' : ''}</p>
        <div className="pin-grid">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
            <button key={d} className="pin-btn" onClick={() => submit(String(d))}>
              {d}
            </button>
          ))}
          <div />
          <button className="pin-btn" onClick={() => submit('0')}>0</button>
          <button className="pin-btn pin-del" onClick={del} aria-label="Delete">
            <BackspaceIcon />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Utilities ──────────────────────────────────────────────────────────────

function formatTime(ts) {
  if (!ts) return ''
  // Neon returns BIGINT columns as strings; coerce to number before constructing Date
  const d = new Date(Number(ts))
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (d.toDateString() === now.toDateString()) return time
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' · ' + time
}

// ── App ────────────────────────────────────────────────────────────────────

function App() {
  const [locked, setLocked] = useState(() => sessionStorage.getItem(SESSION_KEY) !== '1')
  const [title, setTitle] = useState(() => localStorage.getItem('todo-title') || 'Tasks')
  const [todos, setTodos] = useState([])
  const [input, setInput] = useState('')
  const [filter, setFilter] = useState('all')
  const [voiceText, setVoiceText] = useState('')
  const [removing, setRemoving] = useState(new Set())
  const inputRef = useRef(null)

  const lock = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY)
    setLocked(true)
  }, [])

  const unlock = useCallback(() => setLocked(false), [])

  useInactivityLock(lock, !locked)

  useEffect(() => {
    if (locked) return
    fetch(API).then(r => r.json()).then(setTodos)
  }, [locked])

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
      body: JSON.stringify({ text: trimmed }),
    }).then(r => r.json())
    setTodos(prev => [...prev, todo])
    setInput('')
  }, [])

  const toggleTodo = useCallback(async (id) => {
    const todo = todos.find(t => String(t.id) === String(id))
    if (!todo) return
    const done = !todo.done
    setTodos(prev => prev.map(t => String(t.id) === String(id) ? { ...t, done } : t))
    await fetch(`${API}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done }),
    })
  }, [todos])

  const deleteTodo = useCallback((id) => {
    setRemoving(prev => new Set(prev).add(id))
    setTimeout(async () => {
      await fetch(`${API}/${id}`, { method: 'DELETE' })
      setTodos(prev => prev.filter(t => String(t.id) !== String(id)))
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
      const text = transcript.slice(lower.indexOf(' ') + 1).trim()
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
        if (!isNaN(num) && todos[num - 1]) {
          deleteTodo(todos[num - 1].id)
        } else {
          const match = todos.find(t => t.text.toLowerCase().includes(rest))
          if (match) deleteTodo(match.id)
        }
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
        if (!isNaN(num) && todos[num - 1]) {
          toggleTodo(todos[num - 1].id)
        } else {
          const match = todos.find(t => t.text.toLowerCase().includes(rest))
          if (match) toggleTodo(match.id)
        }
      }
      return
    }

    if (lower.includes('clear')) {
      clearCompleted()
      return
    }

    addTodo(transcript)
  }, [addTodo, deleteTodo, toggleTodo, clearCompleted, todos])

  const { listening, interimTranscript, start, stop, supported } = useSpeechRecognition(handleVoice)

  const handleSubmit = (e) => {
    e.preventDefault()
    addTodo(input)
  }

  const handleTouchStart = (e) => {
    e.preventDefault()
    start()
  }
  const handleTouchEnd = (e) => {
    e.preventDefault()
    stop()
  }

  const filtered = todos.filter(t => {
    if (filter === 'active') return !t.done
    if (filter === 'done') return t.done
    return true
  })

  const remaining = todos.filter(t => !t.done).length
  const completedCount = todos.filter(t => t.done).length

  if (locked) return <LockScreen onUnlock={unlock} />

  return (
    <div className="app">
      <header className="header">
        <input
          className="title-input"
          value={title}
          onChange={e => {
            setTitle(e.target.value)
            localStorage.setItem('todo-title', e.target.value)
          }}
          onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
          aria-label="List title"
        />
        <p>{remaining} remaining</p>
      </header>

      <div className="input-area">
        <form className="input-row" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={listening ? interimTranscript : input}
            onChange={e => { if (!listening) setInput(e.target.value) }}
            placeholder={listening ? 'Listening\u2026' : 'What needs to be done?'}
            className={listening ? 'voice-active' : ''}
          />
        </form>

        {supported && (
          <div className="mic-wrapper">
            <button
              type="button"
              className={`voice-btn ${listening ? 'listening' : ''}`}
              onMouseDown={start}
              onMouseUp={stop}
              onMouseLeave={listening ? stop : undefined}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              onContextMenu={e => e.preventDefault()}
              aria-label="Hold to speak"
            >
              <MicIcon />
            </button>
            <span className="mic-label">
              {listening ? 'Release to send' : 'Hold to speak'}
            </span>
          </div>
        )}
      </div>

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
          {interimTranscript ? `\u201c${interimTranscript}\u201d` : 'Listening\u2026'}
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
