import { useTranslation } from 'react-i18next'
import { COLORS, COLOR_MAP, COLOR_MAP_BY_HEX, getColorName } from '../colors'

export function ColorPicker({ selected, onChange }: { selected: string[]; onChange: (colors: string[]) => void }) {
  const { i18n } = useTranslation()

  function toggle(name: string) {
    if (selected.includes(name)) {
      onChange(selected.filter(c => c !== name))
    } else {
      onChange([...selected, name])
    }
  }

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(name => {
            const colorEntry = COLOR_MAP_BY_HEX[COLOR_MAP[name]]
            const displayName = colorEntry ? getColorName(colorEntry, i18n.language) : name
            return (
              <span
                key={name}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-soft-brown/20 text-gray-700"
              >
                <span
                  className="w-3 h-3 rounded-full border border-black/10 flex-shrink-0"
                  style={{ backgroundColor: COLOR_MAP[name] ?? '#ccc' }}
                  aria-hidden="true"
                />
                {displayName}
                <button
                  type="button"
                  onClick={() => toggle(name)}
                  className="ml-0.5 text-warm-gray hover:text-red-400 leading-none"
                >
                  ×
                </button>
              </span>
            )
          })}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Color palette">
        {COLORS.map(color => {
          const { name, hex } = color
          const isSelected = selected.includes(name)
          const label = getColorName(color, i18n.language)
          return (
            <button
              key={name}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={isSelected}
              onClick={() => toggle(name)}
              className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${
                isSelected
                  ? 'border-sand-blue-deep ring-2 ring-sand-blue-deep/40 scale-110'
                  : 'border-black/10 hover:border-black/25'
              }`}
              style={{ backgroundColor: hex }}
            />
          )
        })}
      </div>
    </div>
  )
}
