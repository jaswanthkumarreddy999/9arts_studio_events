'use client'

import { useRef, useState, useEffect } from 'react'
import { type PassFieldPositions, type PassFieldPosition, type PassCustomField } from '@/lib/types'
import { nanoid } from '@/lib/nanoid'

// ─── Types ─────────────────────────────────────────────────────────────────────

type FieldKey = string  // built-in keys + dynamic custom_ keys

interface BuiltInMeta {
  label: string
  color: string
  textColor: string
  sampleText: string
  isQr?: boolean
  builtIn: true
}

const BUILT_IN_META: Record<string, BuiltInMeta> = {
  name:           { label: 'Name',       color: '#ffffff22', textColor: '#fff',    sampleText: 'Jaswanth Kumar', builtIn: true },
  application_id: { label: 'App ID',     color: '#facc1533', textColor: '#facc15', sampleText: '9AS2026-XXXX-YYYY', builtIn: true },
  mobile:         { label: 'Mobile',     color: '#ffffff22', textColor: '#fff',    sampleText: '9396755208', builtIn: true },
  gender:         { label: 'Gender',     color: '#ffffff22', textColor: '#fff',    sampleText: 'Male', builtIn: true },
  pass_type:      { label: 'Pass Type',  color: '#fbbf2433', textColor: '#fbbf24', sampleText: 'Elite Pass', builtIn: true },
  amount:         { label: 'Amount',     color: '#00000066', textColor: '#000',    sampleText: '₹599', builtIn: true },
  qr:             { label: 'QR Code',    color: '#ffffffff', textColor: '#000',    sampleText: '▦ QR', isQr: true, builtIn: true },
}

// Default built-in positions
export const DEFAULT_POSITIONS: PassFieldPositions = {
  name:           { top: 21.5, left: 52 },
  application_id: { top: 38,   left: 45 },
  mobile:         { top: 48.5, left: 55 },
  gender:         { top: 59.2, left: 55 },
  pass_type:      { top: 69.5, left: 55 },
  amount:         { top: 86,   left: 77 },
  qr:             { top: 30,   left: 70.2, width: 23.4, height: 33 },
}

const DEFAULT_FONT_SIZE: Record<string, number> = {
  name: 28, application_id: 26, mobile: 28, gender: 28, pass_type: 28, amount: 30,
}

function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v))
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function PassFieldEditor({
  templateUrl,
  positions: positionsProp,
  customFields: customFieldsProp,
  onPositionsChange,
  onCustomFieldsChange,
}: {
  templateUrl: string
  positions: PassFieldPositions
  customFields: PassCustomField[]
  onPositionsChange: (p: PassFieldPositions) => void
  onCustomFieldsChange: (f: PassCustomField[]) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState<FieldKey | null>(null)
  const [addingField, setAddingField] = useState(false)
  const [newFieldLabel, setNewFieldLabel] = useState('')
  const [newFieldSource, setNewFieldSource] = useState<'static' | 'extra_data'>('static')
  const [newFieldText, setNewFieldText] = useState('')
  const [newFieldExtraKey, setNewFieldExtraKey] = useState('')
  const [newFieldColor, setNewFieldColor] = useState('#ffffff')

  // ── Use refs so drag callbacks always see current values ───────────────────
  const positionsRef = useRef<PassFieldPositions>({ ...DEFAULT_POSITIONS, ...positionsProp })
  const draggingRef  = useRef<FieldKey | null>(null)
  const dragOffsetRef = useRef({ x: 0, y: 0 })

  // Keep ref in sync with prop (but DON'T re-render from the ref)
  const positions: PassFieldPositions = { ...DEFAULT_POSITIONS, ...positionsProp }
  useEffect(() => { positionsRef.current = positions }, [positions])  // eslint-disable-line react-hooks/exhaustive-deps

  const customFields = customFieldsProp ?? []

  // ── All field keys (built-in + custom) ─────────────────────────────────────
  const allKeys = [...Object.keys(BUILT_IN_META), ...customFields.map(f => f.id)]

  // ── Convert mouse/touch → % inside container ───────────────────────────────
  function eventToPercent(clientX: number, clientY: number) {
    const el = containerRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    return {
      top:  clamp(((clientY - rect.top)  / rect.height) * 100),
      left: clamp(((clientX - rect.left) / rect.width)  * 100),
    }
  }

  // ── Update a single field ──────────────────────────────────────────────────
  function updateField(key: FieldKey, patch: Partial<PassFieldPosition & { width?: number; height?: number }>) {
    const cur = (positionsRef.current[key] ?? { top: 50, left: 50 }) as PassFieldPosition & { width?: number; height?: number }
    const next = { ...positionsRef.current, [key]: { ...cur, ...patch } }
    positionsRef.current = next
    onPositionsChange(next)
  }

  // ── Global mouse move handler (arrow function so we can removeEventListener) ──
  const onGlobalMouseMove = useRef((e: MouseEvent) => {
    const key = draggingRef.current
    if (!key) return
    const pct = eventToPercent(e.clientX, e.clientY)
    if (!pct) return
    const cur = (positionsRef.current[key] ?? { top: 50, left: 50 }) as PassFieldPosition & { width?: number; height?: number }
    const next = {
      ...positionsRef.current,
      [key]: {
        ...cur,
        top:  clamp(pct.top  - dragOffsetRef.current.y),
        left: clamp(pct.left - dragOffsetRef.current.x),
      },
    }
    positionsRef.current = next
    onPositionsChange(next)
  })

  const onGlobalMouseUp = useRef(() => {
    draggingRef.current = null
    window.removeEventListener('mousemove', onGlobalMouseMove.current)
    window.removeEventListener('mouseup', onGlobalMouseUp.current)
  })

  function startDrag(e: React.MouseEvent, key: FieldKey) {
    e.preventDefault()
    e.stopPropagation()
    draggingRef.current = key
    setSelected(key)
    const pct = eventToPercent(e.clientX, e.clientY)
    const cur = positionsRef.current[key] ?? { top: 50, left: 50 }
    if (pct) {
      dragOffsetRef.current = {
        x: pct.left - cur.left,
        y: pct.top  - cur.top,
      }
    }
    window.addEventListener('mousemove', onGlobalMouseMove.current)
    window.addEventListener('mouseup', onGlobalMouseUp.current)
  }

  // ── Click container to place selected field ────────────────────────────────
  function onContainerClick(e: React.MouseEvent) {
    if (draggingRef.current || !selected) return
    const pct = eventToPercent(e.clientX, e.clientY)
    if (!pct) return
    updateField(selected, pct)
  }

  // ── Arrow key nudge (1% per press, 0.1% with shift) ───────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!selected) return
      if (!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) return
      // Don't steal input focus
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      e.preventDefault()
      const step = e.shiftKey ? 0.1 : 0.5
      const cur = positionsRef.current[selected] ?? { top: 50, left: 50 }
      const patch: Partial<PassFieldPosition> = {}
      if (e.key === 'ArrowUp')    patch.top  = clamp(cur.top  - step)
      if (e.key === 'ArrowDown')  patch.top  = clamp(cur.top  + step)
      if (e.key === 'ArrowLeft')  patch.left = clamp(cur.left - step)
      if (e.key === 'ArrowRight') patch.left = clamp(cur.left + step)
      updateField(selected, patch)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selected]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Add custom field ───────────────────────────────────────────────────────
  function addCustomField() {
    if (!newFieldLabel.trim()) return
    const id = `custom_${nanoid(6)}`
    const newF: PassCustomField = {
      id,
      label: newFieldLabel.trim(),
      source: newFieldSource,
      staticText: newFieldSource === 'static' ? newFieldText : undefined,
      extraDataKey: newFieldSource === 'extra_data' ? newFieldExtraKey : undefined,
      color: newFieldColor,
    }
    onCustomFieldsChange([...customFields, newF])
    // Place it at a default position
    updateField(id, { top: 50, left: 50, fontSize: 28, maxWidth: 34 })
    setSelected(id)
    setAddingField(false)
    setNewFieldLabel('')
    setNewFieldText('')
    setNewFieldExtraKey('')
    setNewFieldColor('#ffffff')
  }

  function removeCustomField(id: string) {
    onCustomFieldsChange(customFields.filter(f => f.id !== id))
    const next = { ...positionsRef.current }
    delete next[id]
    positionsRef.current = next
    onPositionsChange(next)
    if (selected === id) setSelected(null)
  }

  // ── Reset ──────────────────────────────────────────────────────────────────
  function resetAll() {
    positionsRef.current = { ...DEFAULT_POSITIONS }
    onPositionsChange({ ...DEFAULT_POSITIONS })
    setSelected(null)
  }

  // ── Selected field data ────────────────────────────────────────────────────
  const sel = selected ? (positions[selected] as PassFieldPosition & { width?: number; height?: number } | undefined) : null
  const selIsQr = selected === 'qr'
  const selIsCustom = selected?.startsWith('custom_') ?? false
  const selCustom = selIsCustom ? customFields.find(f => f.id === selected) : null
  const selBuiltIn = selected && BUILT_IN_META[selected] ? BUILT_IN_META[selected] : null

  const inp = 'w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-yellow-500 font-mono'

  return (
    <div className="space-y-3">
      {/* Instructions */}
      <div className="flex items-start gap-2 bg-blue-900/20 border border-blue-700/30 rounded-xl px-3 py-2.5 text-xs text-blue-300">
        <span className="shrink-0 mt-0.5">💡</span>
        <span><strong>Drag</strong> any label to reposition · <strong>Click</strong> on canvas to snap · <strong>Arrow keys</strong> (0.5%) or <strong>Shift+Arrow</strong> (0.1%) for fine-tuning · <strong>Save All</strong> to persist.</span>
      </div>

      {/* Field pills */}
      <div className="flex flex-wrap gap-2">
        {/* Built-in fields */}
        {Object.entries(BUILT_IN_META).map(([key, m]) => {
          const isSelected = selected === key
          return (
            <button key={key} type="button"
              onClick={() => setSelected(isSelected ? null : key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${isSelected ? 'border-white/60 ring-2 ring-white/20 scale-105' : 'border-white/20 hover:border-white/40'}`}
              style={{ background: m.color, color: m.textColor }}>
              {m.label}{isSelected && ' ✓'}
            </button>
          )
        })}

        {/* Custom fields */}
        {customFields.map(f => {
          const isSelected = selected === f.id
          return (
            <button key={f.id} type="button"
              onClick={() => setSelected(isSelected ? null : f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${isSelected ? 'border-white/60 ring-2 ring-white/20 scale-105' : 'border-white/20 hover:border-white/40'}`}
              style={{ background: '#ffffff22', color: f.color }}>
              ✚ {f.label}{isSelected && ' ✓'}
            </button>
          )
        })}

        <div className="flex gap-2 ml-auto">
          <button type="button" onClick={() => setAddingField(v => !v)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-green-700/40 text-green-400 hover:bg-green-900/20 transition-all">
            + Add Field
          </button>
          <button type="button" onClick={resetAll}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-700/40 text-red-400 hover:bg-red-900/20 transition-all">
            Reset
          </button>
        </div>
      </div>

      {/* Add field form */}
      {addingField && (
        <div className="bg-white/5 border border-green-700/30 rounded-xl p-4 space-y-3">
          <div className="text-xs text-green-400 font-semibold uppercase tracking-wide">New Custom Text Field</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Label (admin display name)</label>
              <input value={newFieldLabel} onChange={e => setNewFieldLabel(e.target.value)}
                placeholder="e.g. School Name" className={inp} />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Text color</label>
              <div className="flex gap-2">
                <input type="color" value={newFieldColor} onChange={e => setNewFieldColor(e.target.value)}
                  className="w-10 h-9 rounded-lg border border-white/10 bg-white/5 cursor-pointer p-0.5" />
                <input value={newFieldColor} onChange={e => setNewFieldColor(e.target.value)}
                  placeholder="#ffffff" className={inp} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Source</label>
            <div className="flex gap-3">
              {(['static', 'extra_data'] as const).map(s => (
                <label key={s} className="flex items-center gap-1.5 cursor-pointer text-xs text-zinc-300">
                  <input type="radio" checked={newFieldSource === s} onChange={() => setNewFieldSource(s)}
                    className="accent-yellow-500" />
                  {s === 'static' ? 'Static text' : 'From registration data (extra_data)'}
                </label>
              ))}
            </div>
          </div>

          {newFieldSource === 'static' ? (
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Text to display</label>
              <input value={newFieldText} onChange={e => setNewFieldText(e.target.value)}
                placeholder="e.g. VIP Access" className={inp} />
            </div>
          ) : (
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Extra data key (matches custom registration field ID)</label>
              <input value={newFieldExtraKey} onChange={e => setNewFieldExtraKey(e.target.value)}
                placeholder="e.g. school_name" className={inp} />
              <p className="text-zinc-600 text-xs mt-1">Must match the ID of a custom registration field so the value is pulled from the attendee's response.</p>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setAddingField(false)}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white border border-white/10 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="button" onClick={addCustomField} disabled={!newFieldLabel.trim()}
              className="px-4 py-1.5 text-xs font-semibold text-black bg-green-400 hover:bg-green-300 rounded-lg disabled:opacity-40 transition-colors">
              Add & Place
            </button>
          </div>
        </div>
      )}

      {/* Live preview */}
      <div
        ref={containerRef}
        className={`relative w-full overflow-hidden rounded-xl border bg-black/40 select-none ${selected ? 'cursor-crosshair border-white/30' : 'border-white/10'}`}
        style={{ aspectRatio: '1536/1024' }}
        onClick={onContainerClick}
      >
        {/* Template image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={templateUrl} alt="template"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none"
          draggable={false} />

        {/* Built-in field overlays */}
        {allKeys.map(key => {
          const pos = positions[key]
          if (!pos) return null
          const isSelected = selected === key
          const isQr = key === 'qr'
          const builtIn = BUILT_IN_META[key]
          const custom = customFields.find(f => f.id === key)
          const label = builtIn?.label ?? custom?.label ?? key
          const sampleText = builtIn?.sampleText ?? custom?.staticText ?? custom?.extraDataKey ?? label
          const textColor = builtIn?.textColor ?? custom?.color ?? '#fff'
          const bgColor   = builtIn?.color ?? '#ffffff22'

          if (isQr) {
            const qp = pos as PassFieldPositions['qr']
            return (
              <div key={key}
                className={`absolute flex items-center justify-center text-center font-bold cursor-grab active:cursor-grabbing ${isSelected ? 'ring-2 ring-yellow-400' : 'ring-1 ring-white/40'}`}
                style={{
                  top: `${qp.top}%`, left: `${qp.left}%`,
                  width: `${qp.width}%`, height: `${qp.height}%`,
                  background: 'rgba(255,255,255,0.15)',
                  fontSize: 'clamp(6px,1.2vw,14px)', color: '#fff',
                  border: `2px dashed ${isSelected ? '#facc15' : 'rgba(255,255,255,0.5)'}`,
                  zIndex: isSelected ? 20 : 10,
                }}
                onMouseDown={e => startDrag(e, key)}
                onClick={e => { e.stopPropagation(); setSelected(isSelected ? null : key) }}>
                ▦ QR
              </div>
            )
          }

          const fs = pos.fontSize ?? (DEFAULT_FONT_SIZE[key] ?? 28)
          const mw = pos.maxWidth ?? 34

          return (
            <div key={key}
              className={`absolute cursor-grab active:cursor-grabbing font-semibold ${isSelected ? 'ring-2 ring-yellow-400 rounded' : ''}`}
              style={{
                top: `${pos.top}%`, left: `${pos.left}%`,
                color: textColor,
                // No background — just a faint outline so position matches user pass exactly
                background: isSelected ? 'rgba(250,204,21,0.15)' : 'rgba(0,0,0,0.35)',
                fontSize: `clamp(4px, ${(fs / 1536 * 100).toFixed(3)}vw, ${fs}px)`,
                maxWidth: `${mw}%`,
                padding: '1px 3px', borderRadius: 3,
                border: isSelected ? '1px solid #facc15' : '1px solid rgba(255,255,255,0.2)',
                zIndex: isSelected ? 20 : 10,
                // NO translateY — matches the user pass rendering exactly
                lineHeight: 1.25,
                whiteSpace: 'nowrap',
              }}
              onMouseDown={e => startDrag(e, key)}
              onClick={e => { e.stopPropagation(); setSelected(isSelected ? null : key) }}>
              {sampleText}
            </div>
          )
        })}

        {/* Live position tooltip */}
        {sel && selected && (
          <div className="absolute bottom-2 left-2 bg-black/80 text-white text-xs px-2 py-1 rounded-lg font-mono pointer-events-none z-30">
            {selected}: top {sel.top.toFixed(1)}% · left {sel.left.toFixed(1)}%
            {selIsQr && 'width' in sel ? ` · ${(sel as PassFieldPositions['qr']).width.toFixed(1)}% × ${(sel as PassFieldPositions['qr']).height.toFixed(1)}%` : ''}
          </div>
        )}
        {!selected && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-zinc-400 text-xs px-2 py-1 rounded-lg pointer-events-none">
            Select a field to reposition
          </div>
        )}
      </div>

      {/* Selected field controls */}
      {selected && sel && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300 font-semibold uppercase tracking-wide">
              {selBuiltIn?.label ?? selCustom?.label ?? selected}
            </span>
            {selIsCustom && (
              <button type="button" onClick={() => removeCustomField(selected)}
                className="text-xs text-red-400 hover:text-red-300 border border-red-700/30 px-2 py-0.5 rounded-lg transition-colors">
                Remove
              </button>
            )}
          </div>

          {/* Position + arrows */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Top (%)</label>
              <div className="flex gap-1">
                <button type="button" onClick={() => updateField(selected, { top: clamp(sel.top - 0.5) })}
                  className="px-2 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs transition-colors">▲</button>
                <input type="number" min={0} max={100} step={0.5} value={sel.top.toFixed(1)}
                  onChange={e => updateField(selected, { top: clamp(parseFloat(e.target.value) || 0) })}
                  className={inp + ' flex-1 min-w-0'} />
                <button type="button" onClick={() => updateField(selected, { top: clamp(sel.top + 0.5) })}
                  className="px-2 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs transition-colors">▼</button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Left (%)</label>
              <div className="flex gap-1">
                <button type="button" onClick={() => updateField(selected, { left: clamp(sel.left - 0.5) })}
                  className="px-2 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs transition-colors">◀</button>
                <input type="number" min={0} max={100} step={0.5} value={sel.left.toFixed(1)}
                  onChange={e => updateField(selected, { left: clamp(parseFloat(e.target.value) || 0) })}
                  className={inp + ' flex-1 min-w-0'} />
                <button type="button" onClick={() => updateField(selected, { left: clamp(sel.left + 0.5) })}
                  className="px-2 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs transition-colors">▶</button>
              </div>
            </div>
          </div>

          {/* Font size + max width (not for QR) */}
          {!selIsQr && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Font size (px on 1536px canvas)</label>
                <input type="number" min={8} max={120} step={1}
                  value={sel.fontSize ?? (DEFAULT_FONT_SIZE[selected] ?? 28)}
                  onChange={e => updateField(selected, { fontSize: Math.max(8, parseInt(e.target.value) || 28) })}
                  className={inp} />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Max width (%)</label>
                <input type="number" min={5} max={90} step={1}
                  value={sel.maxWidth ?? 34}
                  onChange={e => updateField(selected, { maxWidth: clamp(parseInt(e.target.value) || 34, 5, 90) })}
                  className={inp} />
              </div>
            </div>
          )}

          {/* QR size controls */}
          {selIsQr && 'width' in sel && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">QR width (%)</label>
                <input type="number" min={5} max={50} step={0.5}
                  value={(sel as PassFieldPositions['qr']).width.toFixed(1)}
                  onChange={e => updateField(selected, { width: clamp(parseFloat(e.target.value) || 23.4, 5, 50) })}
                  className={inp} />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">QR height (%)</label>
                <input type="number" min={5} max={60} step={0.5}
                  value={(sel as PassFieldPositions['qr']).height.toFixed(1)}
                  onChange={e => updateField(selected, { height: clamp(parseFloat(e.target.value) || 33, 5, 60) })}
                  className={inp} />
              </div>
            </div>
          )}

          {/* Custom field text/color edit */}
          {selIsCustom && selCustom && (
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-white/10">
              {selCustom.source === 'static' ? (
                <div className="col-span-2">
                  <label className="block text-xs text-zinc-500 mb-1">Static text</label>
                  <input value={selCustom.staticText ?? ''} onChange={e => onCustomFieldsChange(
                    customFields.map(f => f.id === selected ? { ...f, staticText: e.target.value } : f)
                  )} className={inp} />
                </div>
              ) : (
                <div className="col-span-2">
                  <label className="block text-xs text-zinc-500 mb-1">Extra data key</label>
                  <input value={selCustom.extraDataKey ?? ''} onChange={e => onCustomFieldsChange(
                    customFields.map(f => f.id === selected ? { ...f, extraDataKey: e.target.value } : f)
                  )} placeholder="e.g. school_name" className={inp} />
                </div>
              )}
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Label</label>
                <input value={selCustom.label} onChange={e => onCustomFieldsChange(
                  customFields.map(f => f.id === selected ? { ...f, label: e.target.value } : f)
                )} className={inp} />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Text color</label>
                <div className="flex gap-2">
                  <input type="color" value={selCustom.color} onChange={e => onCustomFieldsChange(
                    customFields.map(f => f.id === selected ? { ...f, color: e.target.value } : f)
                  )} className="w-10 h-9 rounded-lg border border-white/10 bg-white/5 cursor-pointer p-0.5" />
                  <input value={selCustom.color} onChange={e => onCustomFieldsChange(
                    customFields.map(f => f.id === selected ? { ...f, color: e.target.value } : f)
                  )} className={inp} />
                </div>
              </div>
            </div>
          )}

          <p className="text-zinc-600 text-xs">Arrow keys: 0.5% · Shift+Arrow: 0.1%</p>
        </div>
      )}

      {/* Position summary */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-3">
        <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wide mb-2">All fields</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs font-mono">
          {allKeys.map(key => {
            const pos = positions[key]
            if (!pos) return null
            const builtIn = BUILT_IN_META[key]
            const custom  = customFields.find(f => f.id === key)
            const label   = builtIn?.label ?? custom?.label ?? key
            const isQr    = key === 'qr'
            const qp      = pos as PassFieldPositions['qr']
            return (
              <button key={key} type="button"
                onClick={() => setSelected(selected === key ? null : key)}
                className={`flex items-baseline gap-2 text-left px-2 py-0.5 rounded transition-colors ${selected === key ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-zinc-400'}`}>
                <span className="text-zinc-300 w-24 shrink-0 truncate">{label}</span>
                <span className="text-zinc-500 text-xs">
                  {pos.top.toFixed(1)}% / {pos.left.toFixed(1)}%
                  {isQr && 'width' in pos ? ` · ${qp.width.toFixed(1)}×${qp.height.toFixed(1)}%` : ''}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
