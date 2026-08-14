'use client'

import { useState, useReducer, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Tab = 'appid' | 'lookup'
type LookupStep = 'mobile' | 'name'

interface MaskedResult { masked: string; seat_tier: string }

interface State {
  tab: Tab
  appId: string
  mobile: string
  // lookup
  lookupMobile: string
  lookupStep: LookupStep
  maskedNames: MaskedResult[]
  lookupName: string
  loading: boolean
  error: string
}

type Action =
  | { type: 'SET_TAB'; tab: Tab }
  | { type: 'SET'; field: keyof State; value: string }
  | { type: 'SET_LOADING'; v: boolean }
  | { type: 'SET_ERROR'; msg: string }
  | { type: 'SET_MASKED'; names: MaskedResult[] }
  | { type: 'RESET_LOOKUP' }

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'SET_TAB': return { ...s, tab: a.tab, error: '', lookupStep: 'mobile', maskedNames: [] }
    case 'SET': return { ...s, [a.field]: a.value, error: '' }
    case 'SET_LOADING': return { ...s, loading: a.v }
    case 'SET_ERROR': return { ...s, error: a.msg, loading: false }
    case 'SET_MASKED': return { ...s, maskedNames: a.names, lookupStep: 'name', loading: false, error: '' }
    case 'RESET_LOOKUP': return { ...s, lookupStep: 'mobile', maskedNames: [], lookupName: '', error: '' }
    default: return s
  }
}

const init: State = {
  tab: 'appid', appId: '', mobile: '',
  lookupMobile: '', lookupStep: 'mobile', maskedNames: [], lookupName: '',
  loading: false, error: '',
}

export default function LoginPage() {
  const router = useRouter()
  const [state, dispatch] = useReducer(reducer, init)
  const [eventName, setEventName] = useState('9 Arts Studio Event')
  const [eventIcon, setEventIcon] = useState('🎭')

  useEffect(() => {
    fetch('/api/event-settings')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.settings) {
          setEventName(d.settings.event_name ?? eventName)
          setEventIcon(d.settings.event_icon ?? eventIcon)
        }
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const inp = 'w-full bg-white/5 border border-white/10 text-white placeholder-zinc-500 rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-500 transition-colors'

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    dispatch({ type: 'SET_LOADING', v: true })
    dispatch({ type: 'SET_ERROR', msg: '' })
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: state.appId.trim(), mobile: state.mobile.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { dispatch({ type: 'SET_ERROR', msg: data.error ?? 'Login failed' }); return }
      router.push('/my-pass')
    } catch {
      dispatch({ type: 'SET_ERROR', msg: 'Network error. Please try again.' })
    } finally {
      dispatch({ type: 'SET_LOADING', v: false })
    }
  }

  // Step 1 — mobile → get masked names
  async function handleMobileLookup(e: React.FormEvent) {
    e.preventDefault()
    dispatch({ type: 'SET_LOADING', v: true })
    dispatch({ type: 'SET_ERROR', msg: '' })
    try {
      const res = await fetch('/api/auth/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: state.lookupMobile.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { dispatch({ type: 'SET_ERROR', msg: data.error ?? 'Not found' }); return }
      dispatch({ type: 'SET_MASKED', names: data.maskedNames ?? [] })
    } catch {
      dispatch({ type: 'SET_ERROR', msg: 'Network error. Please try again.' })
    } finally {
      dispatch({ type: 'SET_LOADING', v: false })
    }
  }

  // Step 2 — name → confirm and login
  async function handleNameConfirm(e: React.FormEvent) {
    e.preventDefault()
    dispatch({ type: 'SET_LOADING', v: true })
    dispatch({ type: 'SET_ERROR', msg: '' })
    try {
      const res = await fetch('/api/auth/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: state.lookupMobile.trim(), full_name: state.lookupName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { dispatch({ type: 'SET_ERROR', msg: data.error ?? 'Not found' }); return }
      router.push('/my-pass')
    } catch {
      dispatch({ type: 'SET_ERROR', msg: 'Network error. Please try again.' })
    } finally {
      dispatch({ type: 'SET_LOADING', v: false })
    }
  }

  const tierLabel = (t: string) => t === 'elite' ? '👑 Elite' : '⭐ Gold'

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse at center, #1a0a2e 0%, #0a0a0f 100%)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 group mb-6">
            <span className="text-3xl">{eventIcon}</span>
            <span className="font-bold text-xl shimmer">{eventName}</span>
          </Link>
          <h1 className="text-2xl font-bold text-white mt-4">Welcome Back</h1>
          <p className="text-zinc-400 text-sm mt-1">Login to view your QR pass</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
          {/* Tabs */}
          <div className="grid grid-cols-2 gap-2 bg-white/5 rounded-xl p-1 mb-6">
            <button type="button" onClick={() => dispatch({ type: 'SET_TAB', tab: 'appid' })}
              className={`py-2.5 rounded-lg text-sm font-medium transition-all ${state.tab === 'appid' ? 'bg-yellow-500 text-black' : 'text-zinc-400 hover:text-white'}`}>
              I have Application ID
            </button>
            <button type="button" onClick={() => dispatch({ type: 'SET_TAB', tab: 'lookup' })}
              className={`py-2.5 rounded-lg text-sm font-medium transition-all ${state.tab === 'lookup' ? 'bg-yellow-500 text-black' : 'text-zinc-400 hover:text-white'}`}>
              Forgot Application ID
            </button>
          </div>

          {/* ── TAB: Application ID login ── */}
          {state.tab === 'appid' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Application ID</label>
                <input type="text" value={state.appId} onChange={e => dispatch({ type: 'SET', field: 'appId', value: e.target.value })}
                  placeholder="9AS2026-XXXXXX-XXXXXX" className={inp} autoCapitalize="characters" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Mobile Number</label>
                <input type="tel" value={state.mobile} onChange={e => dispatch({ type: 'SET', field: 'mobile', value: e.target.value })}
                  placeholder="e.g. 9876543210 or +91 98765 43210" inputMode="tel" className={inp} />
              </div>
              {state.error && <div className="bg-red-900/20 border border-red-700/50 text-red-400 rounded-lg px-4 py-3 text-sm">{state.error}</div>}
              <button type="submit" disabled={state.loading}
                className="w-full bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-bold py-3.5 rounded-xl disabled:opacity-60 hover:from-yellow-500 hover:to-yellow-300 transition-all">
                {state.loading ? 'Logging in...' : 'View My Pass →'}
              </button>
            </form>
          )}

          {/* ── TAB: Forgot ID — Step 1: Mobile ── */}
          {state.tab === 'lookup' && state.lookupStep === 'mobile' && (
            <form onSubmit={handleMobileLookup} className="space-y-4">
              <div className="bg-blue-900/20 border border-blue-700/30 rounded-xl px-4 py-3 text-sm text-blue-300">
                Enter your registered mobile number. We&apos;ll show you a hint of the name(s) registered.
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Mobile Number</label>
                <input type="tel" value={state.lookupMobile} onChange={e => dispatch({ type: 'SET', field: 'lookupMobile', value: e.target.value })}
                  placeholder="e.g. 9876543210" inputMode="tel" className={inp} />
              </div>
              {state.error && <div className="bg-red-900/20 border border-red-700/50 text-red-400 rounded-lg px-4 py-3 text-sm">{state.error}</div>}
              <button type="submit" disabled={state.loading}
                className="w-full bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-bold py-3.5 rounded-xl disabled:opacity-60 transition-all">
                {state.loading ? 'Looking up...' : 'Find My Registration →'}
              </button>
            </form>
          )}

          {/* ── TAB: Forgot ID — Step 2: Confirm name ── */}
          {state.tab === 'lookup' && state.lookupStep === 'name' && (
            <form onSubmit={handleNameConfirm} className="space-y-4">
              {/* Show masked names */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">
                  {state.maskedNames.length === 1 ? 'Registration found' : `${state.maskedNames.length} registrations found`} for this mobile
                </div>
                {state.maskedNames.map((m, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-white font-mono text-sm">{m.masked}</span>
                    <span className="text-zinc-500 text-xs">{tierLabel(m.seat_tier)}</span>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Enter your full name exactly as registered
                </label>
                <input type="text" value={state.lookupName} onChange={e => dispatch({ type: 'SET', field: 'lookupName', value: e.target.value })}
                  placeholder="Your full name" className={inp} autoFocus />
              </div>
              {state.error && <div className="bg-red-900/20 border border-red-700/50 text-red-400 rounded-lg px-4 py-3 text-sm">{state.error}</div>}
              <button type="submit" disabled={state.loading}
                className="w-full bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-bold py-3.5 rounded-xl disabled:opacity-60 transition-all">
                {state.loading ? 'Verifying...' : 'Confirm & Login →'}
              </button>
              <button type="button" onClick={() => dispatch({ type: 'RESET_LOOKUP' })}
                className="w-full text-zinc-500 hover:text-white text-sm py-2 transition-colors">
                ← Try a different mobile number
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-zinc-600 text-sm mt-6">
          Not registered yet?{' '}
          <Link href="/#register" className="text-yellow-500 hover:text-yellow-400 transition-colors">
            Register here
          </Link>
        </p>
      </div>
    </div>
  )
}
