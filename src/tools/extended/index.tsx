import {
  Check,
  Clipboard,
  Download,
  FileImage,
  Link2,
  LockKeyhole,
  RefreshCw,
  Sparkles,
  Upload,
  WandSparkles,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CopyButton, EditorPanel } from '../shared/EditorPanel'
import { FileDropZone } from '../shared/FileDropZone'
import { formatBytes } from '../shared/fileUtils'

type MarkupKind = 'html' | 'xml'

function formatMarkup(value: string) {
  const compact = value.replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ').trim()
  let depth = 0
  return compact
    .replace(/></g, '>\n<')
    .split('\n')
    .map((line) => {
      const trimmed = line.trim()
      if (/^<\//.test(trimmed)) depth = Math.max(0, depth - 1)
      const result = `${'  '.repeat(depth)}${trimmed}`
      if (/^<[^!/][^>]*[^/]?>$/.test(trimmed) && !/<\/[^>]+>$/.test(trimmed)) depth += 1
      return result
    })
    .join('\n')
}

function MarkupToolPage({ kind }: { kind: MarkupKind }) {
  const [input, setInput] = useState(kind === 'html' ? '<main><h1>Lumen Tools</h1><p>本地运行。</p></main>' : '<root><item id="1">Lumen</item></root>')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)
  const changeInput = (value: string) => { setInput(value); setOutput(''); setError('') }
  const run = async () => {
    if (!input.trim()) { setError(`请输入 ${kind.toUpperCase()} 内容`); setOutput(''); return }
    setRunning(true)
    try {
      if (kind === 'html') {
        const [{ format }, { default: htmlPlugin }] = await Promise.all([import('prettier/standalone'), import('prettier/plugins/html')])
        setOutput(await format(input, { parser: 'html', plugins: [htmlPlugin], tabWidth: 2, printWidth: 100 }))
      } else {
        const documentValue = new DOMParser().parseFromString(input, 'application/xml')
        const parserError = documentValue.querySelector('parsererror')
        if (parserError) throw new Error(parserError.textContent?.split('\n')[0] || 'XML 结构无效')
        setOutput(formatMarkup(input))
      }
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message.split('\n')[0] : `${kind.toUpperCase()} 格式化失败`)
      setOutput('')
    } finally {
      setRunning(false)
    }
  }
  return <>
    <div className="workspace-toolbar"><button className="primary-action" onClick={() => void run()} disabled={running}><Sparkles size={16} />{running ? '格式化中…' : '格式化'}</button><button onClick={() => { setInput(''); setOutput(''); setError('') }}>清空</button><span className="toolbar-hint">{kind.toUpperCase()} · {kind === 'html' ? 'Prettier 解析格式化' : '结构校验与缩进整理'}</span></div>
    <div className="dual-editor"><EditorPanel label={`输入 ${kind.toUpperCase()}`} value={input} onChange={changeInput} language="markup" /><EditorPanel label={error ? '格式化失败' : '格式化结果'} value={output} readOnly actions={<CopyButton value={output} />} language="markup" emptyMessage={error || '点击格式化生成结果'} /></div>
    <div className={`status-line ${error ? 'error' : ''}`}>{error || (output ? '格式化完成' : '修改输入后需要重新运行')}</div>
  </>
}

export function HtmlToolPage() { return <MarkupToolPage kind="html" /> }
export function XmlToolPage() { return <MarkupToolPage kind="xml" /> }

type SqlDialect = 'sql' | 'mysql' | 'postgresql' | 'sqlite' | 'bigquery' | 'transactsql'
type SqlKeywordCase = 'upper' | 'lower' | 'preserve'

export function SqlToolPage() {
  const [input, setInput] = useState('select id, name, email from users where active = true order by created_at desc limit 20;')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [dialect, setDialect] = useState<SqlDialect>('sql')
  const [keywordCase, setKeywordCase] = useState<SqlKeywordCase>('upper')
  const [running, setRunning] = useState(false)
  const resetOutput = () => { setOutput(''); setError('') }
  const run = async () => {
    if (!input.trim()) { setError('请输入 SQL 查询'); return }
    setRunning(true)
    try {
      const { format } = await import('sql-formatter')
      setOutput(format(input, { language: dialect, keywordCase, tabWidth: 2 }))
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message.split('\n')[0] : 'SQL 格式化失败')
      setOutput('')
    } finally {
      setRunning(false)
    }
  }
  return <>
    <div className="workspace-toolbar"><select aria-label="SQL 方言" value={dialect} onChange={(event) => { setDialect(event.target.value as SqlDialect); resetOutput() }}><option value="sql">标准 SQL</option><option value="mysql">MySQL</option><option value="postgresql">PostgreSQL</option><option value="sqlite">SQLite</option><option value="bigquery">BigQuery</option><option value="transactsql">SQL Server</option></select><select aria-label="关键字大小写" value={keywordCase} onChange={(event) => { setKeywordCase(event.target.value as SqlKeywordCase); resetOutput() }}><option value="upper">关键字大写</option><option value="lower">关键字小写</option><option value="preserve">保持原样</option></select><button className="primary-action" onClick={() => void run()} disabled={running}><Sparkles size={16} />{running ? '格式化中…' : '格式化 SQL'}</button><button onClick={() => { setInput(''); resetOutput() }}>清空</button></div>
    <div className="dual-editor"><EditorPanel label="SQL 查询" value={input} onChange={(value) => { setInput(value); resetOutput() }} /><EditorPanel label={error ? '格式化失败' : '格式化结果'} value={output} readOnly actions={<CopyButton value={output} />} language="sql" emptyMessage={error || '选择方言后运行格式化'} /></div><div className={`status-line ${error ? 'error' : ''}`}>{error || `${dialect.toUpperCase()} · ${keywordCase === 'preserve' ? '保持关键字大小写' : `关键字${keywordCase === 'upper' ? '大写' : '小写'}`}`}</div>
  </>
}

type TypeResult = { type: string; interfaces: string[] }
function jsonTypeName(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return value.length ? `${jsonTypeName(value[0])}[]` : 'unknown[]'
  if (typeof value === 'object') return 'object'
  return typeof value
}
function buildTypes(value: unknown, name: string, interfaces: string[]): TypeResult {
  if (Array.isArray(value)) {
    if (!value.length) return { type: 'unknown[]', interfaces }
    const item = buildTypes(value[0], `${name}Item`, interfaces)
    return { type: `${item.type}[]`, interfaces }
  }
  if (value && typeof value === 'object') {
    const fields = Object.entries(value as Record<string, unknown>).map(([key, item]) => {
      const safeKey = /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key)
      const result = buildTypes(item, `${name}${key[0]?.toUpperCase() || ''}${key.slice(1)}`, interfaces)
      return `  ${safeKey}: ${result.type}`
    })
    interfaces.push(`interface ${name} {\n${fields.join('\n')}\n}`)
    return { type: name, interfaces }
  }
  return { type: jsonTypeName(value), interfaces }
}

export function JsonTypesToolPage() {
  const [input, setInput] = useState('{\n  "name": "Lumen",\n  "tools": 11,\n  "private": true\n}')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const run = () => {
    try {
      const parsed = JSON.parse(input)
      const interfaces: string[] = []
      const root = buildTypes(parsed, 'Root', interfaces)
      setOutput(`${interfaces.reverse().join('\n\n')}\n\nexport type RootValue = ${root.type}`)
      setError('')
    } catch (err) { setError(err instanceof Error ? err.message : 'JSON 无效'); setOutput('') }
  }
  return <>
    <div className="workspace-toolbar"><button className="primary-action" onClick={run}><Sparkles size={16} />生成 TypeScript</button><span className="toolbar-hint">JSON → TypeScript interfaces</span></div>
    <div className="dual-editor"><EditorPanel label="JSON" value={input} onChange={setInput} /><EditorPanel label={error ? '解析失败' : 'TypeScript'} value={error || output} readOnly actions={<CopyButton value={output} />} /></div>
  </>
}

type DiffLine = { type: 'same' | 'add' | 'remove'; text: string; number: string }
function diffLines(left: string, right: string): DiffLine[] {
  const a = left.split('\n'), b = right.split('\n')
  const dp = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i -= 1) for (let j = b.length - 1; j >= 0; j -= 1) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  const result: DiffLine[] = []
  let i = 0, j = 0
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { result.push({ type: 'same', text: a[i], number: `${i + 1}` }); i += 1; j += 1 }
    else if (j >= b.length || (i < a.length && dp[i + 1][j] >= dp[i][j + 1])) { result.push({ type: 'remove', text: a[i], number: `−${i + 1}` }); i += 1 }
    else { result.push({ type: 'add', text: b[j], number: `+${j + 1}` }); j += 1 }
  }
  return result
}

export function DiffToolPage() {
  const [left, setLeft] = useState('const tools = 11\nconst local = true')
  const [right, setRight] = useState('const tools = 28\nconst local = true\nconst private = true')
  const [hideSame, setHideSame] = useState(false)
  const lines = useMemo(() => diffLines(left, right), [left, right])
  const visible = hideSame ? lines.filter((line) => line.type !== 'same') : lines
  const patchText = lines.map((line) => `${line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '} ${line.text}`).join('\n')
  return <div className="stacked-workspace"><div className="workspace-toolbar"><label className="toolbar-check"><input type="checkbox" checked={hideSame} onChange={(event) => setHideSame(event.target.checked)} />隐藏相同行</label><span className="toolbar-hint">逐行比较 · 保留原始换行</span><CopyButton value={patchText} /></div><div className="dual-editor compact"><EditorPanel label="原始文本" value={left} onChange={setLeft} /><EditorPanel label="新文本" value={right} onChange={setRight} /></div><div className="diff-output"><div className="panel-label"><span>差异结果</span><span>{lines.filter((line) => line.type !== 'same').length} 处变化{hideSame ? ' · 已隐藏相同行' : ''}</span></div>{visible.map((line, index) => <div className={`diff-line ${line.type}`} key={`${line.number}-${index}`}><code>{line.number}</code><span>{line.type === 'add' ? '+' : line.type === 'remove' ? '−' : ' '}</span><pre>{line.text || ' '}</pre></div>)}</div></div>
}

const caseWords = (value: string) => value.trim().split(/[^\p{L}\p{N}]+/u).filter(Boolean)
export function CaseConverterPage() {
  const [input, setInput] = useState('Lumen tools make daily work easier')
  const words = caseWords(input)
  const values = [
    ['大写', input.toUpperCase()], ['小写', input.toLowerCase()], ['camelCase', words.map((word, index) => index ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word.toLowerCase()).join('')],
    ['PascalCase', words.map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase()).join('')], ['snake_case', words.map((word) => word.toLowerCase()).join('_')], ['kebab-case', words.map((word) => word.toLowerCase()).join('-')],
  ]
  return <div className="stacked-workspace"><EditorPanel label="输入文本" value={input} onChange={setInput} /><div className="result-lines">{values.map(([label, value]) => <div key={label}><span>{label}</span><code>{value}</code><CopyButton value={value} /></div>)}</div></div>
}

export function TextCleanerPage() {
  const [input, setInput] = useState('  Lumen Tools  \n\n  local-first tools  \nLumen Tools  ')
  const clean = (mode: 'trim' | 'unique' | 'sort') => {
    const lines = input.split('\n').map((line) => line.trim()).filter(Boolean)
    const next = mode === 'unique' ? [...new Set(lines)] : mode === 'sort' ? [...new Set(lines)].sort((a, b) => a.localeCompare(b)) : lines
    setInput(next.join('\n'))
  }
  return <><div className="workspace-toolbar"><button className="primary-action" onClick={() => clean('trim')}>清理空行</button><button onClick={() => clean('unique')}>去重</button><button onClick={() => clean('sort')}>去重并排序</button><button onClick={() => setInput('')}>清空</button></div><EditorPanel label="待处理文本" value={input} onChange={setInput} /></>
}

export function MarkdownToolPage() {
  const [input, setInput] = useState('# Lumen Tools\n\n在浏览器中处理 **Markdown**。\n\n- 本地运行\n- 无需登录')
  const escaped = input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
  const html = escaped.replace(/^### (.*)$/gm, '<h3>$1</h3>').replace(/^## (.*)$/gm, '<h2>$1</h2>').replace(/^# (.*)$/gm, '<h1>$1</h1>').replace(/^[-*] (.*)$/gm, '<li>$1</li>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>').split(/\n{2,}/).map((block) => /^<(h|li)/.test(block) ? block : `<p>${block.replace(/\n/g, '<br />')}</p>`).join('\n')
  return <><div className="dual-editor markdown-editor"><EditorPanel label="Markdown" value={input} onChange={setInput} /><div className="editor-panel"><div className="panel-label"><span>安全 HTML 预览</span><CopyButton value={html} /></div><div className="markdown-preview" dangerouslySetInnerHTML={{ __html: html }} /></div></div><div className="status-line">原始 HTML 默认转义，脚本和事件属性不会执行</div></>
}

function randomBytes(length: number) {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes
}
function secureRandomString(length: number, alphabet: string) {
  let result = ''
  const limit = 256 - (256 % alphabet.length)
  while (result.length < length) {
    const bytes = randomBytes(Math.max(16, Math.ceil((length - result.length) * 1.3)))
    for (const byte of bytes) {
      if (byte < limit) result += alphabet[byte % alphabet.length]
      if (result.length === length) break
    }
  }
  return result
}
export function PasswordGeneratorPage() {
  const [length, setLength] = useState(20)
  const [symbols, setSymbols] = useState(true)
  const [value, setValue] = useState('')
  const alphabet = `ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789${symbols ? '!@#$%^&*_-+=' : ''}`
  const generate = () => setValue(secureRandomString(length, alphabet))
  const entropy = Math.floor(length * Math.log2(alphabet.length))
  return <><div className="generator-controls"><label>长度 <input type="number" min="8" max="128" value={length} onChange={(event) => { setLength(Math.max(8, Math.min(128, Number(event.target.value)))); setValue('') }} /></label><label className="check-label"><input type="checkbox" checked={symbols} onChange={(event) => { setSymbols(event.target.checked); setValue('') }} />包含符号</label><button className="primary-action" onClick={generate}><LockKeyhole size={15} />生成密码</button></div><div className="generated-value"><code>{value || '点击生成一个高强度密码'}</code><CopyButton value={value} /></div><div className="status-line"><Check size={15} />拒绝采样消除取模偏差 · 约 {entropy} bit 熵 · 不保存</div></>
}

function parseBigIntWithBase(input: string, base: number) {
  const clean = input.trim()
  const negative = clean.startsWith('-')
  const body = (negative || clean.startsWith('+') ? clean.slice(1) : clean).toLowerCase()
  const patterns: Record<number, RegExp> = { 2: /^[01]+$/, 8: /^[0-7]+$/, 10: /^\d+$/, 16: /^[\da-f]+$/ }
  if (!patterns[base]?.test(body)) return null
  const prefix = base === 2 ? '0b' : base === 8 ? '0o' : base === 16 ? '0x' : ''
  const parsed = BigInt(`${prefix}${body}`)
  return negative ? -parsed : parsed
}
export function NumberBasePage() {
  const [input, setInput] = useState('255')
  const [base, setBase] = useState('10')
  const number = parseBigIntWithBase(input, Number(base))
  const values = number === null ? [] : [['二进制', number.toString(2)], ['八进制', number.toString(8)], ['十进制', number.toString(10)], ['十六进制', number.toString(16).toUpperCase()]]
  return <div className="stacked-workspace"><div className="generator-controls"><label>输入 <input value={input} onChange={(event) => setInput(event.target.value)} /></label><label>原始进制 <select value={base} onChange={(event) => setBase(event.target.value)}><option value="2">2</option><option value="8">8</option><option value="10">10</option><option value="16">16</option></select></label></div><div className="result-lines">{values.map(([label, value]) => <div key={label}><span>{label}</span><code>{value}</code><CopyButton value={value} /></div>)}</div><div className={`status-line ${number === null ? 'error' : ''}`}>{number === null ? `输入包含非 ${base} 进制字符` : '使用 BigInt 转换整数，不受 53 位安全整数限制'}</div></div>
}

const romanMap: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
function toRoman(value: number) { let result = ''; let rest = value; romanMap.forEach(([number, roman]) => { while (rest >= number) { result += roman; rest -= number } }); return result }
function fromRoman(value: string) { let total = 0; let previous = 0; [...value.toUpperCase()].reverse().forEach((char) => { const number = romanMap.find(([, roman]) => roman[0] === char)?.[0] || 0; total += number < previous ? -number : number; previous = number }); return total }
export function RomanNumeralPage() {
  const [input, setInput] = useState('2026')
  const numeric = Number(input)
  const romanInput = input.trim().toUpperCase()
  const romanValue = fromRoman(romanInput)
  const validRoman = romanValue > 0 && romanValue < 4000 && toRoman(romanValue) === romanInput
  const output = /^\d+$/.test(input) ? (numeric > 0 && numeric < 4000 ? toRoman(numeric) : '') : validRoman ? String(romanValue) : ''
  const error = !output && input ? (/^\d+$/.test(input) ? '请输入 1–3999 的整数' : '罗马数字顺序或减法规则无效') : ''
  return <div className="timestamp-layout"><div className="field-group"><label>数字或罗马数字<input value={input} onChange={(event) => setInput(event.target.value)} /></label><span className="conversion-arrow">→</span><label>转换结果<input value={output} placeholder={error || '转换结果'} readOnly /></label></div><div className={`status-line ${error ? 'error' : ''}`}><RefreshCw size={15} />{error || '支持 1–3999 的标准罗马数字并校验规范写法'}</div></div>
}

const permissionRows = [['读', 4], ['写', 2], ['执行', 1]] as const
export function ChmodPage() {
  const [checked, setChecked] = useState<string[]>(['u4', 'u2', 'g4', 'o1'])
  const toggle = (key: string) => setChecked((items) => items.includes(key) ? items.filter((item) => item !== key) : [...items, key])
  const digit = (scope: string) => permissionRows.reduce((sum, [, bit]) => sum + (checked.includes(`${scope}${bit}`) ? bit : 0), 0)
  const mode = `${digit('u')}${digit('g')}${digit('o')}`
  return <div className="permission-tool"><div className="permission-grid">{[['u', '所有者'], ['g', '用户组'], ['o', '其他用户']].map(([scope, label]) => <div key={scope}><strong>{label}</strong>{permissionRows.map(([name, bit]) => <label key={bit}><input type="checkbox" checked={checked.includes(`${scope}${bit}`)} onChange={() => toggle(`${scope}${bit}`)} />{name}</label>)}</div>)}</div><div className="permission-result"><span>八进制</span><strong>{mode}</strong><span>命令</span><code>chmod {mode} filename</code><CopyButton value={`chmod ${mode} filename`} /></div></div>
}

export function UrlParserPage() {
  const [input, setInput] = useState('https://user:pass@example.com:8443/tools?id=42#local')
  let url: URL | null = null
  try { url = new URL(input) } catch { url = null }
  const values = url ? [['协议', url.protocol], ['主机', url.hostname], ['端口', url.port || '默认'], ['路径', url.pathname], ['查询参数', url.search || '无'], ['片段', url.hash || '无']] : []
  return <div className="stacked-workspace"><EditorPanel label="URL" value={input} onChange={setInput} /><div className="result-lines">{values.map(([label, value]) => <div key={label}><span>{label}</span><code>{value}</code><CopyButton value={value} /></div>)}{!url && <div className="status-line error">URL 格式无效</div>}</div></div>
}

const statuses = [[200, 'OK', '请求成功'], [201, 'Created', '资源创建成功'], [204, 'No Content', '请求成功但无响应体'], [301, 'Moved Permanently', '永久重定向'], [302, 'Found', '临时重定向'], [400, 'Bad Request', '请求参数错误'], [401, 'Unauthorized', '需要身份验证'], [403, 'Forbidden', '服务器拒绝访问'], [404, 'Not Found', '资源不存在'], [429, 'Too Many Requests', '请求过于频繁'], [500, 'Internal Server Error', '服务器内部错误'], [502, 'Bad Gateway', '上游服务无效'], [503, 'Service Unavailable', '服务暂时不可用']] as const
export function HttpStatusPage() {
  const [query, setQuery] = useState('')
  const rows = statuses.filter(([code, name, description]) => `${code} ${name} ${description}`.toLowerCase().includes(query.toLowerCase()))
  return <div className="reference-tool"><div className="reference-search"><Link2 size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="筛选状态码…" /></div><div className="tool-table">{rows.map(([code, name, description]) => <div key={code}><strong>{code}</strong><span>{name}</span><small>{description}</small></div>)}</div></div>
}

const mimeTypes = [['.html', 'text/html'], ['.css', 'text/css'], ['.js', 'text/javascript'], ['.json', 'application/json'], ['.xml', 'application/xml'], ['.csv', 'text/csv'], ['.pdf', 'application/pdf'], ['.zip', 'application/zip'], ['.png', 'image/png'], ['.jpg', 'image/jpeg'], ['.svg', 'image/svg+xml'], ['.webp', 'image/webp'], ['.woff2', 'font/woff2']] as const
export function MimeTypePage() {
  const [query, setQuery] = useState('')
  const rows = mimeTypes.filter(([extension, mime]) => `${extension} ${mime}`.includes(query.toLowerCase()))
  return <div className="reference-tool"><div className="reference-search"><Clipboard size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索扩展名或 MIME 类型…" /></div><div className="tool-table">{rows.map(([extension, mime]) => <div key={extension}><strong>{extension}</strong><code>{mime}</code><CopyButton value={mime} /></div>)}</div></div>
}

const MAX_IMAGE_BYTES = 15 * 1024 * 1024

async function decodeImage(file: File) {
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return { source: bitmap as CanvasImageSource, width: bitmap.width, height: bitmap.height, dispose: () => bitmap.close() }
    } catch { /* formats such as SVG may require the HTMLImageElement decoder */ }
  }
  const url = URL.createObjectURL(file)
  const image = new Image()
  try {
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('浏览器无法解码此图片')); image.src = url })
    return { source: image as CanvasImageSource, width: image.naturalWidth, height: image.naturalHeight, dispose: () => URL.revokeObjectURL(url) }
  } catch (cause) { URL.revokeObjectURL(url); throw cause }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('浏览器无法导出所选格式')), type, quality))
}

export function ImageBase64Page() {
  const [name, setName] = useState('')
  const [size, setSize] = useState(0)
  const [dataUrl, setDataUrl] = useState('')
  const [mode, setMode] = useState<'data-uri' | 'base64'>('data-uri')
  const [error, setError] = useState('')
  const readerRef = useRef<FileReader | null>(null)
  useEffect(() => () => { const reader = readerRef.current; if (reader) { reader.onload = null; reader.onerror = null; if (reader.readyState === FileReader.LOADING) reader.abort() } }, [])
  const onFile = (file: File) => {
    setName(file.name || '剪贴板图片'); setSize(file.size); setDataUrl(''); setError('')
    const previous = readerRef.current
    if (previous) { previous.onload = null; previous.onerror = null; if (previous.readyState === FileReader.LOADING) previous.abort() }
    const reader = new FileReader()
    readerRef.current = reader
    reader.onload = () => { if (readerRef.current === reader) setDataUrl(String(reader.result)) }
    reader.onerror = () => { if (readerRef.current === reader) setError('读取图片失败，请重新选择文件') }
    reader.onloadend = () => { if (readerRef.current === reader) readerRef.current = null }
    reader.readAsDataURL(file)
  }
  const output = mode === 'data-uri' ? dataUrl : dataUrl.slice(dataUrl.indexOf(',') + 1)
  return <div className="image-tool-layout"><FileDropZone accept="image/*" maxBytes={MAX_IMAGE_BYTES} title={name || '选择、拖入或粘贴图片'} detail={name ? `${formatBytes(size)} · 可重复选择同名文件` : `生成 Data URI / Base64 · 最大 ${formatBytes(MAX_IMAGE_BYTES)}`} icon={<Upload size={24} />} enablePaste onFile={onFile} onError={setError} />{dataUrl && <div className="image-preview"><img src={dataUrl} alt={name} /></div>}<div className="converter-options"><label>输出<select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}><option value="data-uri">Data URI</option><option value="base64">纯 Base64</option></select></label><span className="file-summary">{dataUrl ? `${name} · ${formatBytes(size)}` : '等待导入图片'}</span></div><EditorPanel label={mode === 'data-uri' ? 'Data URI' : 'Base64'} value={output} readOnly actions={<CopyButton value={output} />} wrapLongLines emptyMessage={error || '导入或粘贴图片后生成编码'} /><div className={`status-line ${error ? 'error' : ''}`}>{error || (dataUrl ? '图片已在当前浏览器中读取，未上传服务器' : `支持选择、拖拽和 Ctrl/⌘V 粘贴，文件上限 ${formatBytes(MAX_IMAGE_BYTES)}`)}</div></div>
}

type ImageFormat = 'image/png' | 'image/jpeg' | 'image/webp'
type ImageConvertOptions = { format: ImageFormat; quality: number; background: string; width: number; height: number; keepAspect: boolean }
type ConvertedImage = { file: File; url: string; blob: Blob; width: number; height: number; name: string; error?: string }

function convertedDimensions(sourceWidth: number, sourceHeight: number, width: number, height: number, keepAspect: boolean) {
  if (!width && !height) return { width: sourceWidth, height: sourceHeight }
  if (!keepAspect) return { width: width || sourceWidth, height: height || sourceHeight }
  if (width && height) { const scale = Math.min(width / sourceWidth, height / sourceHeight); return { width: Math.max(1, Math.round(sourceWidth * scale)), height: Math.max(1, Math.round(sourceHeight * scale)) } }
  if (width) return { width, height: Math.max(1, Math.round(sourceHeight * width / sourceWidth)) }
  return { width: Math.max(1, Math.round(sourceWidth * height / sourceHeight)), height }
}

async function convertImageOnMain(file: File, options: ImageConvertOptions) {
  const decoded = await decodeImage(file)
  const size = convertedDimensions(decoded.width, decoded.height, options.width, options.height, options.keepAspect)
  if (size.width > 16384 || size.height > 16384 || size.width * size.height > 100_000_000) { decoded.dispose(); throw new Error('输出尺寸超过 16,384 像素边长或 1 亿像素安全上限') }
  const canvas = document.createElement('canvas'); canvas.width = size.width; canvas.height = size.height
  try {
    const context = canvas.getContext('2d')
    if (!context) throw new Error('浏览器无法创建图片画布')
    if (options.format === 'image/jpeg') { context.fillStyle = options.background; context.fillRect(0, 0, size.width, size.height) }
    context.drawImage(decoded.source, 0, 0, size.width, size.height)
  } finally { decoded.dispose() }
  return { blob: await canvasToBlob(canvas, options.format, options.format === 'image/png' ? undefined : options.quality), ...size }
}

function convertImageInWorker(worker: Worker, file: File, options: ImageConvertOptions) {
  return new Promise<{ blob: Blob; width: number; height: number }>((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<{ ok: boolean; blob?: Blob; width?: number; height?: number; error?: string }>) => {
      if (event.data.ok && event.data.blob && event.data.width && event.data.height) resolve({ blob: event.data.blob, width: event.data.width, height: event.data.height })
      else reject(new Error(event.data.error || '图片 Worker 转换失败'))
    }
    worker.onerror = () => reject(new Error('图片 Worker 无法运行'))
    worker.postMessage({ file, ...options })
  })
}

export function ImageConverterPage() {
  const [files, setFiles] = useState<File[]>([])
  const [format, setFormat] = useState<ImageFormat>('image/webp')
  const [quality, setQuality] = useState(0.82)
  const [background, setBackground] = useState('#ffffff')
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [keepAspect, setKeepAspect] = useState(true)
  const [results, setResults] = useState<ConvertedImage[]>([])
  const [selected, setSelected] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const outputUrlsRef = useRef<string[]>([])
  const workerRef = useRef<Worker | null>(null)
  const conversionIdRef = useRef(0)
  const releaseOutputs = useCallback(() => { outputUrlsRef.current.forEach((url) => URL.revokeObjectURL(url)); outputUrlsRef.current = [] }, [])
  useEffect(() => () => { conversionIdRef.current += 1; workerRef.current?.terminate(); releaseOutputs() }, [releaseOutputs])

  const convert = useCallback(async (inputFiles: File[], options: ImageConvertOptions, conversionId: number) => {
    workerRef.current?.terminate()
    let worker: Worker | null = null
    if (typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined') {
      try { worker = new Worker(new URL('./image-converter.worker.ts', import.meta.url), { type: 'module' }); workerRef.current = worker }
      catch { worker = null }
    }
    const next: ConvertedImage[] = []
    for (const file of inputFiles) {
      try {
        let converted
        try { converted = worker ? await convertImageInWorker(worker, file, options) : await convertImageOnMain(file, options) }
        catch { converted = await convertImageOnMain(file, options) }
        if (conversionId !== conversionIdRef.current) break
        const extension = options.format === 'image/jpeg' ? 'jpg' : options.format.split('/')[1]
        const name = `${file.name.replace(/\.[^.]+$/, '') || 'converted'}.${extension}`
        const url = URL.createObjectURL(converted.blob)
        outputUrlsRef.current.push(url)
        next.push({ file, url, name, ...converted })
      } catch (cause) { next.push({ file, url: '', blob: new Blob(), width: 0, height: 0, name: file.name, error: cause instanceof Error ? cause.message : '转换失败' }) }
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    }
    worker?.terminate()
    if (workerRef.current === worker) workerRef.current = null
    if (conversionId !== conversionIdRef.current) { next.forEach((item) => { if (item.url) URL.revokeObjectURL(item.url) }); return }
    setResults(next); setSelected(0); setBusy(false)
    const failures = next.filter((item) => item.error).length
    setError(failures ? `${failures} 个文件转换失败，请查看结果列表` : '')
  }, [])
  useEffect(() => {
    if (!files.length) return
    const conversionId = ++conversionIdRef.current
    workerRef.current?.terminate(); releaseOutputs(); setResults([]); setBusy(true); setError('')
    const parsedWidth = Math.max(0, Number(width) || 0), parsedHeight = Math.max(0, Number(height) || 0)
    const timer = window.setTimeout(() => void convert(files, { format, quality, background, width: parsedWidth, height: parsedHeight, keepAspect }, conversionId), 150)
    return () => window.clearTimeout(timer)
  }, [background, convert, files, format, height, keepAspect, quality, releaseOutputs, width])
  const handleFiles = useCallback((inputFiles: File[]) => {
    const limited = inputFiles.slice(0, 20)
    const total = limited.reduce((sum, file) => sum + file.size, 0)
    if (total > 120 * 1024 * 1024) { setError(`批次总大小 ${formatBytes(total)}，超过 120 MB 上限`); return }
    setFiles(limited); setError(inputFiles.length > limited.length ? '一次最多处理 20 个文件，已忽略其余文件' : '')
  }, [])
  const handleFile = useCallback((inputFile: File) => handleFiles([inputFile]), [handleFiles])
  const current = results[selected]
  const successful = results.filter((item) => !item.error)
  const metadataSummary = successful.length ? `已清除 ${successful.length} 个输出文件的 EXIF / IPTC / XMP 与其他源元数据` : ''
  return <div className="image-tool-layout image-converter-layout">
    <div className="converter-options converter-options-top"><label>输出格式<select value={format} onChange={(event) => setFormat(event.target.value as ImageFormat)}><option value="image/webp">WebP</option><option value="image/jpeg">JPEG</option><option value="image/png">PNG</option></select></label><label>质量 <input type="range" min="0.2" max="1" step="0.01" value={quality} disabled={format === 'image/png'} onChange={(event) => setQuality(Number(event.target.value))} /><code>{format === 'image/png' ? '无损' : `${Math.round(quality * 100)}%`}</code></label>{format === 'image/jpeg' && <label>透明背景<input type="color" value={background} onChange={(event) => setBackground(event.target.value)} /></label>}<label className="metadata-lock"><input type="checkbox" checked readOnly />清除元数据（始终）</label></div>
    <div className="converter-options image-resize-options"><label>宽度<input type="number" min="1" max="16384" value={width} onChange={(event) => setWidth(event.target.value)} placeholder="原宽" /></label><label>高度<input type="number" min="1" max="16384" value={height} onChange={(event) => setHeight(event.target.value)} placeholder="原高" /></label><label><input type="checkbox" checked={keepAspect} onChange={(event) => setKeepAspect(event.target.checked)} />保持比例</label><span className="file-summary">留空保持原尺寸；同时填写时按边界框缩放</span></div>
    <FileDropZone accept="image/*" maxBytes={MAX_IMAGE_BYTES} title={files.length ? `${files.length} 个待处理文件` : '选择或拖入一批图片'} detail={files.length ? `${formatBytes(files.reduce((sum, file) => sum + file.size, 0))} · 最多 20 个文件` : `PNG / JPEG / WebP 等 · 单文件最大 ${formatBytes(MAX_IMAGE_BYTES)}`} icon={<FileImage size={24} />} enablePaste multiple onFile={handleFile} onFiles={handleFiles} onError={setError} />
    {current?.url ? <div className="image-preview"><img src={current.url} alt={`${current.name} 转换结果`} /></div> : <div className="image-preview image-preview-empty"><span>{busy ? '正在本地转换…' : '转换结果预览'}</span></div>}
    <div className="image-batch-results"><div className="panel-label"><span>批量结果</span><span>{busy ? '处理中…' : `${successful.length} / ${results.length || files.length} 完成`}</span></div>{results.map((item, index) => <div className={`${selected === index ? 'selected' : ''} ${item.error ? 'error' : ''}`} key={`${item.file.name}-${index}`}><button onClick={() => setSelected(index)}><strong>{item.name}</strong><span>{item.error || `${item.width}×${item.height} · ${formatBytes(item.file.size)} → ${formatBytes(item.blob.size)}`}</span><small>{item.error ? '未输出' : '元数据已移除'}</small></button>{item.url && <a href={item.url} download={item.name}><Download size={14} />下载</a>}</div>)}</div>
    <div className={`status-line ${error ? 'error' : busy ? 'warning' : ''}`}>{error || (busy ? `正在浏览器${typeof OffscreenCanvas !== 'undefined' ? ' Worker' : '主线程'}中逐个处理，页面仍可响应…` : metadataSummary || '所有文件仅在浏览器本地解码和重编码；输出不会复制 EXIF、IPTC、XMP 或 GPS 元数据')}</div>
  </div>
}

export function FaviconGeneratorPage() {
  const [file, setFile] = useState<File | null>(null)
  const [source, setSource] = useState('')
  const [size, setSize] = useState(128)
  const [error, setError] = useState('')
  const generate = async (inputFile: File, targetSize = size) => {
    setError('')
    try { const decoded = await decodeImage(inputFile); const canvas = document.createElement('canvas'); canvas.width = targetSize; canvas.height = targetSize; try { const context = canvas.getContext('2d'); if (!context) throw new Error('浏览器无法创建图标画布'); context.clearRect(0, 0, targetSize, targetSize); context.drawImage(decoded.source, 0, 0, targetSize, targetSize) } finally { decoded.dispose() }; setSource(canvas.toDataURL('image/png')) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Favicon 生成失败'); setSource('') }
  }
  const handleFile = (inputFile: File) => { setFile(inputFile); void generate(inputFile) }
  const snippet = `<link rel="icon" type="image/png" sizes="${size}x${size}" href="/favicon-${size}.png" />`
  return <div className="image-tool-layout"><FileDropZone accept="image/*" maxBytes={MAX_IMAGE_BYTES} title={file?.name || '选择图片或拖入文件'} detail={file ? `${formatBytes(file.size)} · 当前输出 ${size}×${size}` : `输出多尺寸 PNG 图标 · 最大 ${formatBytes(MAX_IMAGE_BYTES)}`} icon={<Sparkles size={24} />} onFile={handleFile} onError={setError} />{source && <div className="image-preview favicon-preview"><img src={source} alt={`${size}×${size} favicon`} /></div>}<div className="converter-options favicon-sizes"><span>输出尺寸</span>{[16, 32, 64, 128, 256].map((value) => <button key={value} className={size === value ? 'selected' : ''} onClick={() => { setSize(value); if (file) void generate(file, value) }}>{value}</button>)}{source && <a className="favicon-download" href={source} download={`favicon-${size}.png`}><Download size={15} />下载 {size}×{size} PNG</a>}</div><EditorPanel label="HTML" value={source ? snippet : ''} readOnly actions={<CopyButton value={source ? snippet : ''} />} emptyMessage={error || '生成后显示 link 标签'} language="markup" /><div className={`status-line ${error ? 'error' : ''}`}>{error || (source ? '透明背景会保留；可切换尺寸后分别下载' : '建议使用正方形透明 PNG 或 SVG 源图')}</div></div>
}

type SvgOptimizeOptions = { comments: boolean; whitespace: boolean; attributes: boolean; colors: boolean }
type SvgOptimizeResult = { output: string; error: string; changes: Array<[string, number]> }

function compactSvgColor(value: string) {
  const hex = value.match(/^#([\da-f]{6})$/i)?.[1]?.toLowerCase()
  if (hex) return hex[0] === hex[1] && hex[2] === hex[3] && hex[4] === hex[5] ? `#${hex[0]}${hex[2]}${hex[4]}` : `#${hex}`
  const rgb = value.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i)
  if (!rgb) return value
  const channels = rgb.slice(1).map(Number)
  if (channels.some((channel) => channel > 255)) return value
  return compactSvgColor(`#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`)
}

function optimizeSvg(input: string, options: SvgOptimizeOptions): SvgOptimizeResult {
  if (!input.trim()) return { output: '', error: '请输入 SVG 内容', changes: [] }
  const documentValue = new DOMParser().parseFromString(input, 'image/svg+xml')
  const parserError = documentValue.querySelector('parsererror')
  if (parserError || documentValue.documentElement.tagName.toLowerCase() !== 'svg') return { output: '', error: parserError?.textContent?.split('\n')[0] || '根节点必须是 <svg>', changes: [] }
  const counts = { comments: 0, whitespace: 0, attributes: 0, colors: 0 }
  const textSensitive = new Set(['text', 'tspan', 'textpath', 'style', 'script', 'title', 'desc'])
  const colorAttributes = new Set(['fill', 'stroke', 'color', 'flood-color', 'lighting-color', 'stop-color'])
  const visit = (node: Node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.COMMENT_NODE && options.comments) { child.remove(); counts.comments += 1; return }
      if (child.nodeType === Node.TEXT_NODE && options.whitespace && /^\s+$/.test(child.nodeValue || '') && child.parentElement && !textSensitive.has(child.parentElement.localName.toLowerCase())) { child.remove(); counts.whitespace += 1; return }
      if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as Element
        if (options.colors) Array.from(element.attributes).forEach((attribute) => {
          if (!colorAttributes.has(attribute.name.toLowerCase())) return
          const compact = compactSvgColor(attribute.value)
          if (compact !== attribute.value) { element.setAttribute(attribute.name, compact); counts.colors += 1 }
        })
        if (options.attributes && element.attributes.length > 1) {
          const priority = ['xmlns', 'viewBox', 'width', 'height', 'id', 'class']
          const sorted = Array.from(element.attributes).sort((left, right) => {
            const leftIndex = priority.indexOf(left.name), rightIndex = priority.indexOf(right.name)
            if (leftIndex >= 0 || rightIndex >= 0) return (leftIndex < 0 ? priority.length : leftIndex) - (rightIndex < 0 ? priority.length : rightIndex)
            return left.name.localeCompare(right.name)
          })
          if (sorted.some((attribute, index) => attribute.name !== element.attributes[index]?.name)) {
            sorted.forEach((attribute) => element.removeAttributeNode(attribute))
            sorted.forEach((attribute) => element.setAttributeNS(attribute.namespaceURI, attribute.name, attribute.value))
            counts.attributes += 1
          }
        }
        visit(child)
      }
    })
  }
  visit(documentValue.documentElement)
  let output = new XMLSerializer().serializeToString(documentValue.documentElement)
  if (options.whitespace) output = output.replace(/>\s+</g, '><').trim()
  return { output, error: '', changes: [['移除注释', counts.comments], ['清理节点空白', counts.whitespace], ['整理属性顺序', counts.attributes], ['安全压缩颜色', counts.colors]] }
}

export function SvgOptimizerPage() {
  const [input, setInput] = useState('<svg viewBox="0 0 100 100" width="100" height="100" xmlns="http://www.w3.org/2000/svg">\n  <!-- decorative circle -->\n  <circle stroke="#FFFFFF" fill="rgb(187, 243, 93)" r="40" cy="50" cx="50" />\n  <text x="50" y="54" text-anchor="middle"> Lumen </text>\n</svg>')
  const [options, setOptions] = useState<SvgOptimizeOptions>({ comments: true, whitespace: true, attributes: true, colors: true })
  const result = useMemo(() => optimizeSvg(input, options), [input, options])
  const beforeBytes = new Blob([input]).size
  const afterBytes = new Blob([result.output]).size
  const saved = Math.max(0, beforeBytes - afterBytes)
  const percent = beforeBytes ? saved / beforeBytes * 100 : 0
  const toggle = (key: keyof SvgOptimizeOptions) => setOptions((value) => ({ ...value, [key]: !value[key] }))
  return <div className="stacked-workspace svg-optimizer-tool">
    <div className="workspace-toolbar"><label className="toolbar-check"><input type="checkbox" checked={options.comments} onChange={() => toggle('comments')} />移除注释</label><label className="toolbar-check"><input type="checkbox" checked={options.whitespace} onChange={() => toggle('whitespace')} />清理节点空白</label><label className="toolbar-check"><input type="checkbox" checked={options.attributes} onChange={() => toggle('attributes')} />整理属性</label><label className="toolbar-check"><input type="checkbox" checked={options.colors} onChange={() => toggle('colors')} />安全压缩颜色</label><span className="toolbar-hint">不改写 path、ID、ARIA、文本内容或变换</span></div>
    <div className="dual-editor"><EditorPanel label="原始 SVG" value={input} onChange={setInput} language="markup" /><EditorPanel label={result.error ? '优化失败' : '优化结果'} value={result.output} readOnly actions={<CopyButton value={result.output} />} language="markup" emptyMessage={result.error || '输入 SVG 后生成结果'} /></div>
    <div className="svg-optimization-summary"><div><span>优化前</span><strong>{formatBytes(beforeBytes)}</strong></div><div><span>优化后</span><strong>{result.error ? '—' : formatBytes(afterBytes)}</strong></div><div><span>减少</span><strong>{result.error ? '—' : `${formatBytes(saved)} · ${percent.toFixed(1)}%`}</strong></div>{result.changes.map(([label, count]) => <div key={label}><span>{label}</span><strong>{count}</strong></div>)}</div>
    <div className={`status-line ${result.error ? 'error' : ''}`}>{result.error || '差异仅来自所列安全变更；颜色只处理等价的 HEX / 整数 RGB，文本节点内的空白保持不变'}</div>
  </div>
}

function curlToJavascript(input: string) {
  const url = input.match(/curl\s+(?:-X\s+\S+\s+)?['"]?([^'"\s]+)['"]?/i)?.[1] || ''
  const method = input.match(/(?:-X|--request)\s+['"]?(\w+)/i)?.[1]?.toUpperCase() || (/-d\s|--data/.test(input) ? 'POST' : 'GET')
  const headers = Array.from(input.matchAll(/(?:-H|--header)\s+['"]([^'"]+)['"]/gi)).map((match) => match[1].split(/:\s*/, 2))
  const body = input.match(/(?:-d|--data|--data-raw)\s+['"]([\s\S]*?)['"](?:\s|$)/i)?.[1]
  const options = [`  method: '${method}'`, ...headers.length ? [`  headers: ${JSON.stringify(Object.fromEntries(headers))}`] : [], ...(body ? [`  body: ${JSON.stringify(body)}`] : [])]
  return url ? `fetch(${JSON.stringify(url)}, {\n${options.join(',\n')}\n})` : ''
}
export function CurlToCodePage() {
  const [input, setInput] = useState("curl 'https://api.example.com/items' -H 'Accept: application/json'")
  const output = curlToJavascript(input)
  return <><div className="dual-editor"><EditorPanel label="cURL 命令" value={input} onChange={setInput} /><EditorPanel label={output ? 'JavaScript fetch' : '解析失败'} value={output} readOnly actions={<CopyButton value={output} />} emptyMessage={output ? '' : '无法解析此 cURL 命令；请确认包含 URL'} /></div><div className={`status-line ${output ? '' : 'error'}`}>{output ? '已解析请求方法、Header 和 Body' : '暂不执行 Shell 命令，只解析常见 cURL 参数'}</div></>
}

const loremWords = 'lorem ipsum dolor sit amet consectetur adipiscing elit integer viverra sapien sed lectus commodo pretium mauris feugiat nunc posuere dignissim libero'.split(' ')
export function LoremPage() {
  const [amount, setAmount] = useState(3)
  const [unit, setUnit] = useState<'paragraphs' | 'sentences' | 'words'>('paragraphs')
  const [classicStart, setClassicStart] = useState(true)
  const [output, setOutput] = useState('')
  const generate = () => {
    const wordAt = (index: number) => loremWords[(index + (classicStart ? 0 : 7)) % loremWords.length]
    if (unit === 'words') { setOutput(Array.from({ length: amount }, (_, index) => wordAt(index)).join(' ')); return }
    const sentences = Array.from({ length: unit === 'sentences' ? amount : amount * 4 }, (_, sentence) => Array.from({ length: 10 + sentence % 5 }, (_, index) => wordAt(sentence * 7 + index)).join(' ').replace(/^./, (char) => char.toUpperCase()) + '.')
    setOutput(unit === 'sentences' ? sentences.join(' ') : Array.from({ length: amount }, (_, paragraph) => sentences.slice(paragraph * 4, paragraph * 4 + 4).join(' ')).join('\n\n'))
  }
  const max = unit === 'words' ? 500 : unit === 'sentences' ? 50 : 20
  return <><div className="generator-controls lorem-controls"><label>数量 <input type="number" min="1" max={max} value={amount} onChange={(event) => setAmount(Math.max(1, Math.min(max, Number(event.target.value))))} /></label><label>单位<select value={unit} onChange={(event) => { setUnit(event.target.value as typeof unit); setAmount(event.target.value === 'words' ? 80 : 3); setOutput('') }}><option value="paragraphs">段落</option><option value="sentences">句子</option><option value="words">单词</option></select></label><label className="check-label"><input type="checkbox" checked={classicStart} onChange={(event) => setClassicStart(event.target.checked)} />以 Lorem ipsum 开头</label><button className="primary-action" onClick={generate}><WandSparkles size={15} />生成 Lorem Ipsum</button></div><EditorPanel label="占位文本" value={output} readOnly actions={<CopyButton value={output} />} wrapLongLines /><div className="status-line">支持按段落、句子或单词生成，内容仅用于排版占位</div></>
}

const asciiRows = Array.from({ length: 95 }, (_, index) => index + 32)
export function AsciiTablePage() {
  const [query, setQuery] = useState('')
  const rows = asciiRows.filter((code) => `${code} ${String.fromCharCode(code)}`.includes(query))
  return <div className="reference-tool"><div className="reference-search"><Clipboard size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索 ASCII 编码或字符…" /></div><div className="ascii-grid">{rows.map((code) => <div key={code}><strong>{String.fromCharCode(code)}</strong><span>{code}</span><code>0x{code.toString(16).toUpperCase().padStart(2, '0')}</code></div>)}</div></div>
}

export function HtmlEntitiesPage() {
  const [input, setInput] = useState('<section class="hero">Lumen & Tools</section>')
  const [mode, setMode] = useState<'encode' | 'decode'>('encode')
  const output = mode === 'encode' ? input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;') : (() => { const area = document.createElement('textarea'); area.innerHTML = input; return area.value })()
  return <><div className="workspace-toolbar segmented"><button className={mode === 'encode' ? 'active' : ''} onClick={() => setMode('encode')}>编码</button><button className={mode === 'decode' ? 'active' : ''} onClick={() => setMode('decode')}>解码</button></div><div className="dual-editor"><EditorPanel label="输入" value={input} onChange={setInput} /><EditorPanel label="结果" value={output} readOnly actions={<CopyButton value={output} />} /></div></>
}

export function BinaryTextPage() {
  const [input, setInput] = useState('Lumen Tools')
  const [mode, setMode] = useState<'encode' | 'decode'>('encode')
  let output = ''; let error = ''
  if (mode === 'encode') output = Array.from(new TextEncoder().encode(input), (byte) => byte.toString(2).padStart(8, '0')).join(' ')
  else {
    const parts = input.trim().split(/\s+/).filter(Boolean)
    if (parts.some((byte) => !/^[01]{8}$/.test(byte))) error = '每个字节必须是恰好 8 位的二进制数'
    else try { output = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(parts, (byte) => Number.parseInt(byte, 2))) } catch { error = '字节序列不是有效的 UTF-8 文本' }
  }
  return <><div className="workspace-toolbar segmented"><button className={mode === 'encode' ? 'active' : ''} onClick={() => setMode('encode')}>文本 → 二进制</button><button className={mode === 'decode' ? 'active' : ''} onClick={() => setMode('decode')}>二进制 → 文本</button></div><div className="dual-editor"><EditorPanel label="输入" value={input} onChange={setInput} /><EditorPanel label={error ? '解码失败' : '结果'} value={output} readOnly actions={<CopyButton value={output} />} emptyMessage={error || '输入内容后实时转换'} /></div><div className={`status-line ${error ? 'error' : ''}`}>{error || `${new TextEncoder().encode(mode === 'encode' ? input : output).byteLength} 个 UTF-8 字节`}</div></>
}
