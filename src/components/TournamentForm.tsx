import type { Tournament } from '../types'
import { FORMATS, TOURNAMENT_TYPES, eventTypeKey, formatName } from '../data/options'
import { Card, Field, Input, Select } from './ui'
import { t, type UiKey } from '../i18n'

const DIVISION_LABELS: Record<'masters' | 'seniors' | 'juniors', UiKey> = {
  masters: 'ui.tournament.division.masters',
  seniors: 'ui.tournament.division.seniors',
  juniors: 'ui.tournament.division.juniors',
}

export function TournamentForm({ value, onChange }: { value: Tournament; onChange: (t: Tournament) => void }) {
  const set = <K extends keyof Tournament>(key: K, v: Tournament[K]) => onChange({ ...value, [key]: v })
  const setDivision = (key: keyof Tournament['divisions'], v: string) =>
    set('divisions', { ...value.divisions, [key]: v === '' ? '' : Math.max(0, Number(v)) })

  return (
    <Card>
      <h2 className="mb-4 text-lg font-bold text-slate-900">{t('ui.tournament.title')}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('ui.tournament.name')} className="sm:col-span-2">
          <Input value={value.name} placeholder={t('ui.tournament.namePlaceholder')} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label={t('ui.tournament.type')}>
          <Select value={value.type} onChange={(e) => set('type', e.target.value)}>
            {TOURNAMENT_TYPES.map((type) => (
              <option key={type.id} value={type.id}>{t(eventTypeKey(type.id))}</option>
            ))}
          </Select>
        </Field>
        <Field label={t('ui.tournament.date')}>
          <Input type="date" value={value.date} onChange={(e) => set('date', e.target.value)} />
        </Field>
        <Field label={t('ui.tournament.format')} className={value.format === 'Custom Format' ? '' : 'sm:col-span-2'}>
          <Select value={value.format} onChange={(e) => set('format', e.target.value)}>
            {FORMATS.map((f) => (
              <option key={f.name} value={f.name}>{formatName(f.name)}</option>
            ))}
          </Select>
        </Field>
        {value.format === 'Custom Format' && (
          <Field label={t('ui.tournament.customFormat')}>
            <Input value={value.customFormat} onChange={(e) => set('customFormat', e.target.value)} />
          </Field>
        )}
        <div className="grid grid-cols-3 gap-3 sm:col-span-2">
          {(['masters', 'seniors', 'juniors'] as const).map((d) => (
            <Field key={d} label={t(DIVISION_LABELS[d])}>
              <Input type="number" min={0} inputMode="numeric" placeholder="0" value={value.divisions[d]} onChange={(e) => setDivision(d, e.target.value)} />
            </Field>
          ))}
        </div>
      </div>
    </Card>
  )
}
