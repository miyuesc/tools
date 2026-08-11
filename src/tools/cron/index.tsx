import { CronExpressionParser } from 'cron-parser'
import { CalendarClock, Check, CircleAlert, Clock3 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { CopyButton } from '../shared/EditorPanel'

type CronFieldKey = 'minute' | 'hour' | 'dayOfMonth' | 'month' | 'dayOfWeek'

type CronFieldDefinition = {
  key: CronFieldKey
  label: string
  hint: string
  min: number
  max: number
  names?: Record<string, number>
}

type CronFieldResult = {
  definition: CronFieldDefinition
  raw: string
  valid: boolean
  values: number[]
  isEvery: boolean
  error?: string
  description: string
}

type CronAnalysis = {
  parts: string[]
  fields: CronFieldResult[]
  valid: boolean
  error: string
  description: string
  nextDates: Date[]
}

const monthNames: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

const weekdayNames: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
}

const chineseMonths = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
const chineseWeekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const cronFields: CronFieldDefinition[] = [
  { key: 'minute', label: '分钟', hint: '0–59', min: 0, max: 59 },
  { key: 'hour', label: '小时', hint: '0–23', min: 0, max: 23 },
  { key: 'dayOfMonth', label: '日期', hint: '1–31', min: 1, max: 31 },
  { key: 'month', label: '月份', hint: '1–12 / JAN–DEC', min: 1, max: 12, names: monthNames },
  { key: 'dayOfWeek', label: '星期', hint: '0–7 / SUN–SAT', min: 0, max: 7, names: weekdayNames },
]

const cronPresets = [
  ['参考示例', '23 0-20/2 * * *'],
  ['每分钟', '* * * * *'],
  ['每天 09:00', '0 9 * * *'],
  ['工作日 09:00', '0 9 * * 1-5'],
  ['每月 1 日', '0 0 1 * *'],
] as const

function normalizeNames(raw: string, definition: CronFieldDefinition) {
  let invalidName = ''
  const normalized = raw.toLowerCase().replace(/[a-z]+/g, (name) => {
    const value = definition.names?.[name]
    if (value === undefined) {
      invalidName = name
      return name
    }
    return String(value)
  })
  if (!invalidName) return { normalized }
  return {
    normalized,
    error: definition.names
      ? `${definition.label}不支持缩写“${invalidName.toUpperCase()}”，请使用三字母英文缩写`
      : `${definition.label}不支持英文缩写`,
  }
}

function compactValues(values: number[], render: (value: number) => string, limit = 9) {
  const labels = values.map(render)
  if (labels.length <= limit) return labels.join('、')
  return `${labels.slice(0, 5).join('、')} … ${labels.slice(-2).join('、')}`
}

function describeWeekdays(values: number[]) {
  if (values.join(',') === '1,2,3,4,5') return '周一至周五'
  if (values.join(',') === '0,6') return '周六和周日'
  return compactValues(values, (value) => chineseWeekdays[value === 7 ? 0 : value])
}

function describeField(definition: CronFieldDefinition, raw: string, values: number[]) {
  if (raw === '*') {
    if (definition.key === 'minute') return '每分钟'
    if (definition.key === 'hour') return '每小时'
    if (definition.key === 'dayOfMonth') return '每日'
    if (definition.key === 'month') return '每月'
    return '每天'
  }

  if (definition.key === 'minute') return `第 ${compactValues(values, String)} 分钟`
  if (definition.key === 'hour') return `${compactValues(values, (value) => `${value} 时`)}`
  if (definition.key === 'dayOfMonth') return `每月 ${compactValues(values, (value) => `${value} 日`)}`
  if (definition.key === 'month') return compactValues(values, (value) => chineseMonths[value - 1])
  return describeWeekdays(values)
}

function invalidField(definition: CronFieldDefinition, raw: string, error: string): CronFieldResult {
  return { definition, raw, valid: false, values: [], isEvery: false, error, description: error }
}

function parseCronField(raw: string, definition: CronFieldDefinition): CronFieldResult {
  if (!raw) return invalidField(definition, raw, `缺少${definition.label}字段`)

  const nameResult = normalizeNames(raw, definition)
  if (nameResult.error) return invalidField(definition, raw, nameResult.error)
  const normalized = nameResult.normalized
  if (!/^[\d*,/-]+$/.test(normalized)) {
    return invalidField(definition, raw, '仅支持数字、*、逗号、连字符和 / 步长')
  }

  const values = new Set<number>()
  const list = normalized.split(',')
  if (list.some((part) => !part)) return invalidField(definition, raw, '逗号两侧都必须有值')

  for (const item of list) {
    const stepParts = item.split('/')
    if (stepParts.length > 2 || !stepParts[0] || (stepParts.length === 2 && !stepParts[1])) {
      return invalidField(definition, raw, '步长格式应为“范围/正整数”或“*/正整数”')
    }

    const [base, stepText] = stepParts
    if (stepText && !/^\d+$/.test(stepText)) return invalidField(definition, raw, '步长必须是正整数')
    const step = stepText ? Number(stepText) : 1
    if (!Number.isSafeInteger(step) || step < 1) return invalidField(definition, raw, '步长必须大于 0')

    let start = definition.min
    let end = definition.max
    if (base !== '*') {
      const range = base.match(/^(\d+)-(\d+)$/)
      if (range) {
        start = Number(range[1])
        end = Number(range[2])
      } else if (/^\d+$/.test(base)) {
        start = Number(base)
        end = stepText ? definition.max : start
      } else {
        return invalidField(definition, raw, '范围应写成“起始值-结束值”')
      }
    }

    if (start < definition.min || start > definition.max || end < definition.min || end > definition.max) {
      return invalidField(definition, raw, `${definition.label}必须在 ${definition.min}–${definition.max} 范围内`)
    }
    if (start > end) return invalidField(definition, raw, '范围起始值不能大于结束值')

    for (let value = start; value <= end; value += step) {
      values.add(definition.key === 'dayOfWeek' && value === 7 ? 0 : value)
    }
  }

  const orderedValues = [...values].sort((left, right) => left - right)
  return {
    definition,
    raw,
    valid: true,
    values: orderedValues,
    isEvery: raw === '*',
    description: describeField(definition, raw, orderedValues),
  }
}

function describeTime(minute: CronFieldResult, hour: CronFieldResult) {
  if (minute.isEvery && hour.isEvery) return '每分钟'
  if (hour.isEvery) {
    if (minute.values.length === 1) return `每小时的第 ${minute.values[0]} 分钟`
    return `每小时的第 ${compactValues(minute.values, String)} 分钟`
  }
  if (minute.isEvery) return `${compactValues(hour.values, (value) => `${value} 时`)}内每分钟`

  const times = hour.values.flatMap((hourValue) => minute.values.map((minuteValue) =>
    `${String(hourValue).padStart(2, '0')}:${String(minuteValue).padStart(2, '0')}`))
  if (times.length <= 16) return times.join('、')
  return `${hour.description}的${minute.description}`
}

function describeSchedule(fields: CronFieldResult[]) {
  const [minute, hour, dayOfMonth, month, dayOfWeek] = fields
  const dates = compactValues(dayOfMonth.values, (value) => `${value} 日`)
  const weekdays = describeWeekdays(dayOfWeek.values)
  const monthScope = month.isEvery ? '' : `每年${month.description}的 `
  let dayDescription = month.isEvery ? '每天' : `${monthScope}每天`

  if (!dayOfMonth.isEvery && dayOfWeek.isEvery) {
    dayDescription = month.isEvery ? `每月 ${dates}` : `${monthScope}${dates}`
  } else if (dayOfMonth.isEvery && !dayOfWeek.isEvery) {
    dayDescription = month.isEvery ? `每${weekdays}` : `${monthScope}${weekdays}`
  } else if (!dayOfMonth.isEvery && !dayOfWeek.isEvery) {
    dayDescription = month.isEvery
      ? `每月 ${dates}或每${weekdays}（任一条件匹配）`
      : `${monthScope}${dates}或${weekdays}（任一条件匹配）`
  }

  return `${dayDescription} ${describeTime(minute, hour)} 执行`
}

function translateParserError(cause: unknown) {
  const message = cause instanceof Error ? cause.message : ''
  if (/day of month/i.test(message)) return '日期与月份组合不存在有效执行日期'
  if (/out of the timespan|time span/i.test(message)) return '在可计算的时间范围内没有执行日期'
  return '表达式无法生成有效执行时间，请检查各字段组合'
}

function analyzeCron(expression: string, timezone: string): CronAnalysis {
  const trimmed = expression.trim()
  const parts = trimmed ? trimmed.split(/\s+/) : []
  const fields = cronFields.map((definition, index) => parseCronField(parts[index] || '', definition))

  if (parts.length !== 5) {
    return {
      parts,
      fields,
      valid: false,
      error: parts.length < 5 ? `当前只有 ${parts.length} 个字段，需要完整填写 5 个字段` : `检测到 ${parts.length} 个字段，第 6 段起属于多余内容`,
      description: '',
      nextDates: [],
    }
  }

  const invalid = fields.find((field) => !field.valid)
  if (invalid) {
    const index = fields.indexOf(invalid) + 1
    return { parts, fields, valid: false, error: `第 ${index} 段“${invalid.definition.label}”错误：${invalid.error}`, description: '', nextDates: [] }
  }

  try {
    const interval = CronExpressionParser.parse(trimmed, { currentDate: new Date(), tz: timezone })
    const nextDates = interval.take(5).map((date) => date.toDate())
    return { parts, fields, valid: true, error: '', description: describeSchedule(fields), nextDates }
  } catch (cause) {
    const error = translateParserError(cause)
    const highlightedFields = /日期与月份/.test(error)
      ? fields.map((field, index) => index === 2 || index === 3
        ? { ...field, valid: false, error: '该日期在所选月份中不存在', description: '该日期在所选月份中不存在' }
        : field)
      : fields
    return { parts, fields: highlightedFields, valid: false, error, description: '', nextDates: [] }
  }
}

function formatNextDate(date: Date, timezone: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: timezone,
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
}

export function CronPage() {
  const [expression, setExpression] = useState('23 0-20/2 * * *')
  const [timezoneMode, setTimezoneMode] = useState<'local' | 'UTC'>('local')
  const inputRef = useRef<HTMLInputElement>(null)
  const localTimezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai', [])
  const timezone = timezoneMode === 'UTC' ? 'UTC' : localTimezone
  const analysis = useMemo(() => analyzeCron(expression, timezone), [expression, timezone])

  const selectField = (index: number) => {
    const input = inputRef.current
    if (!input) return
    input.focus()
    const match = [...expression.matchAll(/\S+/g)][index]
    if (!match || match.index === undefined) {
      input.setSelectionRange(expression.length, expression.length)
      return
    }
    input.setSelectionRange(match.index, match.index + match[0].length)
  }

  return <div className="cron-workspace">
    <div className="workspace-toolbar cron-toolbar">
      {cronPresets.map(([label, value]) => <button key={value} className={expression === value ? 'active' : ''} onClick={() => setExpression(value)}>{label}</button>)}
      <label className="cron-timezone">时区<select value={timezoneMode} onChange={(event) => setTimezoneMode(event.target.value as 'local' | 'UTC')}><option value="local">本地 · {localTimezone}</option><option value="UTC">UTC</option></select></label>
    </div>

    <div className={`cron-input ${analysis.valid ? 'is-valid' : 'is-invalid'}`}>
      <label htmlFor="cron-expression">cron</label>
      <input ref={inputRef} id="cron-expression" value={expression} onChange={(event) => setExpression(event.target.value)} placeholder="分钟 小时 日期 月份 星期" spellCheck={false} autoComplete="off" aria-invalid={!analysis.valid} aria-describedby="cron-status" />
      <CopyButton value={expression} />
    </div>

    <div className="cron-token-strip" aria-label="Cron 字段">
      {analysis.parts.map((part, index) => {
        const field = analysis.fields[index]
        const invalid = index >= cronFields.length || !field?.valid
        return <button key={`${index}-${part}`} className={invalid ? 'invalid' : ''} onClick={() => selectField(index)}><span>{index < cronFields.length ? cronFields[index].label : '多余字段'}</span><code>{part}</code></button>
      })}
      {analysis.parts.length < cronFields.length && cronFields.slice(analysis.parts.length).map((field, offset) => <button key={field.key} className="invalid missing" onClick={() => selectField(analysis.parts.length + offset)}><span>{field.label}</span><code>缺失</code></button>)}
    </div>

    <div className="cron-field-grid">
      {analysis.fields.map((field, index) => <section key={field.definition.key} className={field.valid ? '' : 'invalid'} onClick={() => selectField(index)}>
        <header><span>0{index + 1}</span><strong>{field.definition.label}</strong><code>{field.raw || '—'}</code></header>
        <p>{field.valid ? field.description : field.error}</p>
        <small>允许 {field.definition.hint}</small>
      </section>)}
    </div>

    <div className={`cron-analysis ${analysis.valid ? '' : 'invalid'}`}>
      <section className="cron-description">
        <span className="result-kicker">中文解析</span>
        {analysis.valid ? <><h2>{analysis.description}</h2><p><Check size={15} />表达式有效 · 标准五字段 Cron</p></> : <><h2>{analysis.error}</h2><p><CircleAlert size={15} />请修改高亮字段；不支持 Quartz 的 ?、L、W、# 或秒字段</p></>}
      </section>
      <section className="cron-next-runs">
        <header><div><span className="result-kicker">后续执行时间</span><strong>{timezoneMode === 'UTC' ? 'UTC' : `本地 · ${localTimezone}`}</strong></div><CalendarClock size={19} /></header>
        {analysis.valid ? <ol>{analysis.nextDates.map((date, index) => <li key={date.toISOString()}><span>{String(index + 1).padStart(2, '0')}</span><time dateTime={date.toISOString()}>{formatNextDate(date, timezone)}</time></li>)}</ol> : <div className="cron-next-empty"><Clock3 size={20} /><span>表达式有效后显示未来 5 次执行时间</span></div>}
      </section>
    </div>

    <div id="cron-status" className={`status-line ${analysis.valid ? '' : 'error'}`} role="status">{analysis.valid ? <Check size={15} /> : <CircleAlert size={15} />}{analysis.valid ? `验证通过 · ${analysis.description}` : analysis.error}</div>
  </div>
}

export default CronPage
