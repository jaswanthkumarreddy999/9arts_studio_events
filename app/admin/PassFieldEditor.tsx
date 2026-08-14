'use client'

import { useRef, useState, useCallback } from 'react'
import { type PassFieldPositions, type PassFieldPosition } from '@/lib/types'

// ─── Field metadata ───────────────────────────────────────────────────────────

type FieldKey = keyof PassFieldPositions

interface FieldMeta {
  label: string
  color: string       // pill background
  textColor: string
  sampleText: string  // shown in preview overlay
  isQr?: boolean      // QR box is sized, not just a point
}

const FIELD_META: Record<FieldKey, FieldMeta> = {
  name:           { label: 'Name',           color: '#ffffff22', textColor: '#fff',    sampleText: 'Jaswanth Kumar' },
  application_id: { label: 'App ID',         color: '#facc1533', textColor: '#facc15', sampleText: '9AS2026-XXXX-YYYY' },
  mobile:         { label: 'Mobile',         color: '#ffffff22', textColor: '#fff',    sampleText: '9396755208' },
  gender:         { label: 'Gender',         color: '#ffffff22', textColor: '#fff',    sampleText: 'Male' },
  pass_type:      { label: 'Pass Type',      color: '#fbbf2433', textColor: '#fbbf24', sampleText: 'Elite Pass' },
  amount:         { label: 'Amount',         color: '#00000066', textColor: '#000',    sampleText: '₹599' },
  qr:             { label: 'QR Code',        color: '#ffffffff', textColor: '#000',    sampleText: '▦ QR', isQr: true },
}

// ─── Default positions (mirror DEFAULT_EVENT_SETTINGS) ───────────────────────

export const DEFAULT_POSITIONS: PassFieldPositions = {
  name:           { top: 21.5, left: 52 },
  application_id: { top: 38,   left: 45 },
  mobile:         { top: 48.5, left: 55 },
  gender:         { top: 59.2, left: 55 },
  pass_type:      { top: 69.5, left: 55 },
  amount:         { top: 86,   left: 77 },
  qr:             { top: 30,   left: 70.2, width: 23.4, height: 33 },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PassFieldEditor({
  templateUrl,
  positions: positionsProp,
  onChange,
}: {
  templateUrl: string
  positions: PassFieldPositions
  onChange: (p: PassFieldPositions) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState<FieldKey | null>(null)
  const [dragging, setDragging] = useState<FieldKey | null>(null)
  const dragOffset = useRef({ x: 0, y: 0 })

  // Merge with defaults so any missing keys are filled in
  const positions: PassFieldPositions = { ...DEFAULT_POSITIONS, ...positionsProp }

  // ── helper: clamp to [0, 100] ──────────────────────────────────────────────
  function clamp(v: number, min = 0, max = 100) {
    return Math.max(min, Math.min(max, v))
  }

  // ── convert mouse event → % position inside container ─────────────────────
  function eventToPercent(e: React.MouseEvent | MouseEvent) {
    const el = containerRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    return {
      top:  clamp(((e.clientY - rect.top)  / rect.height) * 100),
      left: clamp(((e.clientX - rect.left) / rect.width)  * 100),
    }
  }

  // ── update a single field ──────────────────────────────────────────────────
  function updateField(key: FieldKey, patch: Partial<PassFieldPosition & { width?: number; height?: number }>) {
    const cur = positions[key] as PassFieldPosition & { width?: number; height?: number }
    onChange({ ...positions, [key]: { ...cur, ...patch } })
  }

  // ── drag handlers ──────────────────────────────────────────────────────────
  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return
    const pct = eventToPercent(e as unknown as React.MouseEvent)
    if (!pct) return
    updateField(dragging, {
      top:  clamp(pct.top  - dragOffset.current.y),
      left: clamp(pct.left - dragOffset.current.x),
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, positions])

  const onMouseUp = useCallback(() => {
    setDragging(null)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onMouseMove])

  function startDrag(e: React.MouseEvent, key: FieldKey) {
    e.preventDefault()
    e.stopPropagation()
    setDragging(key)
    setSelected(key)
    const pct = eventToPercent(e)
    if (pct) {
      dragOffset.current = {
        x: pct.left - positions[key].left,
        y: pct.top  - positions[key].top,
      }
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  // ── click on container to place selected field ─────────────────────────────
  function onContainerClick(e: React.MouseEvent) {
    if (dragging || !selected) return
    const pct = eventToPercent(e)
    if (!pct) return
    updateField(selected, pct)
  }

  // ── reset to defaults ──────────────────────────────────────────────────────
  function resetAll() {
    onChange({ ...DEFAULT_POSITIONS })
    setSelected(null)
  }

  const sel = selected ? positions[selected] : null
  const selMeta = selected ? FIELD_META[selected] : null

  return (
    <div className="space-y-3">
      {/* Instructions */}
      <div className="flex items-start gap-2 bg-blue-900/20 border border-blue-700/30 rounded-xl px-3 py-2.5 text-xs text-blue-300">
        <span className="shrink-0 mt-0.5">💡</span>
        <span>Click a field pill to select it, then click anywhere on the preview to place it — or drag it directly. Changes are saved when you click <strong>Save All</strong>.</span>
      </div>

      {/* Field pills — click to select */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(FIELD_META) as FieldKey[]).map(key => {
          const m = FIELD_META[key]
          const isSelected = selected === key
          return (
            <button key={key} type="button"
              onClick={() => setSelected(isSelected ? null : key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${isSelected ? 'border-white/60 ring-2 ring-white/30 scale-105' : 'border-white/20 hover:border-white/40'}`}
              style={{ background: m.color, color: m.textColor }}>
              {m.label}
              {isSelected && ' ✓'}
            </button>
          )
        })}
        <button type="button" onClick={resetAll}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-700/40 text-red-400 hover:bg-red-900/20 transition-all ml-auto">
          Reset all
        </button>
      </div>

      {/* Live preview — drag or click to position */}
      <div
        ref={containerRef}
        className={`relative w-full overflow-hidden rounded-xl border bg-black/40 select-none ${selected ? 'cursor-crosshair border-white/30' : 'border-white/10'}`}
        style={{ aspectRatio: '1536/1024' }}
        onClick={onContainerClick}
      >
        {/* Template image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={templateUrl || '/ticket-template.png'}
          alt="template"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none"
          draggable={false}
        />

        {/* Overlay for each field */}
        {(Object.keys(FIELD_META) as FieldKey[]).map(key => {
          const m = FIELD_META[key]
          const pos = positions[key]
          const isQr = m.isQr
          const isSelected = selected === key

          if (isQr) {
            const qp = pos as PassFieldPositions['qr']
            return (
              <div key={key}
                className={`absolute flex items-center justify-center text-center font-bold cursor-grab active:cursor-grabbing transition-all ${isSelected ? 'ring-2 ring-yellow-400' : 'ring-1 ring-white/40'}`}
                style={{
                  top: `${qp.top}%`,
                  left: `${qp.left}%`,
                  width: `${qp.width}%`,
                  height: `${qp.height}%`,
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(2px)',
                  fontSize: 'clamp(6px, 1.2vw, 14px)',
                  color: '#fff',
                  border: '2px dashed rgba(255,255,255,0.5)',
                  zIndex: isSelected ? 20 : 10,
                }}
                onMouseDown={e => startDrag(e, key)}
                onClick={e => { e.stopPropagation(); setSelected(isSelected ? null : key) }}
              >
                ▦ QR
              </div>
            )
          }

          return (
            <div key={key}
              className={`absolute cursor-grab active:cursor-grabbing whitespace-nowrap font-semibold transition-all ${isSelected ? 'ring-2 ring-yellow-400 rounded' : ''}`}
              style={{
                top: `${pos.top}%`,
                left: `${pos.left}%`,
                background: m.color,
                color: m.textColor,
                fontSize: 'clamp(5px, 0.85vw, 12px)',
                padding: '1px 4px',
                borderRadius: 3,
                border: isSelected ? '1px solid rgba(255,255,255,0.8)' : '1px solid rgba(255,255,255,0.3)',
                zIndex: isSelected ? 20 : 10,
                transform: 'translateY(-50%)',
              }}
              onMouseDown={e => startDrag(e, key)}
              onClick={e => { e.stopPropagation(); setSelected(isSelected ? null : key) }}
            >
              {m.sampleText}
            </div>
          )
        })}

        {/* Selected field tooltip */}
        {sel && selMeta && (
          <div className="absolute bottom-2 left-2 bg-black/80 text-white text-xs px-2 py-1 rounded-lg font-mono pointer-events-none z-30">
            {selMeta.label}: top {sel.top.toFixed(1)}% · left {sel.left.toFixed(1)}%
            {'width' in sel ? ` · ${(sel as PassFieldPositions['qr']).width.toFixed(1)}% × ${(sel as PassFieldPositions['qr']).height.toFixed(1)}%` : ''}
          </div>
        )}

        {/* Empty state hint */}
        {!selected && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-zinc-400 text-xs px-2 py-1 rounded-lg pointer-events-none">
            Select a field pill above to reposition
          </div>
        )}
      </div>

      {/* QR size controls */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">QR box width (%)</label>
          <input type="number" min={5} max={50} step={0.5}
            value={positions.qr.width.toFixed(1)}
            onChange={e => updateField('qr', { width: clamp(parseFloat(e.target.value) || 23.4, 5, 50) })}
            className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-yellow-500 font-mono" />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">QR box height (%)</label>
          <input type="number" min={5} max={60} step={0.5}
            value={positions.qr.height.toFixed(1)}
            onChange={e => updateField('qr', { height: clamp(parseFloat(e.target.value) || 33, 5, 60) })}
            className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-yellow-500 font-mono" />
        </div>
      </div>

      {/* Numeric fine-tune for selected field */}
      {selected && sel && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
          <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wide">{selMeta?.label} — fine-tune</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Top (%)</label>
              <input type="number" min={0} max={100} step={0.5}
                value={sel.top.toFixed(1)}
                onChange={e => updateField(selected, { top: clamp(parseFloat(e.target.value) || 0) })}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-yellow-500 font-mono" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Left (%)</label>
              <input type="number" min={0} max={100} step={0.5}
                value={sel.left.toFixed(1)}
                onChange={e => updateField(selected, { left: clamp(parseFloat(e.target.value) || 0) })}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-yellow-500 font-mono" />
            </div>
          </div>
        </div>
      )}

      {/* Position summary table */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-3">
        <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wide mb-2">Current positions</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
          {(Object.keys(FIELD_META) as FieldKey[]).map(key => {
            const pos = positions[key]
            const isQr = key === 'qr'
            const qp = pos as PassFieldPositions['qr']
            return (
              <button key={key} type="button"
                onClick={() => setSelected(selected === key ? null : key)}
                className={`flex items-baseline gap-2 text-left px-2 py-0.5 rounded transition-colors ${selected === key ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-zinc-400'}`}>
                <span className="text-zinc-300 w-24 shrink-0">{FIELD_META[key].label}</span>
                <span className="text-zinc-500">
                  top {pos.top.toFixed(1)}% · left {pos.left.toFixed(1)}%
                  {isQr ? ` · ${qp.width.toFixed(1)}×${qp.height.toFixed(1)}%` : ''}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
