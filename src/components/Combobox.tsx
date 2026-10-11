// Type-to-search picker with sprite icons, used for Pokémon and items.

import { useId, useMemo, useRef, useState } from 'react'
import { normalize } from '../data/dex'

export interface Option {
  id: string
  label: string
  icon?: string
}

const MAX_RESULTS = 40

export function Combobox({
  options,
  value,
  onChange,
  placeholder,
  pixelated,
}: {
  options: Option[]
  value: string
  onChange: (id: string) => void
  placeholder: string
  pixelated?: boolean
}) {
  const listId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const selected = options.find((o) => o.id === value)

  const results = useMemo(() => {
    const q = normalize(query)
    if (!q) return options.slice(0, MAX_RESULTS)
    const starts: Option[] = []
    const contains: Option[] = []
    for (const o of options) {
      const label = normalize(o.label)
      if (label.startsWith(q)) starts.push(o)
      else if (label.includes(q)) contains.push(o)
      if (starts.length >= MAX_RESULTS) break
    }
    return [...starts, ...contains].slice(0, MAX_RESULTS)
  }, [options, query])

  const pick = (o: Option | undefined) => {
    if (!o) return
    onChange(o.id)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  const imgClass = `h-7 w-7 shrink-0 object-contain ${pixelated ? '[image-rendering:pixelated]' : ''}`

  return (
    <div className="relative">
      <div className="flex items-center rounded-lg border border-slate-300 bg-white shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
        {selected?.icon && !open ? <img src={selected.icon} alt="" className={`ml-1 ${imgClass}`} /> : null}
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          className="w-full min-w-0 bg-transparent px-2 py-1.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
          placeholder={selected ? selected.label : placeholder}
          value={open ? query : (selected?.label ?? '')}
          onFocus={() => {
            setOpen(true)
            setActive(0)
          }}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
            setOpen(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((a) => Math.min(a + 1, results.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((a) => Math.max(a - 1, 0))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              pick(results[active])
            } else if (e.key === 'Escape') {
              setOpen(false)
              inputRef.current?.blur()
            }
          }}
        />
        {value && (
          <button
            type="button"
            aria-label="Clear"
            className="px-2 text-lg leading-none text-slate-400 hover:text-slate-700"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onChange('')}
          >
            ×
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full min-w-48 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {results.map((o, i) => (
            <li
              key={o.id}
              role="option"
              aria-selected={i === active}
              className={`flex cursor-pointer items-center gap-2 px-2 py-1 text-sm ${i === active ? 'bg-blue-50 text-blue-900' : 'text-slate-800'}`}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(o)}
            >
              {o.icon ? <img src={o.icon} alt="" loading="lazy" className={imgClass} /> : <span className="h-7 w-7 shrink-0" />}
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
