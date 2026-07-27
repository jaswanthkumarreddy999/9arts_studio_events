'use client'

import { useState, useReducer, useEffect } from 'react'
import { SEAT_TIERS, type SeatTier } from '@/lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  full_name: string
  mobile: string
  gender: 'male' | 'female' | 'other' | ''
  seat_tier: SeatTier
}

interface TicketRow {
  full_name: string
  mobile: string
  gender: 'male' | 'female' | 'other' | ''
  seat_tier: SeatTier
}

interface GroupResult {
  application_id: string
  full_name: string
  amount: number
  seat_tier: string
}

type BookingMode = 'individual' | 'group'
type Step = 'details' | 'payment' | 'success'

interface State {
  step: Step
  form: FormData
  errors: Partial<Record<keyof FormData, string>>
  applicationId: string
  amount: number
  uploading: boolean
  screenshotFile: File | null
  utrNumber: string
  submitting: boolean
  paymentConfirmed: boolean
  submitError: string
  // group
  groupResults: GroupResult[]
  groupId: string
  totalAmount: number
}

type Action =
  | { type: 'SET_FIELD'; field: keyof FormData; value: string }
  | { type: 'SET_ERRORS'; errors: Partial<Record<keyof FormData, string>> }
  | { type: 'SET_STEP'; step: Step }
  | { type: 'SET_APP_ID'; applicationId: string; amount: number }
  | { type: 'SET_GROUP'; groupResults: GroupResult[]; groupId: string; totalAmount: number }
  | { type: 'SET_UPLOADING'; value: boolean }
  | { type: 'SET_SCREENSHOT'; file: File | null }
  | { type: 'SET_UTR'; value: string }
  | { type: 'SET_SUBMITTING'; value: boolean }
  | { type: 'SET_PAYMENT_CONFIRMED' }
  | { type: 'SET_SUBMIT_ERROR'; error: string }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, form: { ...state.form, [action.field]: action.value }, errors: { ...state.errors, [action.field]: undefined } }
    case 'SET_ERRORS': return { ...state, errors: action.errors }
    case 'SET_STEP': return { ...state, step: action.step }
    case 'SET_APP_ID': return { ...state, applicationId: action.applicationId, amount: action.amount, step: 'payment' }
    case 'SET_GROUP': return { ...state, groupResults: action.groupResults, groupId: action.groupId, totalAmount: action.totalAmount, step: 'payment' }
    case 'SET_UPLOADING': return { ...state, uploading: action.value }
    case 'SET_SCREENSHOT': return { ...state, screenshotFile: action.file }
    case 'SET_UTR': return { ...state, utrNumber: action.value }
    case 'SET_SUBMITTING': return { ...state, submitting: action.value }
    case 'SET_PAYMENT_CONFIRMED': return { ...state, paymentConfirmed: true, step: 'success' }
    case 'SET_SUBMIT_ERROR': return { ...state, submitError: action.error, submitting: false }
    default: return state
  }
}

const initialState: State = {
  step: 'details',
  form: { full_name: '', mobile: '', gender: '', seat_tier: 'gold' },
  errors: {}, applicationId: '', amount: 0,
  uploading: false, screenshotFile: null, utrNumber: '',
  submitting: false, paymentConfirmed: false, submitError: '',
  groupResults: [], groupId: '', totalAmount: 0,
}

function validate(form: FormData): Partial<Record<keyof FormData, string>> {
  const errors: Partial<Record<keyof FormData, string>> = {}
  if (!form.full_name.trim() || form.full_name.trim().length < 2) errors.full_name = 'Enter your full name (min 2 chars)'
  const digits = form.mobile.replace(/[\s\-().]/g, '').replace(/^\+91/, '').replace(/^91(?=\d{10}$)/, '').replace(/^0/, '')
  if (!/^[6-9]\d{9}$/.test(digits)) errors.mobile = 'Enter a valid Indian mobile number'
  if (!form.gender) errors.gender = 'Please select your gender'
  return errors
}

function validateTicket(t: TicketRow, i: number): string | null {
  if (!t.full_name.trim() || t.full_name.trim().length < 2) return `Person ${i + 1}: Enter full name`
  const digits = t.mobile.replace(/[\s\-().]/g, '').replace(/^\+91/, '').replace(/^91(?=\d{10}$)/, '').replace(/^0/, '')
  if (!/^[6-9]\d{9}$/.test(digits)) return `Person ${i + 1}: Enter a valid mobile number`
  if (!t.gender) return `Person ${i + 1}: Select gender`
  return null
}

function inputClass(hasError: boolean) {
  return `w-full bg-white/5 border ${hasError ? 'border-red-500' : 'border-white/10'} text-white placeholder-zinc-500 rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-500 transition-colors`
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-300 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RegistrationForm() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [mode, setMode] = useState<BookingMode>('individual')
  const [tickets, setTickets] = useState<TicketRow[]>([
    { full_name: '', mobile: '', gender: '', seat_tier: 'gold' },
    { full_name: '', mobile: '', gender: '', seat_tier: 'gold' },
  ])
  const [ticketErrors, setTicketErrors] = useState<string[]>([])
  const UPI_ID = process.env.NEXT_PUBLIC_UPI_ID ?? '9346039342@ibl'
  const [seatData, setSeatData] = useState<Record<string, { total: number; remaining: number; sold: number }>>({})

  useEffect(() => {
    fetch('/api/seats').then(r => r.json()).then(d => setSeatData(d.seats ?? {})).catch(() => {})
  }, [])

  // Individual submit
  async function handleDetailsSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errors = validate(state.form)
    if (Object.keys(errors).length > 0) { dispatch({ type: 'SET_ERRORS', errors }); return }
    dispatch({ type: 'SET_SUBMITTING', value: true })
    try {
      const res = await fetch('/api/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...state.form }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 409 && data.application_id) {
          dispatch({ type: 'SET_SUBMIT_ERROR', error: `ALREADY_REGISTERED:${data.application_id}` })
        } else {
          dispatch({ type: 'SET_SUBMIT_ERROR', error: data.error ?? 'Registration failed' })
        }
        return
      }
      dispatch({ type: 'SET_APP_ID', applicationId: data.application_id, amount: data.amount })
    } catch {
      dispatch({ type: 'SET_SUBMIT_ERROR', error: 'Network error. Please try again.' })
    } finally {
      dispatch({ type: 'SET_SUBMITTING', value: false })
    }
  }

  // Group submit
  async function handleGroupSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = tickets.map((t, i) => validateTicket(t, i)).filter(Boolean) as string[]
    if (errs.length > 0) { setTicketErrors(errs); return }
    setTicketErrors([])
    dispatch({ type: 'SET_SUBMITTING', value: true })
    try {
      const res = await fetch('/api/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickets }),
      })
      const data = await res.json()
      if (!res.ok) {
        dispatch({ type: 'SET_SUBMIT_ERROR', error: data.error ?? 'Registration failed' }); return
      }
      dispatch({ type: 'SET_GROUP', groupResults: data.tickets, groupId: data.group_id, totalAmount: data.totalAmount })
    } catch {
      dispatch({ type: 'SET_SUBMIT_ERROR', error: 'Network error. Please try again.' })
    } finally {
      dispatch({ type: 'SET_SUBMITTING', value: false })
    }
  }

  // Payment submit (individual + group)
  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!state.utrNumber.trim()) {
      dispatch({ type: 'SET_SUBMIT_ERROR', error: 'Please enter your UTR / Transaction ID' }); return
    }
    dispatch({ type: 'SET_SUBMITTING', value: true })
    dispatch({ type: 'SET_SUBMIT_ERROR', error: '' })
    try {
      let screenshotPath = ''
      if (state.screenshotFile) {
        dispatch({ type: 'SET_UPLOADING', value: true })
        const primaryId = state.applicationId || state.groupResults[0]?.application_id
        const fd = new FormData()
        fd.append('applicationId', primaryId)
        fd.append('file', state.screenshotFile)
        const uploadRes = await fetch('/api/payment/upload-url', { method: 'POST', body: fd })
        const uploadData = await uploadRes.json()
        dispatch({ type: 'SET_UPLOADING', value: false })
        if (!uploadRes.ok) throw new Error(uploadData.error ?? 'Upload failed')
        screenshotPath = uploadData.path
      }
      const isGroup = state.groupResults.length > 0
      const confirmRes = await fetch('/api/payment/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isGroup
          ? { applicationIds: state.groupResults.map(r => r.application_id), utrNumber: state.utrNumber, screenshotPath }
          : { applicationId: state.applicationId, utrNumber: state.utrNumber, screenshotPath }
        ),
      })
      if (!confirmRes.ok) { const d = await confirmRes.json(); throw new Error(d.error ?? 'Failed to submit payment') }
      dispatch({ type: 'SET_PAYMENT_CONFIRMED' })
    } catch (err: unknown) {
      dispatch({ type: 'SET_SUBMIT_ERROR', error: err instanceof Error ? err.message : 'Payment submission failed' })
    } finally {
      dispatch({ type: 'SET_SUBMITTING', value: false })
      dispatch({ type: 'SET_UPLOADING', value: false })
    }
  }

  if (state.step === 'success') {
    return <SuccessScreen
      applicationId={state.applicationId}
      name={state.form.full_name}
      tier={state.form.seat_tier}
      groupResults={state.groupResults}
    />
  }

  // Payment step (shared for individual + group)
  if (state.step === 'payment') {
    const isGroup = state.groupResults.length > 0
    const amount = isGroup ? state.totalAmount : state.amount
    const primaryTier = isGroup ? (state.groupResults[0]?.seat_tier as SeatTier ?? 'gold') : state.form.seat_tier
    return (
      <div className="max-w-2xl mx-auto">
        <PaymentStep
          isGroup={isGroup}
          groupResults={state.groupResults}
          applicationId={state.applicationId}
          amount={amount}
          tier={primaryTier}
          upiId={UPI_ID}
          utrNumber={state.utrNumber}
          screenshotFile={state.screenshotFile}
          uploading={state.uploading}
          submitting={state.submitting}
          submitError={state.submitError}
          onUtrChange={v => dispatch({ type: 'SET_UTR', value: v })}
          onFileChange={f => dispatch({ type: 'SET_SCREENSHOT', file: f })}
          onSubmit={handlePaymentSubmit}
        />
      </div>
    )
  }

  const live = seatData
  return (
    <div className="max-w-2xl mx-auto">
      {/* Mode toggle */}
      <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 mb-8">
        <button onClick={() => setMode('individual')}
          className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${mode === 'individual' ? 'bg-yellow-500 text-black' : 'text-zinc-400 hover:text-white'}`}>
          👤 Individual Booking
        </button>
        <button onClick={() => setMode('group')}
          className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${mode === 'group' ? 'bg-yellow-500 text-black' : 'text-zinc-400 hover:text-white'}`}>
          👨‍👩‍👧‍👦 Group Booking
        </button>
      </div>

      {/* ── INDIVIDUAL ── */}
      {mode === 'individual' && (
        <form onSubmit={handleDetailsSubmit} className="space-y-5">
          <PassSelector seatTier={state.form.seat_tier} seatData={live}
            onChange={v => dispatch({ type: 'SET_FIELD', field: 'seat_tier', value: v })} />
          <Field label="Full Name *" error={state.errors.full_name}>
            <input type="text" value={state.form.full_name}
              onChange={e => dispatch({ type: 'SET_FIELD', field: 'full_name', value: e.target.value })}
              placeholder="Enter your full name" className={inputClass(!!state.errors.full_name)} />
          </Field>
          <Field label="Mobile Number *" error={state.errors.mobile}>
            <input type="tel" value={state.form.mobile}
              onChange={e => dispatch({ type: 'SET_FIELD', field: 'mobile', value: e.target.value })}
              placeholder="e.g. 9876543210 or +91 98765 43210" inputMode="tel" className={inputClass(!!state.errors.mobile)} />
          </Field>
          <Field label="Gender *" error={state.errors.gender}>
            <select value={state.form.gender}
              onChange={e => dispatch({ type: 'SET_FIELD', field: 'gender', value: e.target.value })}
              className={inputClass(!!state.errors.gender) + ' appearance-none cursor-pointer bg-zinc-900 text-white'}
              style={{ colorScheme: 'dark' }}>
              <option value="" disabled className="bg-zinc-900 text-zinc-500">Select your gender</option>
              <option value="male" className="bg-zinc-900 text-white">Male</option>
              <option value="female" className="bg-zinc-900 text-white">Female</option>
              <option value="other" className="bg-zinc-900 text-white">Other</option>
            </select>
          </Field>
          {state.submitError && (
            state.submitError.startsWith('ALREADY_REGISTERED:') ? (
              <div className="bg-amber-900/20 border border-amber-700/50 rounded-xl px-4 py-4 text-sm space-y-3">
                <div className="text-amber-400 font-semibold">⚠️ Already registered.</div>
                <div className="font-mono font-bold text-white bg-black/40 rounded-lg px-4 py-2 text-center">
                  {state.submitError.replace('ALREADY_REGISTERED:', '')}
                </div>
                <a href="/login" className="block w-full text-center bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-2.5 rounded-xl transition-colors">Go to Login →</a>
              </div>
            ) : (
              <div className="bg-red-900/20 border border-red-700/50 text-red-400 rounded-lg px-4 py-3 text-sm">{state.submitError}</div>
            )
          )}
          <button type="submit" disabled={state.submitting}
            className="w-full bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-bold py-4 rounded-xl text-lg disabled:opacity-60 hover:from-yellow-500 hover:to-yellow-300 transition-all">
            {state.submitting ? 'Registering...' : 'Continue to Payment →'}
          </button>
        </form>
      )}

      {/* ── GROUP ── */}
      {mode === 'group' && (
        <GroupForm
          tickets={tickets}
          setTickets={setTickets}
          errors={ticketErrors}
          submitting={state.submitting}
          submitError={state.submitError}
          seatData={live}
          onSubmit={handleGroupSubmit}
        />
      )}
    </div>
  )
}

// ─── PassSelector ─────────────────────────────────────────────────────────────

function PassSelector({ seatTier, seatData, onChange }: {
  seatTier: SeatTier
  seatData: Record<string, { total: number; remaining: number; sold: number }>
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-300 mb-3">Select Your Pass</label>
      <div className="grid grid-cols-2 gap-3">
        {(Object.entries(SEAT_TIERS) as [SeatTier, typeof SEAT_TIERS[SeatTier]][]).map(([key, t]) => {
          const discount = Math.round((1 - t.price / t.originalPrice) * 100)
          const live = seatData[key]
          const remaining = live?.remaining ?? t.totalSeats
          const soldOut = remaining <= 0
          return (
            <label key={key}
              className={`relative cursor-pointer rounded-xl p-4 border-2 transition-all ${soldOut ? 'opacity-50 cursor-not-allowed border-white/10 bg-white/5' : seatTier === key ? 'border-yellow-500 bg-yellow-900/20' : 'border-white/10 bg-white/5 hover:border-yellow-700/50'}`}>
              <input type="radio" name="seat_tier" value={key} checked={seatTier === key} disabled={soldOut}
                onChange={() => !soldOut && onChange(key)} className="sr-only" />
              {!soldOut && <div className="absolute -top-2.5 -right-2.5 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{discount}% OFF</div>}
              {soldOut && <div className="absolute -top-2.5 -right-2.5 bg-zinc-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">SOLD OUT</div>}
              <div className="text-2xl mb-2">{t.badge}</div>
              <div className="font-bold text-white text-sm">{t.label}</div>
              <div className="text-xs text-zinc-400 mt-0.5">{t.subtitle}</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-yellow-400 font-bold text-lg">₹{t.price}</span>
                <span className="text-zinc-500 text-xs line-through">₹{t.originalPrice}</span>
              </div>
              <div className={`text-xs mt-1.5 ${remaining <= 20 && remaining > 0 ? 'text-red-400' : 'text-zinc-600'}`}>
                🎟️ {soldOut ? 'No seats left' : `${remaining} of ${t.totalSeats} left`}
              </div>
              {seatTier === key && !soldOut && (
                <div className="absolute top-2 left-2 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                </div>
              )}
            </label>
          )
        })}
      </div>
    </div>
  )
}

// ─── GroupForm ────────────────────────────────────────────────────────────────

function GenderSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full bg-zinc-900 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-500 appearance-none"
      style={{ colorScheme: 'dark' }}>
      <option value="" disabled className="bg-zinc-900 text-zinc-500">Gender</option>
      <option value="male" className="bg-zinc-900 text-white">Male</option>
      <option value="female" className="bg-zinc-900 text-white">Female</option>
      <option value="other" className="bg-zinc-900 text-white">Other</option>
    </select>
  )
}

function GroupForm({ tickets, setTickets, errors, submitting, submitError, seatData, onSubmit }: {
  tickets: TicketRow[]
  setTickets: (t: TicketRow[]) => void
  errors: string[]
  submitting: boolean
  submitError: string
  seatData: Record<string, { total: number; remaining: number; sold: number }>
  onSubmit: (e: React.FormEvent) => void
}) {
  function update(i: number, field: keyof TicketRow, value: string) {
    const next = [...tickets]
    next[i] = { ...next[i], [field]: value }
    // Auto-fill mobile for subsequent rows if empty
    if (field === 'mobile' && i === 0) {
      setTickets(next.map((t, idx) => idx > 0 && !t.mobile ? { ...t, mobile: value } : t))
      return
    }
    setTickets(next)
  }

  function addTicket() {
    const lastMobile = tickets[tickets.length - 1]?.mobile ?? ''
    setTickets([...tickets, { full_name: '', mobile: lastMobile, gender: '', seat_tier: 'gold' }])
  }

  function removeTicket(i: number) {
    if (tickets.length <= 2) return
    setTickets(tickets.filter((_, idx) => idx !== i))
  }

  const total = tickets.reduce((s, t) => s + (SEAT_TIERS[t.seat_tier]?.price ?? 0), 0)
  const inp = 'w-full bg-white/5 border border-white/10 text-white placeholder-zinc-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-500'

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="bg-blue-900/20 border border-blue-700/30 rounded-xl px-4 py-3 text-sm text-blue-300">
        💡 Family booking — each person gets their own Application ID and QR pass. One payment covers all.
      </div>

      {tickets.map((t, i) => (
        <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white font-semibold text-sm">Person {i + 1}</span>
            {tickets.length > 2 && (
              <button type="button" onClick={() => removeTicket(i)}
                className="text-red-400 hover:text-red-300 text-xs transition-colors">✕ Remove</button>
            )}
          </div>
          <input type="text" value={t.full_name} onChange={e => update(i, 'full_name', e.target.value)}
            placeholder="Full name *" className={inp} />
          <input type="tel" value={t.mobile} onChange={e => update(i, 'mobile', e.target.value)}
            placeholder="Mobile number *" inputMode="tel" className={inp} />
          <div className="grid grid-cols-2 gap-2">
            <GenderSelect value={t.gender} onChange={v => update(i, 'gender', v)} />
            <select value={t.seat_tier} onChange={e => update(i, 'seat_tier', e.target.value as SeatTier)}
              className="w-full bg-zinc-900 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-500 appearance-none"
              style={{ colorScheme: 'dark' }}>
              {Object.entries(SEAT_TIERS).map(([k, v]) => {
                const rem = seatData[k]?.remaining ?? v.totalSeats
                return <option key={k} value={k} disabled={rem <= 0} className="bg-zinc-900 text-white">
                  {v.badge} {v.label} — ₹{v.price}{rem <= 0 ? ' (sold out)' : ''}
                </option>
              })}
            </select>
          </div>
        </div>
      ))}

      <button type="button" onClick={addTicket}
        className="w-full border-2 border-dashed border-white/20 hover:border-yellow-700/50 text-zinc-400 hover:text-yellow-400 py-3 rounded-2xl text-sm font-medium transition-all">
        + Add Another Person
      </button>

      {/* Total */}
      <div className="bg-white/5 border border-yellow-900/30 rounded-xl px-4 py-3 flex items-center justify-between">
        <span className="text-zinc-400 text-sm">{tickets.length} tickets · Total</span>
        <span className="text-yellow-400 font-bold text-xl">₹{total.toLocaleString()}</span>
      </div>

      {errors.length > 0 && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-xl px-4 py-3 space-y-1">
          {errors.map((e, i) => <div key={i} className="text-red-400 text-xs">{e}</div>)}
        </div>
      )}
      {submitError && !submitError.startsWith('ALREADY_REGISTERED') && (
        <div className="bg-red-900/20 border border-red-700/50 text-red-400 rounded-xl px-4 py-3 text-sm whitespace-pre-line">{submitError}</div>
      )}

      <button type="submit" disabled={submitting}
        className="w-full bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-bold py-4 rounded-xl text-lg disabled:opacity-60 hover:from-yellow-500 hover:to-yellow-300 transition-all">
        {submitting ? 'Registering...' : `Continue to Payment — ₹${total.toLocaleString()} →`}
      </button>
    </form>
  )
}

// ─── PaymentStep ──────────────────────────────────────────────────────────────

function PaymentStep({ isGroup, groupResults, applicationId, amount, tier, upiId, utrNumber, screenshotFile, uploading, submitting, submitError, onUtrChange, onFileChange, onSubmit }: {
  isGroup: boolean; groupResults: GroupResult[]; applicationId: string
  amount: number; tier: SeatTier; upiId: string; utrNumber: string
  screenshotFile: File | null; uploading: boolean; submitting: boolean; submitError: string
  onUtrChange: (v: string) => void; onFileChange: (f: File | null) => void; onSubmit: (e: React.FormEvent) => void
}) {
  const t = SEAT_TIERS[tier]
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Application IDs */}
      {isGroup ? (
        <div className="bg-green-900/20 border border-green-700/40 rounded-xl p-4 space-y-2">
          <div className="text-green-400 text-xs uppercase tracking-wide font-semibold mb-2">Group Registration Successful! — Save all IDs</div>
          {groupResults.map(r => (
            <div key={r.application_id} className="flex items-center justify-between gap-2 bg-black/20 rounded-lg px-3 py-2">
              <div>
                <div className="text-white text-xs font-medium">{r.full_name}</div>
                <div className="text-green-400 font-mono text-xs">{r.application_id}</div>
              </div>
              <div className="text-zinc-400 text-xs">{SEAT_TIERS[r.seat_tier as SeatTier]?.badge} ₹{r.amount}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-green-900/20 border border-green-700/40 rounded-xl p-4">
          <div className="text-green-400 text-xs uppercase tracking-wide font-semibold mb-1">Registration Successful!</div>
          <div className="text-white font-bold text-lg">{applicationId}</div>
          <div className="text-zinc-400 text-xs mt-1">⚠️ Save your Application ID — you need it to log in later</div>
        </div>
      )}

      {/* Payment details */}
      <div className="bg-white/5 border border-yellow-900/30 rounded-xl p-6">
        <h3 className="text-yellow-400 font-semibold mb-4">Complete Your Payment</h3>
        {isGroup ? (
          <div className="space-y-1 mb-4">
            {groupResults.map(r => (
              <div key={r.application_id} className="flex justify-between text-sm">
                <span className="text-zinc-400 truncate mr-2">{r.full_name} ({SEAT_TIERS[r.seat_tier as SeatTier]?.label})</span>
                <span className="text-white shrink-0">₹{r.amount}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t border-white/10 mt-2">
              <span className="text-zinc-400 font-semibold">Total</span>
              <span className="text-yellow-400 font-bold text-xl">₹{amount}</span>
            </div>
          </div>
        ) : (
          <div className="mb-6 pb-4 border-b border-white/10">
            <div className="flex justify-between mb-2"><span className="text-zinc-400">Pass</span><span className="text-white">{t.badge} {t.label}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Amount</span><span className="text-yellow-400 font-bold text-xl">₹{amount}</span></div>
          </div>
        )}

        {/* QR + UPI */}
        <div className="flex flex-col items-center gap-3 mb-4">
          <div className="text-sm text-zinc-400">Scan to pay via PhonePe / any UPI app</div>
          <div className="bg-white p-3 rounded-2xl shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/payment-qr.png" alt="PhonePe QR Code" className="w-44 h-44" />
          </div>
          <div className="text-xs text-zinc-500">9 Arts Studio · Open PhonePe / GPay / Paytm and scan</div>
          <div className="inline-flex items-center gap-2 bg-black/40 border border-yellow-700/30 rounded-lg px-4 py-2">
            <span className="text-yellow-400 font-mono font-bold text-sm">{upiId}</span>
            <button type="button" onClick={() => navigator.clipboard.writeText(upiId)} className="text-zinc-500 hover:text-yellow-400 text-xs">Copy</button>
          </div>
          <div className="text-xs text-zinc-600">Open your UPI app → Scan QR or enter UPI ID manually</div>
        </div>
      </div>

      {/* Screenshot + UTR */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Upload Payment Screenshot <span className="text-zinc-500">(optional but recommended)</span></label>
          <label className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${screenshotFile ? 'border-green-600 bg-green-900/10' : 'border-white/10 hover:border-yellow-700/50 bg-white/5'}`}>
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e => onFileChange(e.target.files?.[0] ?? null)} />
            {screenshotFile ? (
              <div className="text-center"><div className="text-green-400 text-sm font-medium">{screenshotFile.name}</div><div className="text-zinc-500 text-xs">{(screenshotFile.size / 1024 / 1024).toFixed(1)} MB</div></div>
            ) : (
              <div className="text-center"><div className="text-3xl mb-1">📎</div><div className="text-zinc-400 text-sm">Click to upload screenshot</div></div>
            )}
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">UTR / Transaction ID *</label>
          <input type="text" value={utrNumber} onChange={e => onUtrChange(e.target.value)}
            placeholder="Enter UTR number from your UPI app"
            className="w-full bg-white/5 border border-white/10 text-white placeholder-zinc-500 rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-500 transition-colors" />
          {isGroup && <p className="text-zinc-500 text-xs mt-1">One UTR covers all {groupResults.length} registrations in this group.</p>}
        </div>
      </div>

      {submitError && <div className="bg-red-900/20 border border-red-700/50 text-red-400 rounded-lg px-4 py-3 text-sm">{submitError}</div>}

      <button type="submit" disabled={submitting || uploading}
        className="w-full bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-bold py-4 rounded-xl text-lg disabled:opacity-60 hover:from-yellow-500 hover:to-yellow-300 transition-all">
        {uploading ? 'Uploading...' : submitting ? 'Submitting...' : 'Submit Payment for Verification'}
      </button>
      <p className="text-zinc-600 text-xs text-center">Payment verified within 24 hours. QR pass issued after verification.</p>
    </form>
  )
}

// ─── SuccessScreen ────────────────────────────────────────────────────────────

function SuccessScreen({ applicationId, name, tier, groupResults }: {
  applicationId: string; name: string; tier: SeatTier; groupResults: GroupResult[]
}) {
  const isGroup = groupResults.length > 0
  return (
    <div className="text-center max-w-md mx-auto">
      <div className="text-6xl mb-6 float">🎉</div>
      <h3 className="text-2xl font-bold text-white mb-2">
        {isGroup ? `${groupResults.length} Tickets Registered!` : "You're Registered!"}
      </h3>
      <p className="text-zinc-400 mb-6">
        {isGroup ? 'Your group booking is submitted and payment is under review.' : `Thank you, ${name}. Your payment is under review.`}
      </p>

      <div className="bg-white/5 border border-yellow-900/30 rounded-2xl p-5 mb-6 text-left space-y-3">
        <div className="text-yellow-400 text-xs uppercase tracking-widest font-semibold mb-3">
          {isGroup ? 'Application IDs — Save all of these' : 'Your Registration Details'}
        </div>
        {isGroup ? (
          groupResults.map(r => (
            <div key={r.application_id} className="flex items-center justify-between gap-2 bg-black/20 rounded-lg px-3 py-2">
              <div>
                <div className="text-zinc-400 text-xs">{r.full_name}</div>
                <div className="text-white font-mono text-sm font-bold">{r.application_id}</div>
              </div>
              <span className="text-zinc-400 text-xs">{SEAT_TIERS[r.seat_tier as SeatTier]?.badge}</span>
            </div>
          ))
        ) : (
          <>
            <div className="flex justify-between"><span className="text-zinc-400 text-sm">Application ID</span><span className="text-white font-mono font-bold text-sm">{applicationId}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400 text-sm">Pass</span><span className="text-white text-sm">{SEAT_TIERS[tier].badge} {SEAT_TIERS[tier].label}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400 text-sm">Status</span><span className="text-yellow-400 text-sm">Payment Pending</span></div>
          </>
        )}
      </div>

      <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-4 mb-6 text-left">
        <div className="text-amber-400 text-sm font-semibold mb-1">⚠️ Save Your Application {isGroup ? 'IDs' : 'ID'}</div>
        <div className="text-zinc-400 text-sm">Each person needs their own ID to log in and get their QR pass after payment is verified.</div>
      </div>

      <a href="/login" className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-bold px-8 py-3 rounded-full hover:from-yellow-500 hover:to-yellow-300 transition-all">
        Check Pass Status →
      </a>
    </div>
  )
}
