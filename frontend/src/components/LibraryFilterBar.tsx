import { useTranslation } from 'react-i18next'
import type { LibraryItemType } from '../types'
import { ITEM_TYPES, TYPE_ICONS } from './LibraryItemForm'
import { ColorMultiSelect } from './ColorMultiSelect'
import { typeLabel } from '../utils/libraryUtils'

interface Props {
  filterType: LibraryItemType | null
  setFilterType: (type: LibraryItemType | null) => void
  filterColors: string[]
  setFilterColors: (colors: string[]) => void
  search: string
  setSearch: (search: string) => void
  showColorFilter: boolean
  availableColors: string[]
}

export function LibraryFilterBar({
  filterType, setFilterType,
  filterColors, setFilterColors,
  search, setSearch,
  showColorFilter, availableColors,
}: Props) {
  const { t, i18n } = useTranslation()

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => setFilterType(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filterType === null ? 'bg-sand-blue text-gray-800' : 'bg-soft-brown/20 text-warm-gray hover:bg-sand-blue/20'
          }`}
        >
          {t('lib_all')}
        </button>
        {ITEM_TYPES.map(type => (
          <button
            key={type}
            type="button"
            onClick={() => setFilterType(filterType === type ? null : type)}
            className={`flex flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterType === type ? 'bg-sand-blue text-gray-800' : 'bg-soft-brown/20 text-warm-gray hover:bg-sand-blue/20'
            }`}
          >
            <span className="text-sm leading-none flex-shrink-0">{TYPE_ICONS[type]}</span>
            <span className="whitespace-nowrap">{typeLabel(type, t)}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="search"
          className="input text-sm py-2 w-1/2 min-w-0"
          placeholder={t('lib_search_placeholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {showColorFilter && availableColors.length > 0 && (
          <div className="w-1/2 flex-shrink-0">
            <ColorMultiSelect
              availableColors={availableColors}
              selected={filterColors}
              onChange={setFilterColors}
              language={i18n.language}
              placeholder={t('lib_filter_color')}
              searchPlaceholder={t('lib_color_search_placeholder')}
              noResults={t('lib_color_no_results')}
              clearLabel={t('lib_clear_color_filter')}
            />
          </div>
        )}
      </div>
    </div>
  )
}
