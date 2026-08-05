import { useEffect, useState } from 'react'
import { CopyButton } from '../shared/EditorPanel'

function localInputValue(date: Date) {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return adjusted.toISOString().slice(0, 19)
}

export default function TimestampToolPage() {
  const [now, setNow] = useState(Date.now())
  const [unit, setUnit] = useState<'seconds' | 'milliseconds'>('seconds')
  const [zone, setZone] = useState<'local' | 'utc'>('local')
  const [timestamp, setTimestamp] = useState(String(Math.floor(now / 1000)))
  const [dateInput, setDateInput] = useState(localInputValue(new Date(now)))
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer) }, [])
  const numeric = Number(timestamp)
  const date = new Date(numeric * (unit === 'seconds' ? 1000 : 1))
  const valid = timestamp.trim() !== '' && Number.isFinite(numeric) && !Number.isNaN(date.getTime())
  const current = unit === 'seconds' ? Math.floor(now / 1000) : now
  const display = valid ? zone === 'utc' ? date.toISOString().replace('T', ' ').replace('Z', ' UTC') : date.toLocaleString('zh-CN', { hour12: false }) : '无效时间'
  const changeDate = (value: string) => {
    setDateInput(value)
    const next = new Date(value)
    if (!Number.isNaN(next.getTime())) setTimestamp(String(unit === 'seconds' ? Math.floor(next.getTime() / 1000) : next.getTime()))
  }
  const changeUnit = (next: 'seconds' | 'milliseconds') => {
    if (valid) setTimestamp(String(next === 'seconds' ? Math.floor(date.getTime() / 1000) : date.getTime()))
    setUnit(next)
  }

  return <div className="timestamp-layout"><div className="live-time"><span>当前 Unix 时间 · {unit === 'seconds' ? '秒' : '毫秒'}</span><strong>{current}</strong><CopyButton value={String(current)} /></div><div className="workspace-toolbar"><select aria-label="时间戳单位" value={unit} onChange={(event) => changeUnit(event.target.value as typeof unit)}><option value="seconds">秒</option><option value="milliseconds">毫秒</option></select><select aria-label="显示时区" value={zone} onChange={(event) => setZone(event.target.value as typeof zone)}><option value="local">本地时区</option><option value="utc">UTC</option></select><span className="toolbar-hint">支持负时间戳与日期反向转换</span></div><div className="field-group"><label>Unix 时间戳<input value={timestamp} onChange={(event) => { if (/^-?\d*$/.test(event.target.value)) setTimestamp(event.target.value) }} /></label><span className="conversion-arrow">→</span><label>{zone === 'utc' ? 'UTC 时间' : '本地时间'}<input value={display} readOnly /></label></div><div className="field-group reverse-date"><label>本地日期时间<input type="datetime-local" step="1" value={dateInput} onChange={(event) => changeDate(event.target.value)} /></label><span className="conversion-arrow">→</span><label>{unit === 'seconds' ? '秒时间戳' : '毫秒时间戳'}<input value={timestamp} readOnly /></label></div>{valid ? <div className="date-details"><div><span>ISO 8601</span><code>{date.toISOString()}</code></div><div><span>UTC</span><code>{date.toUTCString()}</code></div></div> : <div className="status-line error">请输入有效的整数时间戳</div>}</div>
}
