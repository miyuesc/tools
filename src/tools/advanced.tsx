import { useEffect, useRef, useState } from 'react'
import { parse as parseToml, stringify as stringifyToml } from 'smol-toml'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { CopyButton, EditorPanel } from './shared/EditorPanel'
import { FileDropZone } from './shared/FileDropZone'
import { formatBytes } from './shared/fileUtils'

function toBase64(bytes: Uint8Array) { let binary = ''; for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000)); return btoa(binary) }
function fromBase64(value: string) { const compact = value.replace(/\s+/g, ''); if (!/^[A-Za-z0-9+/]*={0,2}$/.test(compact) || compact.length % 4 === 1) throw new Error('Base64 格式无效'); return Uint8Array.from(atob(compact), (char) => char.charCodeAt(0)) }
const toHex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
const randomBytes = (size: number) => { const bytes = new Uint8Array(size); crypto.getRandomValues(bytes); return bytes }

export function Base64FilePage() {
  const [name, setName] = useState('')
  const [data, setData] = useState('')
  const [size, setSize] = useState(0)
  const [mode, setMode] = useState<'data-uri' | 'base64'>('data-uri')
  const [error, setError] = useState('')
  const maxBytes = 20 * 1024 * 1024
  const onFile = (file: File) => {
    setName(file.name); setSize(file.size); setData(''); setError('')
    const reader = new FileReader()
    reader.onload = () => setData(String(reader.result))
    reader.onerror = () => setError('读取文件失败，请重新选择')
    reader.readAsDataURL(file)
  }
  const output = mode === 'data-uri' ? data : data.slice(data.indexOf(',') + 1)
  return <div className="file-tool"><FileDropZone maxBytes={maxBytes} title={name || '选择任意文件或拖入此处'} detail={name ? `${formatBytes(size)} · 可重复选择同名文件` : `转换为 Data URI / Base64 · 最大 ${formatBytes(maxBytes)}`} onFile={onFile} onError={setError} /><div className="workspace-toolbar"><select aria-label="文件编码输出" value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}><option value="data-uri">Data URI</option><option value="base64">纯 Base64</option></select><span className="toolbar-hint">{data ? `${name} · ${formatBytes(size)}` : '等待导入文件'}</span></div><EditorPanel label={mode === 'data-uri' ? 'Data URI' : 'Base64'} value={output} readOnly actions={<CopyButton value={output} />} emptyMessage={error || '导入文件后生成编码'} /><div className={`status-line ${error ? 'error' : ''}`}>{error || (data ? '文件已在当前浏览器中读取，未上传服务器' : `文件上限 ${formatBytes(maxBytes)}`)}</div></div>
}

export function BasicAuthPage() {
  const [username, setUsername] = useState('demo')
  const [password, setPassword] = useState('local-only')
  const encoded = toBase64(new TextEncoder().encode(`${username}:${password}`))
  const value = `Authorization: Basic ${encoded}`
  return <div className="stacked-workspace"><div className="form-grid"><label>用户名<input value={username} onChange={(event) => setUsername(event.target.value)} /></label><label>密码<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label></div><EditorPanel label="Authorization Header" value={value} readOnly actions={<CopyButton value={value} />} /><div className="status-line warning">Base64 只是编码，不会加密用户名和密码；请仅通过 HTTPS 传输</div></div>
}

export function ChronometerPage() {
  const [running, setRunning] = useState(false)
  const [startedAt, setStartedAt] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => { if (!running) return; const timer = window.setInterval(() => setElapsed(Date.now() - startedAt), 40); return () => window.clearInterval(timer) }, [running, startedAt])
  const display = `${String(Math.floor(elapsed / 60000)).padStart(2, '0')}:${String(Math.floor(elapsed / 1000) % 60).padStart(2, '0')}.${String(Math.floor(elapsed % 1000)).padStart(3, '0')}`
  return <div className="chronometer"><strong>{display}</strong><div><button className="primary-action" onClick={() => { if (running) setRunning(false); else { setStartedAt(Date.now() - elapsed); setRunning(true) } }}>{running ? '暂停' : '开始'}</button><button onClick={() => { setRunning(false); setElapsed(0) }}>重置</button></div></div>
}

export function DeviceInfoPage() {
  const values = [['平台', navigator.platform], ['语言', navigator.language], ['屏幕', `${window.screen.width} × ${window.screen.height}`], ['视口', `${window.innerWidth} × ${window.innerHeight}`], ['时区', Intl.DateTimeFormat().resolvedOptions().timeZone], ['在线状态', navigator.onLine ? '在线' : '离线'], ['User Agent', navigator.userAgent]]
  return <div className="reference-tool"><div className="tool-table">{values.map(([label, value]) => <div key={label}><strong>{label}</strong><code>{value}</code><CopyButton value={value} /></div>)}</div></div>
}

export function EmailNormalizerPage() {
  const [input, setInput] = useState('  MailTo: Team@Example.COM  ')
  const output = input.trim().replace(/^mailto:/i, '').toLowerCase()
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(output)
  return <div className="dual-editor"><EditorPanel label="Email" value={input} onChange={setInput} /><EditorPanel label={valid ? '标准化结果' : '格式可能无效'} value={output} readOnly actions={<CopyButton value={output} />} /></div>
}

const emojis = ['😀', '😎', '🤖', '🚀', '✨', '🔥', '✅', '❌', '⚡', '💡', '🎉', '❤️', '👍', '👀', '🧩', '🛠️', '📦', '🔒', '🌈', '☕', '🐛', '🦄', '🌍', '🎯', '💻', '📌', '🔗', '📝', '📷', '🧪']
export function EmojiPickerPage() {
  const [query, setQuery] = useState('')
  const visible = emojis.filter((emoji) => !query || emoji.includes(query))
  return <div className="emoji-tool"><div className="reference-search"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入 Emoji 或直接点击…" /></div><div className="emoji-grid">{visible.map((emoji) => <button key={emoji} onClick={() => navigator.clipboard.writeText(emoji)}>{emoji}</button>)}</div><div className="status-line">点击即可复制到剪贴板</div></div>
}

async function hmacDigest(secret: string, message: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return toHex(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))))
}
export function HmacPage() {
  const [secret, setSecret] = useState('lumen-secret')
  const [message, setMessage] = useState('message to sign')
  const [output, setOutput] = useState('')
  return <div className="stacked-workspace"><div className="form-grid"><label>密钥<input value={secret} onChange={(event) => setSecret(event.target.value)} /></label><label>消息<input value={message} onChange={(event) => setMessage(event.target.value)} /></label></div><div className="workspace-toolbar"><button className="primary-action" onClick={async () => setOutput(await hmacDigest(secret, message))}>生成 HMAC-SHA256</button></div><EditorPanel label="摘要" value={output} readOnly actions={<CopyButton value={output} />} /></div>
}

function normalizeIban(value: string) { return value.replace(/\s+/g, '').toUpperCase() }
function ibanValid(value: string) { const iban = normalizeIban(value); if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban) || iban.length < 15) return false; const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`; const digits = [...rearranged].map((char) => /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char).join(''); let remainder = 0; for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97; return remainder === 1 }
export function IbanPage() {
  const [input, setInput] = useState('GB82 WEST 1234 5698 7654 32')
  const normalized = normalizeIban(input)
  return <div className="stacked-workspace"><EditorPanel label="IBAN" value={input} onChange={setInput} /><div className={`status-line ${ibanValid(input) ? '' : 'error'}`}>{ibanValid(input) ? 'IBAN 校验通过（MOD-97）' : 'IBAN 格式或校验码无效'}</div><div className="result-lines"><div><span>标准格式</span><code>{normalized.replace(/(.{4})/g, '$1 ').trim()}</code><CopyButton value={normalized} /></div></div></div>
}

function ipv4Parts(value: string) { const parts = value.trim().split('.').map(Number); return parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255) ? parts : null }
function ipv4Int(parts: number[]) { return (((parts[0] * 256 + parts[1]) * 256 + parts[2]) * 256 + parts[3]) >>> 0 }
function intIpv4(value: number) { return [value >>> 24, (value >>> 16) & 255, (value >>> 8) & 255, value & 255].join('.') }
export function Ipv4AddressPage() {
  const [input, setInput] = useState('192.168.1.10')
  const parts = ipv4Parts(input); const number = parts ? ipv4Int(parts) : 0
  const values = parts ? [['十进制整数', String(number)], ['十六进制', `0x${number.toString(16).padStart(8, '0')}`], ['二进制', number.toString(2).padStart(32, '0')], ['规范地址', intIpv4(number)]] : []
  return <div className="stacked-workspace"><EditorPanel label="IPv4 地址" value={input} onChange={setInput} /><div className="result-lines">{values.map(([label, value]) => <div key={label}><span>{label}</span><code>{value}</code><CopyButton value={value} /></div>)}</div>{!parts && <div className="status-line error">请输入有效的 IPv4 地址</div>}</div>
}

export function Ipv4RangePage() {
  const [start, setStart] = useState('192.168.1.1'); const [end, setEnd] = useState('192.168.1.8')
  const a = ipv4Parts(start), b = ipv4Parts(end); const first = a ? ipv4Int(a) : 0; const last = b ? ipv4Int(b) : 0; const count = last >= first ? last - first + 1 : 0
  const values = count > 0 && count <= 256 ? Array.from({ length: count }, (_, index) => intIpv4(first + index)) : []
  return <div className="stacked-workspace"><div className="form-grid"><label>起始地址<input value={start} onChange={(event) => setStart(event.target.value)} /></label><label>结束地址<input value={end} onChange={(event) => setEnd(event.target.value)} /></label></div><div className="reference-tool"><div className="panel-label"><span>地址列表</span><span>{count > 256 ? '范围过大，仅支持 256 个以内' : `${values.length} 个地址`}</span></div><div className="result-lines">{values.map((value) => <div key={value}><span>IPv4</span><code>{value}</code><CopyButton value={value} /></div>)}</div></div></div>
}

export function Ipv4SubnetPage() {
  const [input, setInput] = useState('192.168.10.42/24')
  const [address, prefixText] = input.split('/'); const parts = ipv4Parts(address); const prefix = Number(prefixText); const valid = Boolean(parts && prefix >= 0 && prefix <= 32); const value = parts ? ipv4Int(parts) : 0; const mask = valid ? (prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0) : 0; const network = value & mask; const broadcast = (network | (~mask >>> 0)) >>> 0
  const values = valid ? [['网络地址', intIpv4(network)], ['广播地址', intIpv4(broadcast)], ['子网掩码', intIpv4(mask)], ['可用地址数', String(prefix >= 31 ? Math.max(0, 2 ** (32 - prefix)) : Math.max(0, 2 ** (32 - prefix) - 2))]] : []
  return <div className="stacked-workspace"><EditorPanel label="CIDR" value={input} onChange={setInput} /><div className="result-lines">{values.map(([label, item]) => <div key={label}><span>{label}</span><code>{item}</code><CopyButton value={item} /></div>)}</div>{!valid && <div className="status-line error">格式示例：192.168.1.0/24</div>}</div>
}

export function Ipv6UlaPage() {
  const [value, setValue] = useState('')
  const generate = () => { const bytes = randomBytes(7); setValue(`fd${toHex(bytes.slice(0, 1))}:${toHex(bytes.slice(1, 3))}:${toHex(bytes.slice(3, 5))}:${toHex(bytes.slice(5, 7))}::/48`) }
  return <div className="generator-controls"><button className="primary-action" onClick={generate}>生成 ULA 前缀</button><code className="generated-inline">{value || 'fdxx:xxxx:xxxx::/48'}</code><CopyButton value={value} /></div>
}

function jsonToCsv(value: unknown) { if (!Array.isArray(value) || !value.length || typeof value[0] !== 'object') throw new Error('请输入对象数组'); const headers = [...new Set(value.flatMap((item) => Object.keys(item as object)))]; const quote = (item: unknown) => { const text = item == null ? '' : typeof item === 'object' ? JSON.stringify(item) : String(item); return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text }; return [headers.join(','), ...value.map((item) => headers.map((header) => quote((item as Record<string, unknown>)[header])).join(','))].join('\n') }
export function JsonCsvPage() {
  const [input, setInput] = useState('[{"name":"Lumen","tools":36},{"name":"IT-Tools","tools":80}]'); const [output, setOutput] = useState(''); const [error, setError] = useState('')
  const run = () => { try { setOutput(jsonToCsv(JSON.parse(input))); setError('') } catch (err) { setError(err instanceof Error ? err.message : 'JSON 无效'); setOutput('') } }
  return <><div className="workspace-toolbar"><button className="primary-action" onClick={run}>JSON → CSV</button>{output && <a className="toolbar-download" href={`data:text/csv;charset=utf-8,${encodeURIComponent(`\uFEFF${output}`)}`} download="lumen-export.csv">下载 CSV</a>}<span className="toolbar-hint">嵌套值序列化为 JSON 字符串</span></div><div className="dual-editor"><EditorPanel label="JSON" value={input} onChange={(value) => { setInput(value); setOutput(''); setError('') }} /><EditorPanel label={error ? '转换失败' : 'CSV'} value={output} readOnly actions={<CopyButton value={output} />} emptyMessage={error || '点击转换生成 CSV'} /></div><div className={`status-line ${error ? 'error' : ''}`}>{error || (output ? `已生成 ${output.split('\n').length - 1} 行数据` : '等待转换')}</div></>
}

function xmlEscape(value: unknown) { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;') }
function xmlName(value: string) { const clean = value.replace(/[^a-zA-Z0-9_.-]/g, '_'); return /^[A-Za-z_]/.test(clean) ? clean : `_${clean || 'item'}` }
function objectToXml(value: unknown, name = 'root'): string { const tag = xmlName(name); if (Array.isArray(value)) return `<${tag}>${value.map((item) => objectToXml(item, 'item')).join('')}</${tag}>`; if (value && typeof value === 'object') return `<${tag}>${Object.entries(value).map(([key, item]) => objectToXml(item, key)).join('')}</${tag}>`; return `<${tag}>${xmlEscape(value)}</${tag}>` }
function formatXml(value: string) { let depth = 0; return value.replace(/>\s+</g, '><').replace(/></g, '>\n<').split('\n').map((line) => { const trimmed = line.trim(); if (trimmed.startsWith('</')) depth -= 1; const result = `${'  '.repeat(Math.max(0, depth))}${trimmed}`; if (/^<[^!/][^>]*[^/]?>$/.test(trimmed) && !/<\/[^>]+>$/.test(trimmed)) depth += 1; return result }).join('\n') }
export function JsonXmlPage() {
  const [input, setInput] = useState('{"name":"Lumen & Tools","ports":[80,443]}'); const [rootName, setRootName] = useState('root'); const [output, setOutput] = useState(''); const [error, setError] = useState('')
  const run = () => { try { setOutput(formatXml(objectToXml(JSON.parse(input), rootName))); setError('') } catch (cause) { setError(dataError(cause, 'JSON 无效')); setOutput('') } }
  const reset = () => { setOutput(''); setError('') }
  return <><div className="workspace-toolbar"><label className="toolbar-field">根节点<input value={rootName} onChange={(event) => { setRootName(event.target.value); reset() }} /></label><button className="primary-action" onClick={run}>JSON → XML</button><span className="toolbar-hint">数组映射为 item 节点，文本自动 XML 转义</span></div><div className="dual-editor"><EditorPanel label="JSON" value={input} onChange={(value) => { setInput(value); reset() }} /><EditorPanel label={error ? '转换失败' : 'XML'} value={output} readOnly actions={<CopyButton value={output} />} emptyMessage={error || '点击转换生成 XML'} /></div><div className={`status-line ${error ? 'error' : ''}`}>{error || (output ? 'XML 已生成并转义特殊字符' : '等待转换')}</div></>
}

export function KeycodePage() {
  const [eventInfo, setEventInfo] = useState(['等待按键…', '', '', ''])
  useEffect(() => { const onKey = (event: KeyboardEvent) => { event.preventDefault(); setEventInfo([event.key, event.code, String(event.keyCode), `${event.ctrlKey ? '⌘/Ctrl ' : ''}${event.shiftKey ? 'Shift ' : ''}${event.altKey ? 'Alt' : ''}`]) }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey) }, [])
  return <div className="keycode-display"><strong>{eventInfo[0]}</strong><div>{[['代码', eventInfo[1]], ['keyCode', eventInfo[2]], ['修饰键', eventInfo[3]]].map(([label, value]) => <div key={label}><span>{label}</span><code>{value || '—'}</code></div>)}</div></div>
}

export function ListConverterPage() {
  const [input, setInput] = useState('alpha, beta\ngamma\nalpha')
  const [separator, setSeparator] = useState<'newline' | 'comma' | 'json'>('newline')
  const items = [...new Set(input.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean))]
  const output = separator === 'newline' ? items.join('\n') : separator === 'comma' ? items.join(', ') : JSON.stringify(items, null, 2)
  return <div className="dual-editor"><EditorPanel label="列表" value={input} onChange={setInput} /><EditorPanel label="转换结果" value={output} readOnly actions={<><select aria-label="列表输出格式" value={separator} onChange={(event) => setSeparator(event.target.value as typeof separator)}><option value="newline">每行一个</option><option value="comma">逗号分隔</option><option value="json">JSON 数组</option></select><CopyButton value={output} /></>} language={separator === 'json' ? 'json' : 'plain'} /></div>
}

export function MacGeneratorPage() {
  const [values, setValues] = useState<string[]>([])
  const generate = () => setValues(Array.from({ length: 5 }, () => { const bytes = randomBytes(6); bytes[0] = (bytes[0] | 2) & 0xfe; return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(':') }))
  return <><div className="generator-controls"><button className="primary-action" onClick={generate}>生成 MAC 地址</button><CopyButton value={values.join('\n')} /></div><div className="result-lines">{values.map((value, index) => <div key={value}><span>{String(index + 1).padStart(2, '0')}</span><code>{value}</code><CopyButton value={value} /></div>)}</div></>
}

export function MetaTagPage() {
  const [title, setTitle] = useState('Lumen Tools')
  const [description, setDescription] = useState('浏览器内运行的开发者工具')
  const [theme, setTheme] = useState('#0b0d0c')
  const output = `<title>${title}</title>\n<meta name="description" content="${description}" />\n<meta name="theme-color" content="${theme}" />\n<meta property="og:title" content="${title}" />\n<meta property="og:description" content="${description}" />`
  return <div className="stacked-workspace"><div className="form-grid"><label>标题<input value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>描述<input value={description} onChange={(event) => setDescription(event.target.value)} /></label><label>主题色<input value={theme} onChange={(event) => setTheme(event.target.value)} /></label></div><EditorPanel label="Meta Tags" value={output} readOnly actions={<CopyButton value={output} />} /></div>
}

export function NumeronymPage() {
  const [input, setInput] = useState('internationalization localization')
  const output = input.split(/\s+/).map((word) => word.length > 2 ? `${word[0]}${word.length - 2}${word.at(-1)}` : word).join(' ')
  return <div className="dual-editor"><EditorPanel label="单词或短语" value={input} onChange={setInput} /><EditorPanel label="Numeronym" value={output} readOnly actions={<CopyButton value={output} />} /></div>
}

export function OtpPage() {
  const [secret, setSecret] = useState('JBSWY3DPEHPK3PXP')
  const [code, setCode] = useState('')
  const [seconds, setSeconds] = useState(Math.floor(Date.now() / 1000) % 30)
  useEffect(() => { const timer = window.setInterval(() => setSeconds(Math.floor(Date.now() / 1000) % 30), 1000); return () => window.clearInterval(timer) }, [])
  const generate = async () => { try { const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; const clean = secret.replace(/=+$/, '').toUpperCase(); let bits = ''; for (const char of clean) bits += alphabet.indexOf(char).toString(2).padStart(5, '0'); const bytes = Uint8Array.from(bits.match(/.{8}/g)?.map((part) => Number.parseInt(part, 2)) || []); const counter = Math.floor(Date.now() / 30000); const counterBytes = new Uint8Array(8); new DataView(counterBytes.buffer).setUint32(4, counter); const key = await crypto.subtle.importKey('raw', bytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']); const hash = new Uint8Array(await crypto.subtle.sign('HMAC', key, counterBytes)); const offset = hash[hash.length - 1] & 15; const number = ((hash[offset] & 127) << 24 | (hash[offset + 1] & 255) << 16 | (hash[offset + 2] & 255) << 8 | (hash[offset + 3] & 255)) % 1_000_000; setCode(String(number).padStart(6, '0')) } catch { setCode('无法解析 Secret') } }
  return <div className="stacked-workspace"><div className="form-grid"><label>TOTP Secret<input value={secret} onChange={(event) => setSecret(event.target.value)} /></label><div className="otp-countdown">剩余 {30 - seconds}s</div></div><div className="generator-controls"><button className="primary-action" onClick={generate}>生成 6 位 OTP</button><code className="generated-inline">{code || '------'}</code><CopyButton value={code} /></div></div>
}

export function PasswordStrengthPage() {
  const [input, setInput] = useState('correct horse battery staple')
  const score = Math.min(100, Math.round(input.length * 3 + (/[A-Z]/.test(input) ? 12 : 0) + (/\d/.test(input) ? 12 : 0) + (/[^A-Za-z0-9]/.test(input) ? 16 : 0)))
  const label = score >= 75 ? '强' : score >= 45 ? '中等' : '弱'
  return <div className="password-strength"><EditorPanel label="密码" value={input} onChange={setInput} /><div className="strength-meter"><div style={{ width: `${score}%` }} /><strong>{label}</strong><span>{score}/100 · {input.length} 个字符</span></div></div>
}

export function PercentagePage() {
  const [value, setValue] = useState('20'); const [total, setTotal] = useState('150'); const [percent, setPercent] = useState('15'); const [result, setResult] = useState('')
  return <div className="stacked-workspace"><div className="form-grid"><label>数值<input value={value} onChange={(event) => setValue(event.target.value)} /></label><label>总数<input value={total} onChange={(event) => setTotal(event.target.value)} /></label><label>百分比<input value={percent} onChange={(event) => setPercent(event.target.value)} /></label></div><div className="workspace-toolbar"><button className="primary-action" onClick={() => setResult(`${value} 占 ${total} 的 ${(Number(value) / Number(total) * 100).toFixed(2)}%；${percent}% 的 ${total} = ${(Number(percent) / 100 * Number(total)).toFixed(2)}`)}>计算</button></div><div className="generated-value"><code>{result || '填写数值后开始计算'}</code></div></div>
}

export function RandomPortPage() { const [value, setValue] = useState(''); const generate = () => { const numbers = new Uint16Array(1); do crypto.getRandomValues(numbers); while (numbers[0] < 1024); setValue(String(numbers[0])) }; return <div className="generator-controls"><button className="primary-action" onClick={generate}>生成随机端口</button><code className="generated-inline">{value || '—'}</code><CopyButton value={value} /><span className="toolbar-hint">crypto.getRandomValues() · 1024–65535</span></div> }

export function SlugifyPage() { const [input, setInput] = useState('Lumen Tools: browser developer tools'); const output = input.normalize('NFKD').replace(/[^\w\s-]/g, '').trim().toLowerCase().replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, ''); return <div className="dual-editor"><EditorPanel label="文本" value={input} onChange={setInput} /><EditorPanel label="Slug" value={output} readOnly actions={<CopyButton value={output} />} /></div> }

export function ObfuscatorPage() { const [input, setInput] = useState('Lumen Tools'); const [mode, setMode] = useState<'hex' | 'unicode'>('hex'); const output = Array.from(input).map((char) => mode === 'hex' ? `\\x${char.charCodeAt(0).toString(16).padStart(2, '0')}` : `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`).join(''); return <div className="stacked-workspace"><div className="workspace-toolbar segmented"><button className={mode === 'hex' ? 'active' : ''} onClick={() => setMode('hex')}>Hex</button><button className={mode === 'unicode' ? 'active' : ''} onClick={() => setMode('unicode')}>Unicode</button></div><div className="dual-editor"><EditorPanel label="文本" value={input} onChange={setInput} /><EditorPanel label="混淆结果" value={output} readOnly actions={<CopyButton value={output} />} /></div></div> }

export function SvgPlaceholderPage() { const [width, setWidth] = useState(640); const [height, setHeight] = useState(360); const [text, setText] = useState('640 × 360'); const output = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#161a17"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#b8f35d" font-family="monospace" font-size="24">${text}</text></svg>`; return <div className="stacked-workspace"><div className="form-grid"><label>宽度<input type="number" value={width} onChange={(event) => setWidth(Number(event.target.value))} /></label><label>高度<input type="number" value={height} onChange={(event) => setHeight(Number(event.target.value))} /></label><label>文本<input value={text} onChange={(event) => setText(event.target.value)} /></label></div><EditorPanel label="SVG Placeholder" value={output} readOnly actions={<CopyButton value={output} />} /></div> }

export function TemperaturePage() { const [value, setValue] = useState('20'); const [from, setFrom] = useState<'C' | 'F' | 'K'>('C'); const [to, setTo] = useState<'C' | 'F' | 'K'>('F'); const [precision, setPrecision] = useState(2); const numeric = Number(value); const celsius = from === 'C' ? numeric : from === 'F' ? (numeric - 32) * 5 / 9 : numeric - 273.15; const valid = Number.isFinite(celsius) && celsius >= -273.15 - Number.EPSILON; const result = to === 'C' ? celsius : to === 'F' ? celsius * 9 / 5 + 32 : celsius + 273.15; return <div className="timestamp-layout"><div className="field-group"><label>数值<input type="number" value={value} onChange={(event) => setValue(event.target.value)} /></label><label>从<select value={from} onChange={(event) => setFrom(event.target.value as typeof from)}><option value="C">°C</option><option value="F">°F</option><option value="K">K</option></select></label><label>到<select value={to} onChange={(event) => setTo(event.target.value as typeof to)}><option value="C">°C</option><option value="F">°F</option><option value="K">K</option></select></label><label>精度<select value={precision} onChange={(event) => setPrecision(Number(event.target.value))}><option value="0">0 位</option><option value="2">2 位</option><option value="4">4 位</option><option value="6">6 位</option></select></label></div><div className="generated-value"><code>{valid ? `${result.toFixed(precision)} ${to === 'K' ? 'K' : `°${to}`}` : '温度不能低于绝对零度'}</code></div><div className={`status-line ${valid ? '' : 'error'}`}>{valid ? `绝对温标基准：−273.15 °C = 0 K` : `当前输入相当于 ${Number.isFinite(celsius) ? celsius.toFixed(2) : '无效'} °C`}</div></div> }

const nato = 'Alfa Bravo Charlie Delta Echo Foxtrot Golf Hotel India Juliett Kilo Lima Mike November Oscar Papa Quebec Romeo Sierra Tango Uniform Victor Whiskey X-ray Yankee Zulu'.split(' ')
export function NatoPage() { const [input, setInput] = useState('Lumen Tools'); const output = input.toUpperCase().split('').map((char) => /[A-Z]/.test(char) ? nato[char.charCodeAt(0) - 65] : char).join(' '); return <div className="dual-editor"><EditorPanel label="文本" value={input} onChange={setInput} /><EditorPanel label="NATO Alphabet" value={output} readOnly actions={<CopyButton value={output} />} /></div> }

export function UnicodePage() { const [input, setInput] = useState('Lumen 工具'); const output = Array.from(input).map((char) => `U+${char.codePointAt(0)?.toString(16).toUpperCase().padStart(4, '0')}`).join(' '); return <div className="dual-editor"><EditorPanel label="文本" value={input} onChange={setInput} /><EditorPanel label="Unicode Code Points" value={output} readOnly actions={<CopyButton value={output} />} /></div> }

export function TokenPage() { const [length, setLength] = useState(32); const [value, setValue] = useState(''); const generate = () => setValue(toBase64(randomBytes(length)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')); return <div className="generator-controls"><label>字节数 <input type="number" min="8" max="128" value={length} onChange={(event) => setLength(Math.max(8, Math.min(128, Number(event.target.value))))} /></label><button className="primary-action" onClick={generate}>生成 Token</button><code className="generated-inline">{value || '点击生成'}</code><CopyButton value={value} /></div> }

function ulidEncode(value: number) { const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; let result = ''; for (let index = 0; index < 10; index += 1) { result = alphabet[value % 32] + result; value = Math.floor(value / 32) } return result }
export function UlidPage() { const [value, setValue] = useState(''); const generate = () => { const timestamp = ulidEncode(Date.now()); const random = Array.from(randomBytes(10), (byte) => '0123456789ABCDEFGHJKMNPQRSTVWXYZ'[byte % 32]).join(''); setValue(`${timestamp}${random}`) }; return <div className="generator-controls"><button className="primary-action" onClick={generate}>生成 ULID</button><code className="generated-inline">{value || '01…'}</code><CopyButton value={value} /></div> }

export function UserAgentPage() { const [input, setInput] = useState(navigator.userAgent); const browser = /Edg\//.test(input) ? 'Edge' : /Chrome\//.test(input) ? 'Chrome' : /Firefox\//.test(input) ? 'Firefox' : /Safari\//.test(input) ? 'Safari' : '未知浏览器'; const os = /Mac OS X/.test(input) ? 'macOS' : /Windows/.test(input) ? 'Windows' : /Android/.test(input) ? 'Android' : /iPhone|iPad/.test(input) ? 'iOS' : /Linux/.test(input) ? 'Linux' : '未知系统'; return <div className="stacked-workspace"><EditorPanel label="User Agent" value={input} onChange={setInput} /><div className="result-lines"><div><span>浏览器</span><code>{browser}</code></div><div><span>系统</span><code>{os}</code></div></div></div> }

function xmlNodeToValue(node: Element, attributes: boolean): unknown {
  const children = Array.from(node.children)
  const attributeValues = attributes && node.attributes.length ? Object.fromEntries(Array.from(node.attributes, (attribute) => [attribute.name, attribute.value])) : null
  const text = Array.from(node.childNodes).filter((child) => child.nodeType === Node.TEXT_NODE).map((child) => child.textContent || '').join('').trim()
  if (!children.length) return attributeValues ? { '@attributes': attributeValues, ...(text ? { '#text': text } : {}) } : text
  const result: Record<string, unknown> = attributeValues ? { '@attributes': attributeValues } : {}
  if (text) result['#text'] = text
  children.forEach((child) => { const value = xmlNodeToValue(child, attributes); result[child.tagName] = result[child.tagName] ? Array.isArray(result[child.tagName]) ? [...result[child.tagName] as unknown[], value] : [result[child.tagName], value] : value })
  return result
}
export function XmlJsonPage() {
  const [input, setInput] = useState('<root><item id="1">Lumen</item><item id="2">Tools</item></root>')
  const [includeAttributes, setIncludeAttributes] = useState(true)
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const reset = () => { setOutput(''); setError('') }
  const run = () => {
    const documentValue = new DOMParser().parseFromString(input, 'application/xml')
    const parserError = documentValue.querySelector('parsererror')
    if (parserError) { setError(parserError.textContent?.split('\n')[0] || 'XML 无效'); setOutput(''); return }
    setOutput(JSON.stringify({ [documentValue.documentElement.tagName]: xmlNodeToValue(documentValue.documentElement, includeAttributes) }, null, 2)); setError('')
  }
  return <><div className="workspace-toolbar"><label className="toolbar-check"><input type="checkbox" checked={includeAttributes} onChange={(event) => { setIncludeAttributes(event.target.checked); reset() }} />保留属性</label><button className="primary-action" onClick={run}>XML → JSON</button><span className="toolbar-hint">属性使用 @attributes，混合文本使用 #text</span></div><div className="dual-editor"><EditorPanel label="XML" value={input} onChange={(value) => { setInput(value); reset() }} /><EditorPanel label={error ? '解析失败' : 'JSON'} value={output} readOnly actions={<CopyButton value={output} />} emptyMessage={error || '点击转换生成 JSON'} /></div><div className={`status-line ${error ? 'error' : ''}`}>{error || (output ? '重复节点已合并为数组' : '等待转换')}</div></>
}

function shellTokens(value: string) { return Array.from(value.matchAll(/"((?:\\.|[^"])*)"|'([^']*)'|([^\s]+)/g), (match) => match[1] ?? match[2] ?? match[3]) }
function dockerCompose(value: string) {
  const tokens = shellTokens(value)
  if (tokens[0] !== 'docker' || tokens[1] !== 'run') throw new Error('命令必须以 docker run 开头')
  let name = 'app', image = ''; const ports: string[] = [], environment: string[] = [], volumes: string[] = []; let network = '', restart = ''; let command: string[] = []
  const take = (index: number, token: string) => { const equal = token.indexOf('='); return equal >= 0 ? { value: token.slice(equal + 1), next: index } : { value: tokens[index + 1] || '', next: index + 1 } }
  for (let index = 2; index < tokens.length; index += 1) {
    const token = tokens[index]
    if (token === '-d' || token === '--detach' || token === '--rm') continue
    const key = token.split('=')[0]
    if (['--name', '-p', '--publish', '-e', '--env', '-v', '--volume', '--network', '--restart'].includes(key)) {
      const item = take(index, token); index = item.next
      if (!item.value) throw new Error(`${key} 缺少参数值`)
      if (key === '--name') name = item.value
      else if (key === '-p' || key === '--publish') ports.push(item.value)
      else if (key === '-e' || key === '--env') environment.push(item.value)
      else if (key === '-v' || key === '--volume') volumes.push(item.value)
      else if (key === '--network') network = item.value
      else restart = item.value
      continue
    }
    if (token.startsWith('-')) throw new Error(`暂不支持参数 ${token}`)
    image = token; command = tokens.slice(index + 1); break
  }
  if (!image) throw new Error('没有找到镜像名称')
  const service: Record<string, unknown> = { image, container_name: name }
  if (ports.length) service.ports = ports
  if (environment.length) service.environment = environment
  if (volumes.length) service.volumes = volumes
  if (network) service.network_mode = network
  if (restart) service.restart = restart
  if (command.length) service.command = command
  return stringifyYaml({ services: { [name]: service } }, { indent: 2, lineWidth: 0 })
}
export function DockerComposePage() {
  const [input, setInput] = useState('docker run -d --name web -p 8080:80 -e NODE_ENV=production -v ./data:/app/data --restart unless-stopped nginx:latest')
  let output = '', error = ''
  try { output = dockerCompose(input) } catch (cause) { error = dataError(cause, '无法解析 docker run 命令') }
  return <><div className="dual-editor"><EditorPanel label="docker run" value={input} onChange={setInput} /><EditorPanel label={error ? '解析失败' : 'docker-compose.yml'} value={output} readOnly actions={<CopyButton value={output} />} emptyMessage={error || '输入 docker run 命令后实时转换'} /></div><div className={`status-line ${error ? 'error' : ''}`}>{error || '支持 name、端口、环境变量、卷、网络、重启策略和启动命令'}</div></>
}

export function CameraRecorderPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [recording, setRecording] = useState(false)
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [seconds, setSeconds] = useState(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])

  useEffect(() => {
    if (!recording) return
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [recording])
  useEffect(() => () => {
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop())
    if (url) URL.revokeObjectURL(url)
  }, [url])

  const start = async () => {
    setError('')
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('当前浏览器不支持摄像头录制')
      const next = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      setStream(next)
      if (videoRef.current) { videoRef.current.srcObject = next; await videoRef.current.play() }
      chunks.current = []
      setSeconds(0)
      const recorder = new MediaRecorder(next)
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data) }
      recorder.onstop = () => {
        const nextUrl = URL.createObjectURL(new Blob(chunks.current, { type: recorder.mimeType }))
        setUrl((previous) => { if (previous) URL.revokeObjectURL(previous); return nextUrl })
      }
      recorder.start()
      recorderRef.current = recorder
      setRecording(true)
    } catch (cause) {
      setError(cause instanceof DOMException && cause.name === 'NotAllowedError' ? '摄像头或麦克风权限被拒绝，请在浏览器站点设置中允许后重试' : dataError(cause, '无法启动摄像头'))
    }
  }
  const stop = () => {
    if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop()
    stream?.getTracks().forEach((track) => track.stop())
    if (videoRef.current) videoRef.current.srcObject = null
    setStream(null)
    setRecording(false)
  }
  return <div className="camera-tool"><video ref={videoRef} muted playsInline /><div className="workspace-toolbar"><button className="primary-action" onClick={recording ? stop : start}>{recording ? `停止录制 · ${seconds}s` : '开始摄像头录制'}</button>{url && <a className="download-link" href={url} download="lumen-recording.webm">下载 WebM</a>}</div><div className={`status-line ${error ? 'error' : ''}`}>{error || (recording ? '正在本地录制，离开页面会自动释放摄像头和麦克风' : '需要浏览器授权；媒体内容只在当前页面处理')}</div></div>
}

export function SafeLinkPage() { const [input, setInput] = useState('https://safelinks.protection.outlook.com/?url=https%3A%2F%2Fexample.com%2Fdocs'); let output = ''; try { const url = new URL(input); output = url.searchParams.get('url') || url.searchParams.get('q') || url.searchParams.get('u') || input } catch { output = 'URL 无效' } return <div className="dual-editor"><EditorPanel label="安全链接" value={input} onChange={setInput} /><EditorPanel label="原始地址" value={output} readOnly actions={<CopyButton value={output} />} /></div> }

const knownOuis: Record<string, string> = { '001C42': 'Parallels, Inc.', '3C5A37': 'Apple, Inc.', 'F4F5D8': 'Google, Inc.', 'B827EB': 'Raspberry Pi Foundation', 'DC2C6E': 'Xiaomi Communications' }
export function MacLookupPage() { const [input, setInput] = useState('B8:27:EB:12:34:56'); const prefix = input.replace(/[^0-9A-F]/gi, '').slice(0, 6).toUpperCase(); const vendor = knownOuis[prefix] || '本地内置 OUI 表中没有该厂商'; return <div className="stacked-workspace"><EditorPanel label="MAC 地址" value={input} onChange={setInput} /><div className="status-line">OUI {prefix || '—'} · {vendor}</div></div> }

export function RegexMemoPage() { const snippets = [['邮箱', '[\\w.+-]+@[\\w.-]+\\.[A-Za-z]{2,}'], ['IPv4', '(?:\\d{1,3}\\.){3}\\d{1,3}'], ['URL', 'https?://[^\\s]+'], ['日期', '\\d{4}-\\d{2}-\\d{2}'], ['十六进制颜色', '#(?:[0-9a-fA-F]{3}){1,2}']]; const [value, setValue] = useState(snippets[0][1]); return <div className="stacked-workspace"><div className="workspace-toolbar">{snippets.map(([label, regex]) => <button key={label} onClick={() => setValue(regex)}>{label}</button>)}</div><EditorPanel label="正则备忘" value={value} onChange={setValue} actions={<CopyButton value={value} />} /></div> }

export function GitMemoPage() { const [input, setInput] = useState(() => localStorage.getItem('lumen-git-memo') || 'git status\ngit add .\ngit commit -m "message"\ngit log --oneline'); useEffect(() => localStorage.setItem('lumen-git-memo', input), [input]); return <div className="stacked-workspace"><EditorPanel label="Git 命令备忘" value={input} onChange={setInput} actions={<CopyButton value={input} />} /><div className="status-line">自动保存在本机浏览器，不会上传</div></div> }

export function BenchmarkPage() { const [rounds, setRounds] = useState(10000); const [result, setResult] = useState(''); const run = () => { const start = performance.now(); let checksum = 0; for (let index = 0; index < rounds; index += 1) checksum = (checksum + JSON.stringify({ index, value: 'lumen' }).length) % 100000; setResult(`${(performance.now() - start).toFixed(2)} ms · checksum ${checksum}`) }; return <div className="generator-controls"><label>轮数 <input type="number" min="100" max="1000000" value={rounds} onChange={(event) => setRounds(Math.max(100, Math.min(1_000_000, Number(event.target.value))))} /></label><button className="primary-action" onClick={run}>运行 JSON 基准</button><code className="generated-inline">{result || '—'}</code></div> }

function pem(label: string, buffer: ArrayBuffer) { const binary = String.fromCharCode(...new Uint8Array(buffer)); const base64 = btoa(binary).match(/.{1,64}/g)?.join('\n') || ''; return `-----BEGIN ${label}-----\n${base64}\n-----END ${label}-----` }
export function RsaKeyPage() { const [publicKey, setPublicKey] = useState(''); const [privateKey, setPrivateKey] = useState(''); const generate = async () => { const pair = await crypto.subtle.generateKey({ name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['encrypt', 'decrypt']); const pub = await crypto.subtle.exportKey('spki', pair.publicKey); const priv = await crypto.subtle.exportKey('pkcs8', pair.privateKey); setPublicKey(pem('PUBLIC KEY', pub)); setPrivateKey(pem('PRIVATE KEY', priv)) }; return <div className="stacked-workspace"><div className="workspace-toolbar"><button className="primary-action" onClick={generate}>生成 RSA-OAEP 密钥对</button></div><div className="dual-editor"><EditorPanel label="Public Key" value={publicKey} readOnly actions={<CopyButton value={publicKey} />} /><EditorPanel label="Private Key" value={privateKey} readOnly actions={<CopyButton value={privateKey} />} /></div></div> }

function dataError(error: unknown, fallback: string) { return error instanceof Error ? error.message.split('\n')[0] : fallback }
function yamlToJson(value: string) { return JSON.stringify(parseYaml(value), null, 2) }

export function JsonYamlPage() {
  const [input, setInput] = useState('{\n  "name": "Lumen",\n  "items": ["JSON", "YAML"],\n  "local": true\n}')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const changeInput = (value: string) => { setInput(value); setOutput(''); setError('') }
  const run = () => {
    try { setOutput(stringifyYaml(JSON.parse(input), { indent: 2, lineWidth: 0 })); setError('') }
    catch (cause) { setError(dataError(cause, 'JSON 无效')); setOutput('') }
  }
  return <><div className="workspace-toolbar"><button className="primary-action" onClick={run}>JSON → YAML</button><span className="toolbar-hint">支持嵌套对象、数组、多行字符串和完整类型</span></div><div className="dual-editor"><EditorPanel label="JSON" value={input} onChange={changeInput} /><EditorPanel label={error ? '转换失败' : 'YAML'} value={output} readOnly actions={<CopyButton value={output} />} emptyMessage={error || '点击转换生成 YAML'} /></div>{error && <div className="status-line error">{error}</div>}</>
}

function YamlPreview({ viewer = false }: { viewer?: boolean }) {
  const [input, setInput] = useState('name: Lumen\nitems:\n  - JSON\n  - YAML\nconfig:\n  local: true')
  let output = ''; let error = ''
  try { output = yamlToJson(input) } catch (cause) { error = dataError(cause, 'YAML 无效') }
  return <><div className="dual-editor"><EditorPanel label="YAML" value={input} onChange={setInput} /><EditorPanel label={error ? '解析失败' : viewer ? '结构预览' : 'JSON'} value={error ? '' : output} readOnly actions={<CopyButton value={output} />} emptyMessage={error || '输入 YAML 后实时解析'} /></div><div className={`status-line ${error ? 'error' : ''}`}>{error || '实时解析 · 保留数组、嵌套结构与标量类型'}</div></>
}

export function YamlJsonPage() { return <YamlPreview /> }
export function YamlViewerPage() { return <YamlPreview viewer /> }

function tomlToObject(value: string) { return parseToml(value, { integersAsBigInt: 'asNeeded' }) }
function tomlJson(value: unknown) { return JSON.stringify(value, (_key, item: unknown) => typeof item === 'bigint' ? item.toString() : item, 2) }

export function JsonTomlPage() {
  const [input, setInput] = useState('{\n  "name": "Lumen",\n  "ports": [80, 443],\n  "database": { "enabled": true, "host": "localhost" }\n}')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const changeInput = (value: string) => { setInput(value); setOutput(''); setError('') }
  const run = () => {
    try {
      const parsed = JSON.parse(input) as unknown
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('TOML 顶层必须是 JSON 对象')
      setOutput(stringifyToml(parsed))
      setError('')
    } catch (cause) { setError(dataError(cause, 'JSON 无效')); setOutput('') }
  }
  return <><div className="workspace-toolbar"><button className="primary-action" onClick={run}>JSON → TOML</button><span className="toolbar-hint">支持嵌套表、数组与数组表</span></div><div className="dual-editor"><EditorPanel label="JSON" value={input} onChange={changeInput} /><EditorPanel label={error ? '转换失败' : 'TOML'} value={output} readOnly actions={<CopyButton value={output} />} emptyMessage={error || '点击转换生成 TOML'} /></div><div className={`status-line ${error ? 'error' : ''}`}>{error || 'TOML 1.1 兼容序列化'}</div></>
}

function TomlPreview({ target }: { target: 'json' | 'yaml' }) {
  const [input, setInput] = useState('title = "Lumen"\nports = [80, 443]\n\n[[servers]]\nname = "alpha"\nenabled = true\n\n[[servers]]\nname = "beta"\nenabled = false')
  let output = ''; let error = ''
  try { const value = tomlToObject(input); output = target === 'json' ? tomlJson(value) : stringifyYaml(value, { indent: 2, lineWidth: 0 }) }
  catch (cause) { error = dataError(cause, 'TOML 无效') }
  return <><div className="dual-editor"><EditorPanel label="TOML" value={input} onChange={setInput} /><EditorPanel label={error ? '解析失败' : target.toUpperCase()} value={output} readOnly actions={<CopyButton value={output} />} emptyMessage={error || `输入 TOML 后实时生成 ${target.toUpperCase()}`} /></div><div className={`status-line ${error ? 'error' : ''}`}>{error || '实时解析 · 支持嵌套表、数组表、日期和转义'}</div></>
}

export function TomlJsonPage() { return <TomlPreview target="json" /> }
export function TomlYamlPage() { return <TomlPreview target="yaml" /> }

function evaluateMath(value: string) { const tokens = value.match(/\d+(?:\.\d+)?|[()+\-*/%]/g); if (!tokens || tokens.join('') !== value.replace(/\s+/g, '')) throw new Error('仅支持数字、括号和 + - * / %'); let index = 0; const factor = (): number => { const token = tokens[index++]; if (token === '(') { const result = expression(); if (tokens[index++] !== ')') throw new Error('括号不匹配'); return result } if (token === '-') return -factor(); const number = Number(token); if (!Number.isFinite(number)) throw new Error('表达式无效'); return number }; const term = (): number => { let result = factor(); while (['*', '/', '%'].includes(tokens[index])) { const operator = tokens[index++]; const next = factor(); if ((operator === '/' || operator === '%') && next === 0) throw new Error('不能除以零'); result = operator === '*' ? result * next : operator === '/' ? result / next : result % next } return result }; const expression = (): number => { let result = term(); while (['+', '-'].includes(tokens[index])) { const operator = tokens[index++]; const next = term(); result = operator === '+' ? result + next : result - next } return result }; const result = expression(); if (index !== tokens.length || !Number.isFinite(result)) throw new Error('表达式无效'); return result }
export function MathEvaluatorPage() { const [input, setInput] = useState('(36 + 4) * 2 / 5'); let output = ''; try { output = String(evaluateMath(input)) } catch (error) { output = error instanceof Error ? error.message : '表达式无效' } return <div className="stacked-workspace"><EditorPanel label="数学表达式" value={input} onChange={setInput} /><div className="generated-value"><code>{output}</code><CopyButton value={output} /></div></div> }

export function EtaPage() { const [total, setTotal] = useState('100'); const [done, setDone] = useState('40'); const [elapsed, setElapsed] = useState('30'); const totalValue = Number(total), doneValue = Number(done), elapsedValue = Number(elapsed); const valid = Number.isFinite(totalValue) && Number.isFinite(doneValue) && Number.isFinite(elapsedValue) && totalValue > 0 && doneValue >= 0 && doneValue <= totalValue && elapsedValue >= 0; const remaining = valid ? totalValue - doneValue : 0; const seconds = valid && doneValue > 0 ? remaining * elapsedValue / doneValue : 0; const progress = valid ? Math.round(doneValue / totalValue * 100) : 0; return <div className="stacked-workspace"><div className="form-grid"><label>总任务<input type="number" min="1" value={total} onChange={(event) => setTotal(event.target.value)} /></label><label>已完成<input type="number" min="0" value={done} onChange={(event) => setDone(event.target.value)} /></label><label>已耗时（秒）<input type="number" min="0" value={elapsed} onChange={(event) => setElapsed(event.target.value)} /></label></div><div className="generated-value"><code>{valid ? doneValue === 0 ? '完成一部分任务后才能估算剩余时间' : `预计剩余 ${Math.round(seconds)} 秒 · 完成度 ${progress}%` : '请输入有效范围：0 ≤ 已完成 ≤ 总任务'}</code></div><div className={`status-line ${valid ? '' : 'error'}`}>{valid ? `剩余 ${remaining} 项` : '输入超出允许范围'}</div></div> }

const AES_ITERATIONS = 210_000
async function aesKey(password: string, salt: Uint8Array) { const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']); return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: AES_ITERATIONS }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']) }
export function EncryptionPage() {
  const [password, setPassword] = useState('lumen-password')
  const [input, setInput] = useState('local encrypted message')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt')
  const resetResult = () => { setOutput(''); setError('') }
  const run = async () => {
    if (!password) { setError('密码不能为空'); return }
    if (!input) { setError('输入内容不能为空'); return }
    setBusy(true); setError('')
    try {
      if (mode === 'encrypt') {
        const salt = randomBytes(16), iv = randomBytes(12), key = await aesKey(password, salt)
        const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(input)))
        setOutput(toBase64(new Uint8Array([1, ...salt, ...iv, ...cipher])))
      } else {
        const bytes = fromBase64(input)
        if (bytes.length < 46 || bytes[0] !== 1) throw new Error('密文版本或长度无效')
        const salt = bytes.slice(1, 17), iv = bytes.slice(17, 29), cipher = bytes.slice(29), key = await aesKey(password, salt)
        const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher)
        setOutput(new TextDecoder('utf-8', { fatal: true }).decode(plain))
      }
    } catch (cause) { setError(mode === 'decrypt' && cause instanceof DOMException ? '解密失败：密码错误或密文已损坏' : cause instanceof Error ? cause.message : '处理失败'); setOutput('') }
    finally { setBusy(false) }
  }
  return <div className="stacked-workspace"><div className="form-grid"><label>密码<input type="password" value={password} onChange={(event) => { setPassword(event.target.value); resetResult() }} autoComplete="new-password" /></label><label>模式<select value={mode} onChange={(event) => { setMode(event.target.value as typeof mode); setInput(''); resetResult() }}><option value="encrypt">加密</option><option value="decrypt">解密</option></select></label></div><div className="workspace-toolbar"><button className="primary-action" onClick={() => void run()} disabled={busy}>{busy ? '处理中…' : mode === 'encrypt' ? 'AES-GCM 加密' : 'AES-GCM 解密'}</button><button onClick={() => { setPassword(''); resetResult() }}>清空密码</button><span className="toolbar-hint">AES-256-GCM · PBKDF2-SHA256 · {AES_ITERATIONS.toLocaleString()} 次</span></div><div className="dual-editor"><EditorPanel label={mode === 'encrypt' ? '明文' : 'Base64 密文'} value={input} onChange={(value) => { setInput(value); resetResult() }} /><EditorPanel label={error ? '处理失败' : mode === 'encrypt' ? 'Base64 密文' : '明文'} value={output} readOnly actions={<CopyButton value={output} />} emptyMessage={error || '运行后显示结果'} /></div><div className={`status-line ${error ? 'error' : 'warning'}`}>{error || '每次加密使用随机 Salt 和 IV；这是本地便捷工具，不代替生产密钥管理系统'}</div></div>
}

type JsonDiffLine = { type: 'add' | 'remove' | 'context'; leftNumber?: number; rightNumber?: number; text: string }

function jsonLines(value: string) {
  const parsed = JSON.parse(value) as unknown
  return JSON.stringify(parsed, null, 2).split('\n')
}

function createJsonDiff(left: string[], right: string[]): JsonDiffLine[] {
  const table = Array.from({ length: left.length + 1 }, () => Array<number>(right.length + 1).fill(0))
  for (let row = left.length - 1; row >= 0; row -= 1) {
    for (let column = right.length - 1; column >= 0; column -= 1) {
      table[row][column] = left[row] === right[column] ? table[row + 1][column + 1] + 1 : Math.max(table[row + 1][column], table[row][column + 1])
    }
  }

  const lines: JsonDiffLine[] = []
  let row = 0; let column = 0; let leftNumber = 1; let rightNumber = 1
  while (row < left.length || column < right.length) {
    if (row < left.length && column < right.length && left[row] === right[column]) {
      lines.push({ type: 'context', leftNumber, rightNumber, text: left[row] }); row += 1; column += 1; leftNumber += 1; rightNumber += 1
    } else if (row < left.length && (column === right.length || table[row + 1][column] >= table[row][column + 1])) {
      lines.push({ type: 'remove', leftNumber, text: left[row] }); row += 1; leftNumber += 1
    } else {
      lines.push({ type: 'add', rightNumber, text: right[column] }); column += 1; rightNumber += 1
    }
  }
  return lines
}

export function JsonDiffPage() {
  const [left, setLeft] = useState('{"name":"Lumen","tools":36}')
  const [right, setRight] = useState('{"name":"Lumen","tools":70}')
  const [context, setContext] = useState<'3' | 'all'>('3')
  const [hideSame, setHideSame] = useState(false)
  let leftPretty = ''; let rightPretty = ''; let error = ''
  try { leftPretty = jsonLines(left).join('\n'); rightPretty = jsonLines(right).join('\n') } catch { error = '请输入有效 JSON，差异结果会在两侧内容都有效后生成' }
  const leftLines = leftPretty.split('\n'), rightLines = rightPretty.split('\n')
  if (!error && leftLines.length * rightLines.length > 2_000_000) error = '格式化后的 JSON 过大，请将每侧控制在约 1,400 行以内再比较'
  const lines = error ? [] : createJsonDiff(leftLines, rightLines)
  const removed = lines.filter((line) => line.type === 'remove').length
  const added = lines.filter((line) => line.type === 'add').length
  const visibleLines = hideSame ? lines.filter((line) => line.type !== 'context') : context === 'all' ? lines : lines.filter((line, index) => line.type !== 'context' || lines.some((candidate, candidateIndex) => candidate.type !== 'context' && Math.abs(candidateIndex - index) <= 3))
  const diffText = lines.map((line) => `${line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '} ${line.text}`).join('\n')
  const formatBoth = () => {
    try { setLeft(jsonLines(left).join('\n')) } catch { /* invalid input stays editable */ }
    try { setRight(jsonLines(right).join('\n')) } catch { /* invalid input stays editable */ }
  }
  const swap = () => { setLeft(right); setRight(left) }

  return <div className="json-diff-tool">
    <div className="workspace-toolbar">
      <button className="primary-action" onClick={formatBoth}>格式化两侧</button>
      <button onClick={swap}>交换输入</button>
      <select aria-label="差异上下文行" value={context} disabled={hideSame} onChange={(event) => setContext(event.target.value as '3' | 'all')}><option value="3">3 行上下文</option><option value="all">全部上下文</option></select>
      <label className="toolbar-check"><input type="checkbox" checked={hideSame} onChange={(event) => setHideSame(event.target.checked)} />隐藏相同内容</label>
      <span className="toolbar-hint">左侧为基准，右侧为对比</span>
    </div>
    <div className="json-diff-inputs">
      <EditorPanel label="JSON A · 基准" value={left} onChange={setLeft} placeholder="粘贴第一份 JSON…" />
      <EditorPanel label="JSON B · 对比" value={right} onChange={setRight} placeholder="粘贴第二份 JSON…" />
    </div>
    <section className="json-diff-result" aria-live="polite">
      <div className="json-diff-result-head">
        <div><span className="result-kicker">DIFF RESULT</span><strong>结构差异</strong><small>{error || (added || removed ? hideSame ? '已隐藏全部相同内容' : '显示新增、删除和上下文行' : '两份 JSON 内容一致')}</small></div>
        <div className="diff-summary"><span className="summary-add">+{added} 新增</span><span className="summary-remove">−{removed} 删除</span>{!error && <CopyButton value={diffText} />}</div>
      </div>
      {error ? <div className="json-diff-empty error">{error}</div> : added === 0 && removed === 0 ? <div className="json-diff-empty">两份 JSON 完全一致，无需合并。</div> : <div className="json-diff-lines">{visibleLines.map((line, index) => <div className={`json-diff-line ${line.type}`} key={`${line.type}-${index}-${line.text}`}><code>{line.leftNumber ?? ''}</code><code>{line.rightNumber ?? ''}</code><span>{line.type === 'add' ? '+' : line.type === 'remove' ? '−' : '·'}</span><pre>{line.text}</pre></div>)}</div>}
    </section>
  </div>
}
