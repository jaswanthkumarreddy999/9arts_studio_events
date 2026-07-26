'use client'

import { useState, useReducer } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Tab = 'appid' | 'lookup'

interface State {
  tab: Tab
  appId: string
  mobile: string
  name: string
  mobileLookup: string
  loading: boolean
  error: string
  foundAppId: string
}

type Action =
  | { type: 'SET_TAB'; tab: Tab }
  | { type: 'SET'; field: keyof State; value: string }
  | { type: 'SET_LOADING'; v: boolean }
  | { type: 'SET_ERROR'; msg: string }
  | { type: 'SET_FOUND'; appId: string }

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'SET_TAB': return { ...s, tab: a.tab, error: '', foundAppId: '' }
    case 'SET': return { ...s, [a.field]: a.value, error: '' }
    case 'SET_LOADING': return { ...s, loading: a.v }
    case 'SET_ERROR': return { ...s, error: a.msg, loading: false }
    case 'SET_FOUND': return { ...s, foundAppId: a.appId, loading: false }
    default: return s
  }
}

const init: State = {
  tab: 'appid', appId: '', mobile: '', name: '', mobileLookup: '', loading: false, error: '', foundAppId: '',
}

export default function LoginPage() {
  const router = useRouter()
  const [state, dispatch] = useReducer(reducer, init)

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
      if (!res.ok) {
        dispatch({ type: 'SET_ERROR', msg: data.error ?? 'Login failed' })
        return
      }
      router.push('/my-pass')
    } catch {
      dispatch({ type: 'SET_ERROR', msg: 'Network error. Please try again.' })
    } finally {
      dispatch({ type: 'SET_LOADING', v: false })
    }
  }

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    dispatch({ type: 'SET_LOADING', v: true })
    dispatch({ type: 'SET_ERROR', msg: '' })
    try {
      const res = await fetch('/api/auth/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: state.name.trim(), mobile: state.mobileLookup.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        dispatch({ type: 'SET_ERROR', msg: data.error ?? 'Not found' })
        return
      }
      dispatch({ type: 'SET_FOUND', appId: data.application_id })
      // Auto redirect after showing the App ID
      setTimeout(() => router.push('/my-pass'), 2000)
    } catch {
      dispatch({ type: 'SET_ERROR', msg: 'Network error. Please try again.' })
    } finally {
      dispatch({ type: 'SET_LOADING', v: false })
    }
  }

  const inp = 'w-full bg-white/5 border border-white/10 text-white placeholder-zinc-500 rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-500 transition-colors'

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse at center, #1a0a2e 0%, #0a0a0f 100%)' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 group mb-6">
            <span className="text-3xl">👑</span>
            <span className="font-bold text-xl shimmer">Miss Nellore 2026</span>
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

          {state.foundAppId && (
            <div className="bg-green-900/20 border border-green-700/40 rounded-xl p-4 mb-4 text-center">
              <div className="text-green-400 text-sm font-semibold mb-1">Registration Found!</div>
              <div className="text-white font-mono font-bold">{state.foundAppId}</div>
              <div className="text-zinc-400 text-xs mt-1">Redirecting to your pass...</div>
            </div>
          )}

          {state.tab === 'appid' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Application ID</label>
                <input type="text" value={state.appId} onChange={e => dispatch({ type: 'SET', field: 'appId', value: e.target.value })}
                  placeholder="MN2026-XXXXXX-XXXXXX" className={inp} autoCapitalize="characters" />
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
          ) : (
            <form onSubmit={handleLookup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Full Name (as registered)</label>
                <input type="text" value={state.name} onChange={e => dispatch({ type: 'SET', field: 'name', value: e.target.value })}
                  placeholder="Your full name" className={inp} />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Mobile Number</label>
                <input type="tel" value={state.mobileLookup} onChange={e => dispatch({ type: 'SET', field: 'mobileLookup', value: e.target.value })}
                  placeholder="e.g. 9876543210 or +91 98765 43210" inputMode="tel" className={inp} />
              </div>
              {state.error && <div className="bg-red-900/20 border border-red-700/50 text-red-400 rounded-lg px-4 py-3 text-sm">{state.error}</div>}
              <button type="submit" disabled={state.loading}
                className="w-full bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-bold py-3.5 rounded-xl disabled:opacity-60 hover:from-yellow-500 hover:to-yellow-300 transition-all">
                {state.loading ? 'Looking up...' : 'Find My Registration →'}
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
