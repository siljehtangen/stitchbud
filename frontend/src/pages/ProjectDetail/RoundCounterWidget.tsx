import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Field } from '../../components/LibraryItemForm'

export function RoundCounterWidget({ counter, onSave }: {
  counter: { stitchesPerRound: number; totalRounds: number; checkedStitches: string }
  onSave: (stitchesPerRound: number, totalRounds: number, checked: number[]) => void
}) {
  const { t } = useTranslation()

  function parseChecked(s: string): Set<number> {
    try { return new Set(JSON.parse(s) as number[]) } catch { return new Set() }
  }

  const [spr, setSpr] = useState(counter.stitchesPerRound)
  const [rounds, setRounds] = useState(counter.totalRounds)
  const [checked, setChecked] = useState<Set<number>>(() => parseChecked(counter.checkedStitches))
  const [configured, setConfigured] = useState(counter.stitchesPerRound > 0 && counter.totalRounds > 0)
  const [editSpr, setEditSpr] = useState(counter.stitchesPerRound || 8)
  const [editRounds, setEditRounds] = useState(counter.totalRounds || 10)

  const checkedRef = useRef(checked)
  const sprRef = useRef(spr)
  const roundsRef = useRef(rounds)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [])

  useEffect(() => {
    const newSpr = counter.stitchesPerRound
    const newRounds = counter.totalRounds
    setSpr(newSpr); sprRef.current = newSpr
    setRounds(newRounds); roundsRef.current = newRounds
    setConfigured(newSpr > 0 && newRounds > 0)
    setEditSpr(newSpr || 8)
    setEditRounds(newRounds || 10)
  }, [counter.stitchesPerRound, counter.totalRounds])

  function toggleStitch(idx: number) {
    const next = new Set(checkedRef.current)
    if (next.has(idx)) next.delete(idx); else next.add(idx)
    checkedRef.current = next
    setChecked(new Set(next))

    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      onSave(sprRef.current, roundsRef.current, Array.from(checkedRef.current))
    }, 800)
  }

  function handleConfigure() {
    const empty = new Set<number>()
    setSpr(editSpr); sprRef.current = editSpr
    setRounds(editRounds); roundsRef.current = editRounds
    checkedRef.current = empty
    setChecked(empty)
    setConfigured(true)
    onSave(editSpr, editRounds, [])
  }

  function handleReset() {
    const empty = new Set<number>()
    checkedRef.current = empty
    setChecked(empty)
    onSave(sprRef.current, roundsRef.current, [])
  }

  if (!configured) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-warm-gray">{t('setup_counter')}</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('repetitions_per_round')}>
            <input type="number" className="input" min={1} max={500}
              value={editSpr} onChange={e => setEditSpr(parseInt(e.target.value) || 1)} />
          </Field>
          <Field label={t('total_rounds')}>
            <input type="number" className="input" min={1} max={1000}
              value={editRounds} onChange={e => setEditRounds(parseInt(e.target.value) || 1)} />
          </Field>
        </div>
        <button onClick={handleConfigure} className="btn-primary w-full">{t('start_counting')}</button>
      </div>
    )
  }

  const totalStitches = spr * rounds
  const doneCount = checked.size
  const completedRounds = useMemo(() =>
    Array.from({ length: rounds }, (_, r) =>
      Array.from({ length: spr }, (_, s) => r * spr + s).every(i => checked.has(i))
    ).filter(Boolean).length
  , [rounds, spr, checked])
  const progress = totalStitches > 0 ? Math.round((doneCount / totalStitches) * 100) : 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm flex-wrap gap-1">
        <span className="text-warm-gray">{t('rounds_repetitions', { completedRounds, rounds, done: doneCount, total: totalStitches })}</span>
        <span className="text-warm-gray text-xs">{progress}%</span>
      </div>
      <div className="w-full bg-soft-brown/30 rounded-full h-1.5">
        <div className="bg-sand-green-dark h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block">
          {Array.from({ length: rounds }, (_, r) => {
            const rowComplete = Array.from({ length: spr }, (_, s) => checked.has(r * spr + s)).every(Boolean)
            return (
              <div key={r} className="flex items-center gap-1 mb-1">
                <span className={`text-xs w-7 text-right flex-shrink-0 font-mono ${rowComplete ? 'text-sand-green-dark font-bold' : 'text-warm-gray'}`}>
                  {r + 1}
                </span>
                <div className="flex gap-0.5">
                  {Array.from({ length: spr }, (_, s) => {
                    const idx = r * spr + s
                    const done = checked.has(idx)
                    return (
                      <button
                        key={s}
                        onClick={() => toggleStitch(idx)}
                        className={`w-7 h-7 rounded border text-xs font-bold transition-all active:scale-95 ${
                          done
                            ? 'bg-sand-green border-sand-green-dark text-gray-700'
                            : 'bg-white border-soft-brown/40 text-transparent hover:border-sand-green hover:bg-sand-green/10'
                        }`}
                      >✓</button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={handleReset} className="btn-ghost text-xs border border-soft-brown/30 rounded-lg py-1.5 px-3">
          {t('reset_all')}
        </button>
        <button onClick={() => setConfigured(false)} className="btn-ghost text-xs border border-soft-brown/30 rounded-lg py-1.5 px-3">
          {t('change_setup')}
        </button>
      </div>
      <p className="text-xs text-warm-gray">{t('auto_saving')}</p>
    </div>
  )
}
