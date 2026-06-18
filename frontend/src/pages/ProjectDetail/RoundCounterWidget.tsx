import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Field } from '../../components/LibraryItemForm'
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback'
import { FiRotateCcw, FiSettings } from 'react-icons/fi'

export function RoundCounterWidget({
  counter,
  onSave,
  accent = '#78A073',
}: {
  counter: { stitchesPerRound: number; totalRounds: number; checkedStitches: string }
  onSave: (stitchesPerRound: number, totalRounds: number, checked: number[]) => void
  accent?: string
}) {
  const { t } = useTranslation()

  function parseChecked(s: string): Set<number> {
    try {
      return new Set(JSON.parse(s) as number[])
    } catch {
      return new Set()
    }
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

  const debouncedSave = useDebouncedCallback(
    (spr: number, rounds: number, checked: number[]) => onSave(spr, rounds, checked),
    800
  )

  useEffect(() => {
    const newSpr = counter.stitchesPerRound
    const newRounds = counter.totalRounds
    setSpr(newSpr)
    sprRef.current = newSpr
    setRounds(newRounds)
    roundsRef.current = newRounds
    setConfigured(newSpr > 0 && newRounds > 0)
    setEditSpr(newSpr || 8)
    setEditRounds(newRounds || 10)
  }, [counter.stitchesPerRound, counter.totalRounds])

  function toggleStitch(idx: number) {
    const next = new Set(checkedRef.current)
    if (next.has(idx)) next.delete(idx)
    else next.add(idx)
    checkedRef.current = next
    setChecked(new Set(next))
    debouncedSave(sprRef.current, roundsRef.current, Array.from(next))
  }

  function handleConfigure() {
    const empty = new Set<number>()
    setSpr(editSpr)
    sprRef.current = editSpr
    setRounds(editRounds)
    roundsRef.current = editRounds
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

  // Must be declared before any early return to satisfy rules-of-hooks
  const completedRounds = useMemo(
    () =>
      Array.from({ length: rounds }, (_, r) =>
        Array.from({ length: spr }, (_, s) => r * spr + s).every(i => checked.has(i))
      ).filter(Boolean).length,
    [rounds, spr, checked]
  )

  if (!configured) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-warm-gray">{t('setup_counter')}</p>
        <div className="flex flex-wrap gap-3 max-w-xs">
          <Field label={t('repetitions_per_round')}>
            <input
              type="number"
              className="input input-number"
              min={1}
              max={500}
              value={editSpr}
              onChange={e => setEditSpr(parseInt(e.target.value) || 1)}
            />
          </Field>
          <Field label={t('total_rounds')}>
            <input
              type="number"
              className="input input-number"
              min={1}
              max={1000}
              value={editRounds}
              onChange={e => setEditRounds(parseInt(e.target.value) || 1)}
            />
          </Field>
        </div>
        <div className="flex justify-end">
          <button onClick={handleConfigure} className="btn-primary inline-flex items-center justify-center gap-1.5">
            {t('start_counting')}
          </button>
        </div>
      </div>
    )
  }

  const totalStitches = spr * rounds
  const doneCount = checked.size
  const progress = totalStitches > 0 ? Math.round((doneCount / totalStitches) * 100) : 0

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between flex-wrap gap-1">
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-4xl leading-none text-ink">{completedRounds}</span>
          <span className="text-sm text-warm-gray">
            / {rounds} {t('total_rounds').toLowerCase()}
          </span>
        </div>
        <span className="text-warm-gray text-sm">
          {t('rounds_repetitions', { completedRounds, rounds, done: doneCount, total: totalStitches })} · {progress}%
        </span>
      </div>
      <div className="w-full bg-soft-brown/30 rounded-full h-2">
        <div className="h-2 rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: accent }} />
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block">
          {Array.from({ length: rounds }, (_, r) => {
            const rowComplete = Array.from({ length: spr }, (_, s) => checked.has(r * spr + s)).every(Boolean)
            return (
              <div key={r} className="flex items-center gap-1 mb-1">
                <span
                  className={`font-serif text-sm w-7 text-right flex-shrink-0 ${rowComplete ? 'font-semibold' : 'text-warm-gray'}`}
                  style={rowComplete ? { color: accent } : undefined}
                >
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
                        className={`w-11 h-11 sm:w-8 sm:h-8 rounded-lg border text-xs font-bold transition-all active:scale-95 ${
                          done ? 'text-white' : 'bg-white border-soft-brown/40 text-transparent hover:bg-soft-brown/10'
                        }`}
                        style={done ? { backgroundColor: accent, borderColor: accent } : undefined}
                      >
                        ✓
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleReset}
          className="btn-ghost text-xs border border-soft-brown/30 rounded-lg py-1.5 px-3 inline-flex items-center gap-1.5"
        >
          <FiRotateCcw className="text-sm" />
          {t('reset_all')}
        </button>
        <button
          onClick={() => setConfigured(false)}
          className="btn-ghost text-xs border border-soft-brown/30 rounded-lg py-1.5 px-3 inline-flex items-center gap-1.5"
        >
          <FiSettings className="text-sm" />
          {t('change_setup')}
        </button>
      </div>
    </div>
  )
}
