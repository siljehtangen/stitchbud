import { useTranslation } from 'react-i18next'
import type { LibraryItemType } from '../types'
import { Field } from './LibraryItemForm'

interface LibraryItemTypeFieldsProps {
  itemType: LibraryItemType
  yarnBrand: string
  setYarnBrand: (v: string) => void
  yarnMaterial: string
  setYarnMaterial: (v: string) => void
  yarnAmountG: string
  setYarnAmountG: (v: string) => void
  yarnAmountM: string
  setYarnAmountM: (v: string) => void
  fabricLength: string
  setFabricLength: (v: string) => void
  fabricWidth: string
  setFabricWidth: (v: string) => void
  needleSize: string
  setNeedleSize: (v: string) => void
  circularLength: string
  setCircularLength: (v: string) => void
  hookSize: string
  setHookSize: (v: string) => void
}

export function LibraryItemTypeFields({
  itemType,
  yarnBrand,
  setYarnBrand,
  yarnMaterial,
  setYarnMaterial,
  yarnAmountG,
  setYarnAmountG,
  yarnAmountM,
  setYarnAmountM,
  fabricLength,
  setFabricLength,
  fabricWidth,
  setFabricWidth,
  needleSize,
  setNeedleSize,
  circularLength,
  setCircularLength,
  hookSize,
  setHookSize,
}: LibraryItemTypeFieldsProps) {
  const { t } = useTranslation()

  if (itemType === 'YARN') {
    return (
      <div className="max-w-lg space-y-2">
        <Field label={t('lib_yarn_brand')}>
          <input
            className="input text-sm py-1.5"
            value={yarnBrand}
            onChange={e => setYarnBrand(e.target.value)}
            placeholder={t('lib_yarn_brand')}
          />
        </Field>
        <Field label={t('lib_yarn_material')}>
          <input
            className="input text-sm py-1.5"
            value={yarnMaterial}
            onChange={e => setYarnMaterial(e.target.value)}
            placeholder={t('lib_yarn_material')}
          />
        </Field>
        <div className="flex flex-wrap gap-3">
          <Field label={t('lib_yarn_amount_g')}>
            <input
              type="number"
              className="input input-number text-sm py-1.5"
              value={yarnAmountG}
              onChange={e => setYarnAmountG(e.target.value)}
              placeholder="100"
            />
          </Field>
          <Field label={t('lib_yarn_amount_m')}>
            <input
              type="number"
              className="input input-number text-sm py-1.5"
              value={yarnAmountM}
              onChange={e => setYarnAmountM(e.target.value)}
              placeholder="200"
            />
          </Field>
        </div>
      </div>
    )
  }

  if (itemType === 'FABRIC') {
    return (
      <div className="flex flex-wrap gap-3 max-w-lg">
        <Field label={t('lib_fabric_length')}>
          <input
            type="number"
            className="input input-number text-sm py-1.5"
            value={fabricLength}
            onChange={e => setFabricLength(e.target.value)}
            placeholder="150"
          />
        </Field>
        <Field label={t('lib_fabric_width')}>
          <input
            type="number"
            className="input input-number text-sm py-1.5"
            value={fabricWidth}
            onChange={e => setFabricWidth(e.target.value)}
            placeholder="140"
          />
        </Field>
      </div>
    )
  }

  if (itemType === 'KNITTING_NEEDLE') {
    return (
      <div className="flex flex-wrap gap-3 max-w-lg">
        <Field label={t('lib_needle_size')}>
          <input
            className="input input-number text-sm py-1.5"
            value={needleSize}
            onChange={e => setNeedleSize(e.target.value)}
            placeholder="4.5"
          />
        </Field>
        <Field label={t('lib_circular_length')}>
          <input
            type="number"
            className="input input-number text-sm py-1.5"
            value={circularLength}
            onChange={e => setCircularLength(e.target.value)}
            placeholder="80"
          />
        </Field>
      </div>
    )
  }

  if (itemType === 'CROCHET_HOOK') {
    return (
      <Field label={t('lib_hook_size')}>
        <input
          className="input input-number text-sm py-1.5"
          value={hookSize}
          onChange={e => setHookSize(e.target.value)}
          placeholder="5.0"
        />
      </Field>
    )
  }

  return null
}
