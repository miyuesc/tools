/* eslint-disable react-refresh/only-export-components */
import { Download } from 'lucide-react'
import type { ReactNode } from 'react'
import { CopyButton } from '../shared/EditorPanel'

export type RangeFieldProps = {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (value: number) => void
}

export function RangeField({ label, value, min, max, step = 1, unit = '', onChange }: RangeFieldProps) {
  return <label className="web-range"><span>{label}<code>{value}{unit}</code></span><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>
}

export function NumberField({ label, value, min = 0, max = 9999, step = 1, unit = '', onChange }: RangeFieldProps) {
  return <label className="web-number"><span>{label}</span><span><input type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /><i>{unit}</i></span></label>
}

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="web-color"><span>{label}</span><span><input type="color" value={value} onChange={(event) => onChange(event.target.value)} /><code>{value.toUpperCase()}</code></span></label>
}

export function SelectField({ label, value, children, onChange }: { label: string; value: string; children: ReactNode; onChange: (value: string) => void }) {
  return <label className="web-select"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{children}</select></label>
}

export function TextField({ label, value, onChange, placeholder = '' }: { label: string; value: string; placeholder?: string; onChange: (value: string) => void }) {
  return <label className="web-input"><span>{label}</span><input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="web-toggle"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span />{label}</label>
}

export function Segments<T extends string>({ value, options, onChange }: { value: T; options: Array<{ value: T; label: string }>; onChange: (value: T) => void }) {
  return <div className="web-segments">{options.map((option) => <button key={option.value} className={value === option.value ? 'active' : ''} onClick={() => onChange(option.value)}>{option.label}</button>)}</div>
}

export function ResultPanel({ title, value, language = 'CSS', note, actions }: { title: string; value: string; language?: string; note?: string; actions?: ReactNode }) {
  return <section className="web-result">
    <header><div><span>{title}</span>{note && <small>{note}</small>}</div><div><CopyButton value={value} />{actions}</div></header>
    <pre><code><i>{language}</i>{value}</code></pre>
  </section>
}

export function DownloadButton({ filename, value, type = 'image/svg+xml', label = '下载' }: { filename: string; value: string; type?: string; label?: string }) {
  return <button className="mini-action" onClick={() => downloadText(filename, value, type)}><Download size={14} />{label}</button>
}

export function downloadText(filename: string, value: string, type = 'image/svg+xml') {
  const url = URL.createObjectURL(new Blob([value], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
}

export function hexChannels(hex: string) {
  const value = hex.replace('#', '')
  return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16))
}

export function rgba(hex: string, opacity: number) {
  const [r, g, b] = hexChannels(hex)
  return `rgb(${r} ${g} ${b} / ${Number(opacity.toFixed(2))})`
}
