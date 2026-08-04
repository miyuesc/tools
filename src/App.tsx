import {
  ArrowLeftRight,
  Braces,
  Check,
  Clock3,
  Code2,
  Copy,
  Fingerprint,
  Github,
  Hash,
  Heart,
  KeyRound,
  Link2,
  Menu,
  Moon,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Regex,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  TextCursorInput,
  Trash2,
  WandSparkles,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'

type ToolId = 'json' | 'base64' | 'url' | 'jwt' | 'uuid' | 'hash' | 'timestamp' | 'text' | 'color' | 'regex'
type Category = '编码' | '开发' | '文本' | '生成'

type ToolDefinition = {
  id: ToolId
  name: string
  description: string
  category: Category
  icon: LucideIcon
  tags: string[]
  accent: string
}

const tools: ToolDefinition[] = [
  { id: 'json', name: 'JSON 工作台', description: '格式化、压缩与验证 JSON 数据', category: '开发', icon: Braces, tags: ['json', '格式化', 'validate'], accent: '#b8f35d' },
  { id: 'base64', name: 'Base64 编解码', description: '安全处理 UTF-8 文本与 Base64', category: '编码', icon: ArrowLeftRight, tags: ['base64', '编码', '解码'], accent: '#8ad8ff' },
  { id: 'url', name: 'URL 编解码', description: '转换 URL 组件与查询参数', category: '编码', icon: Link2, tags: ['url', 'encode', 'decode'], accent: '#c4a7ff' },
  { id: 'jwt', name: 'JWT 解码器', description: '在本地查看 Header 与 Payload', category: '开发', icon: KeyRound, tags: ['jwt', 'token', 'debug'], accent: '#ffb86b' },
  { id: 'uuid', name: 'UUID 生成器', description: '批量生成标准 UUID v4', category: '生成', icon: Fingerprint, tags: ['uuid', 'guid', '生成'], accent: '#ff8fa3' },
  { id: 'hash', name: '哈希生成器', description: '生成 SHA-1 / SHA-256 / SHA-512 摘要', category: '生成', icon: Hash, tags: ['hash', 'sha', '摘要'], accent: '#7ee2c8' },
  { id: 'timestamp', name: '时间戳转换', description: 'Unix 时间戳与本地时间互转', category: '开发', icon: Clock3, tags: ['时间戳', 'unix', 'date'], accent: '#ffd166' },
  { id: 'text', name: '文本统计', description: '统计字符、词语、行数与阅读时间', category: '文本', icon: TextCursorInput, tags: ['文本', '统计', '字数'], accent: '#8fb8ff' },
  { id: 'color', name: '颜色转换', description: 'HEX、RGB 与 HSL 即时互转', category: '开发', icon: Palette, tags: ['颜色', 'hex', 'rgb'], accent: '#fa9fd9' },
  { id: 'regex', name: '正则测试器', description: '实时测试表达式与匹配结果', category: '开发', icon: Regex, tags: ['regex', '正则', '匹配'], accent: '#a6e3a1' },
]

const categories: { label: Category | '全部工具'; icon: LucideIcon }[] = [
  { label: '全部工具', icon: Sparkles },
  { label: '开发', icon: Code2 },
  { label: '编码', icon: ArrowLeftRight },
  { label: '文本', icon: TextCursorInput },
  { label: '生成', icon: WandSparkles },
]

function App() {
  const [activeTool, setActiveTool] = useState<ToolId | null>(() => {
    const id = window.location.hash.replace('#/', '') as ToolId
    return tools.some((tool) => tool.id === id) ? id : null
  })
  const [category, setCategory] = useState<Category | '全部工具'>('全部工具')
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('lumen-theme') === 'light' ? 'light' : 'dark'))
  const [favorites, setFavorites] = useState<ToolId[]>(() => JSON.parse(localStorage.getItem('lumen-favorites') || '[]'))
  const [recent, setRecent] = useState<ToolId[]>(() => JSON.parse(localStorage.getItem('lumen-recent') || '[]'))

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('lumen-theme', theme)
  }, [theme])

  useEffect(() => localStorage.setItem('lumen-favorites', JSON.stringify(favorites)), [favorites])
  useEffect(() => localStorage.setItem('lumen-recent', JSON.stringify(recent)), [recent])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }
      if (event.key === 'Escape') setSearchOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const openTool = (id: ToolId) => {
    setActiveTool(id)
    setRecent((items) => [id, ...items.filter((item) => item !== id)].slice(0, 5))
    window.location.hash = `/${id}`
    setSearchOpen(false)
    setMobileOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goHome = () => {
    setActiveTool(null)
    history.replaceState(null, '', window.location.pathname)
  }

  const toggleFavorite = (id: ToolId) => {
    setFavorites((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])
  }

  const filtered = useMemo(() => tools.filter((tool) => {
    const inCategory = category === '全部工具' || tool.category === category
    const needle = query.toLowerCase()
    return inCategory && (!needle || [tool.name, tool.description, ...tool.tags].join(' ').toLowerCase().includes(needle))
  }), [category, query])

  const current = activeTool ? tools.find((tool) => tool.id === activeTool) : null

  return (
    <div className="app-shell">
      <div className={`mobile-scrim ${mobileOpen ? 'visible' : ''}`} onClick={() => setMobileOpen(false)} />
      <aside className={`sidebar ${sidebarOpen ? '' : 'compact'} ${mobileOpen ? 'mobile-visible' : ''}`}>
        <button className="brand" onClick={goHome} aria-label="返回首页">
          <span className="brand-mark"><span /></span>
          {sidebarOpen && <span className="brand-name">Lumen<span>/tools</span></span>}
        </button>

        <nav className="side-nav" aria-label="工具分类">
          {categories.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={category === label && !activeTool ? 'active' : ''}
              onClick={() => { setCategory(label); goHome(); setMobileOpen(false) }}
              title={label}
            >
              <Icon size={18} strokeWidth={1.8} />
              {sidebarOpen && <span>{label}</span>}
              {sidebarOpen && label === '全部工具' && <small>{tools.length}</small>}
            </button>
          ))}
        </nav>

        {sidebarOpen && (favorites.length > 0 || recent.length > 0) && (
          <div className="side-section">
            <p>{favorites.length ? '收藏' : '最近使用'}</p>
            {(favorites.length ? favorites : recent).slice(0, 4).map((id) => {
              const tool = tools.find((item) => item.id === id)!
              const Icon = tool.icon
              return <button key={id} onClick={() => openTool(id)} className={activeTool === id ? 'active' : ''}><Icon size={17} /><span>{tool.name}</span></button>
            })}
          </div>
        )}

        <div className="sidebar-footer">
          <button onClick={() => setSidebarOpen((value) => !value)} title={sidebarOpen ? '收起侧栏' : '展开侧栏'}>
            {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            {sidebarOpen && <span>收起侧栏</span>}
          </button>
        </div>
      </aside>

      <main className={`main ${sidebarOpen ? '' : 'expanded'}`}>
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="打开菜单"><Menu size={20} /></button>
          <button className="search-trigger" onClick={() => setSearchOpen(true)}>
            <Search size={17} />
            <span>搜索工具、命令或关键词…</span>
            <kbd>⌘ K</kbd>
          </button>
          <div className="top-actions">
            <div className="local-badge"><span />本地运行</div>
            <button className="icon-button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="切换主题">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <a className="icon-button" href="https://github.com" target="_blank" rel="noreferrer" aria-label="GitHub"><Github size={18} /></a>
          </div>
        </header>

        {current ? (
          <ToolPage tool={current} favorite={favorites.includes(current.id)} onFavorite={() => toggleFavorite(current.id)} onBack={goHome} />
        ) : (
          <Home tools={filtered} category={category} query={query} setQuery={setQuery} openTool={openTool} recent={recent} />
        )}

        <footer>
          <span><span className="footer-dot" /> 所有计算都在你的浏览器中完成</span>
          <span>开源 · 无追踪 · 无上传</span>
        </footer>
      </main>

      {searchOpen && <CommandPalette onClose={() => setSearchOpen(false)} onSelect={openTool} />}
    </div>
  )
}

function Home({ tools: visibleTools, category, query, setQuery, openTool, recent }: {
  tools: ToolDefinition[]
  category: Category | '全部工具'
  query: string
  setQuery: (value: string) => void
  openTool: (id: ToolId) => void
  recent: ToolId[]
}) {
  const featuredIds: ToolId[] = recent.length ? recent.slice(0, 3) : ['json', 'base64', 'uuid']
  return (
    <div className="home page-enter">
      <section className="intro">
        <div className="eyebrow"><span>10 个精选工具</span><span className="line" /></div>
        <h1>少一点切换，<br /><em>多一点专注。</em></h1>
        <p>常用开发工具，安静地待在一个地方。无需登录，数据不会离开浏览器。</p>
      </section>

      <section className="quick-section">
        <div className="section-heading">
          <div><span className="index">01</span><h2>{recent.length ? '继续使用' : '快速开始'}</h2></div>
          <p>{recent.length ? '从上次停下的地方继续' : '最常用的工具，触手可及'}</p>
        </div>
        <div className="featured-tools">
          {featuredIds.map((id, index) => {
            const tool = tools.find((item) => item.id === id)!
            const Icon = tool.icon
            return (
              <button className="featured-tool" key={id} onClick={() => openTool(id)} style={{ '--tool-accent': tool.accent } as CSSProperties}>
                <span className="feature-number">0{index + 1}</span>
                <span className="feature-icon"><Icon size={25} strokeWidth={1.6} /></span>
                <span className="feature-copy"><strong>{tool.name}</strong><small>{tool.description}</small></span>
                <span className="feature-arrow">↗</span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="directory">
        <div className="section-heading">
          <div><span className="index">02</span><h2>{category}</h2></div>
          <label className="inline-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="筛选当前列表" /></label>
        </div>
        <div className="tool-list">
          {visibleTools.map((tool) => {
            const Icon = tool.icon
            return (
              <button className="tool-row" key={tool.id} onClick={() => openTool(tool.id)}>
                <span className="tool-icon" style={{ '--tool-accent': tool.accent } as CSSProperties}><Icon size={20} strokeWidth={1.7} /></span>
                <span className="tool-name">{tool.name}</span>
                <span className="tool-description">{tool.description}</span>
                <span className="tool-category">{tool.category}</span>
                <span className="row-arrow">↗</span>
              </button>
            )
          })}
          {visibleTools.length === 0 && <div className="empty-state"><Search size={28} /><p>没有找到匹配的工具</p><button onClick={() => setQuery('')}>清除筛选</button></div>}
        </div>
      </section>

      <section className="privacy-band">
        <div className="privacy-orbit"><ShieldCheck size={36} /><i /><i /></div>
        <div><span>PRIVACY BY DEFAULT</span><h2>你的数据，只属于你。</h2><p>没有服务器处理，没有账户系统，也没有行为分析。每次转换都在当前设备完成，刷新页面即可清空。</p></div>
      </section>
    </div>
  )
}

function ToolPage({ tool, favorite, onFavorite, onBack }: { tool: ToolDefinition; favorite: boolean; onFavorite: () => void; onBack: () => void }) {
  const Icon = tool.icon
  return (
    <div className="tool-page page-enter" style={{ '--tool-accent': tool.accent } as CSSProperties}>
      <div className="tool-header">
        <button className="back-link" onClick={onBack}>← 所有工具</button>
        <div className="tool-title-line">
          <span className="large-tool-icon"><Icon size={28} strokeWidth={1.5} /></span>
          <div><p>{tool.category} / 本地工具</p><h1>{tool.name}</h1><span>{tool.description}</span></div>
          <button className={`favorite-button ${favorite ? 'selected' : ''}`} onClick={onFavorite}><Heart size={18} fill={favorite ? 'currentColor' : 'none'} />{favorite ? '已收藏' : '收藏'}</button>
        </div>
      </div>
      <div className="workspace"><ToolRenderer id={tool.id} /></div>
      <div className="tool-note"><ShieldCheck size={17} /><span><strong>本地处理</strong> — 输入内容不会发送到任何服务器。</span></div>
    </div>
  )
}

function ToolRenderer({ id }: { id: ToolId }) {
  switch (id) {
    case 'json': return <JsonTool />
    case 'base64': return <TransformTool kind="base64" />
    case 'url': return <TransformTool kind="url" />
    case 'jwt': return <JwtTool />
    case 'uuid': return <UuidTool />
    case 'hash': return <HashTool />
    case 'timestamp': return <TimestampTool />
    case 'text': return <TextStatsTool />
    case 'color': return <ColorTool />
    case 'regex': return <RegexTool />
  }
}

function EditorPanel({ label, value, onChange, placeholder, actions, readOnly = false, children }: { label: string; value?: string; onChange?: (value: string) => void; placeholder?: string; actions?: ReactNode; readOnly?: boolean; children?: ReactNode }) {
  return <div className="editor-panel"><div className="panel-label"><span>{label}</span><div>{actions}</div></div>{children || <textarea value={value} onChange={(event) => onChange?.(event.target.value)} placeholder={placeholder} readOnly={readOnly} spellCheck={false} />}</div>
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }
  return <button className="mini-action" onClick={copy} disabled={!value}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? '已复制' : '复制'}</button>
}

function JsonTool() {
  const [input, setInput] = useState('{\n  "name": "Lumen Tools",\n  "private": true,\n  "tools": 10\n}')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const convert = (compact = false) => {
    try { setOutput(JSON.stringify(JSON.parse(input), null, compact ? 0 : 2)); setError('') }
    catch (err) { setError(err instanceof Error ? err.message : 'JSON 格式无效'); setOutput('') }
  }
  useEffect(() => { convert() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return <><div className="workspace-toolbar"><button className="primary-action" onClick={() => convert(false)}><WandSparkles size={16} />格式化</button><button onClick={() => convert(true)}>压缩</button><button onClick={() => { setInput(''); setOutput(''); setError('') }}><Trash2 size={15} />清空</button></div><div className="dual-editor"><EditorPanel label="输入 JSON" value={input} onChange={setInput} placeholder="粘贴 JSON…" /><EditorPanel label={error ? '验证失败' : '格式化结果'} value={error || output} readOnly actions={<CopyButton value={output} />} /></div><div className={`status-line ${error ? 'error' : ''}`}>{error ? <X size={15} /> : <Check size={15} />}{error || '有效 JSON'}</div></>
}

function TransformTool({ kind }: { kind: 'base64' | 'url' }) {
  const [input, setInput] = useState('Lumen Tools — 浏览器里的开发工作台')
  const [output, setOutput] = useState('')
  const [mode, setMode] = useState<'encode' | 'decode'>('encode')
  const [error, setError] = useState('')
  const run = (nextMode = mode) => {
    try {
      const result = kind === 'base64'
        ? nextMode === 'encode' ? btoa(unescape(encodeURIComponent(input))) : decodeURIComponent(escape(atob(input.trim())))
        : nextMode === 'encode' ? encodeURIComponent(input) : decodeURIComponent(input)
      setOutput(result); setError('')
    } catch { setError('无法转换，请检查输入格式'); setOutput('') }
  }
  return <><div className="workspace-toolbar segmented"><button className={mode === 'encode' ? 'active' : ''} onClick={() => { setMode('encode'); setOutput('') }}>编码</button><button className={mode === 'decode' ? 'active' : ''} onClick={() => { setMode('decode'); setOutput('') }}>解码</button><span /><button className="primary-action" onClick={() => run()}><ArrowLeftRight size={16} />开始转换</button></div><div className="dual-editor"><EditorPanel label="原始内容" value={input} onChange={setInput} placeholder={mode === 'encode' ? '输入需要编码的内容…' : '粘贴需要解码的内容…'} /><EditorPanel label="转换结果" value={error || output} readOnly actions={<CopyButton value={output} />} /></div>{error && <div className="status-line error"><X size={15} />{error}</div>}</>
}

function JwtTool() {
  const sample = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJsdW1lbi11c2VyIiwibmFtZSI6IkRldmVsb3BlciIsImlhdCI6MTcwMDAwMDAwMH0.demo-signature'
  const [input, setInput] = useState(sample)
  const decode = (part: number) => { try { return JSON.stringify(JSON.parse(atob(input.split('.')[part].replace(/-/g, '+').replace(/_/g, '/'))), null, 2) } catch { return '无法解析此部分' } }
  return <div className="stacked-workspace"><EditorPanel label="JWT Token" value={input} onChange={setInput} placeholder="粘贴 JWT…" /><div className="dual-editor compact"><EditorPanel label="Header" value={decode(0)} readOnly actions={<CopyButton value={decode(0)} />} /><EditorPanel label="Payload" value={decode(1)} readOnly actions={<CopyButton value={decode(1)} />} /></div><div className="status-line warning"><ShieldCheck size={15} />仅解码内容，不验证签名有效性</div></div>
}

function UuidTool() {
  const [count, setCount] = useState(5)
  const [values, setValues] = useState(() => Array.from({ length: 5 }, () => crypto.randomUUID()))
  const generate = () => setValues(Array.from({ length: count }, () => crypto.randomUUID()))
  return <><div className="generator-controls"><label>生成数量 <input type="number" min="1" max="50" value={count} onChange={(event) => setCount(Math.max(1, Math.min(50, Number(event.target.value))))} /></label><button className="primary-action" onClick={generate}><WandSparkles size={16} />重新生成</button><CopyButton value={values.join('\n')} /></div><div className="result-lines">{values.map((value, index) => <div key={value}><span>{String(index + 1).padStart(2, '0')}</span><code>{value}</code><CopyButton value={value} /></div>)}</div></>
}

function HashTool() {
  const [input, setInput] = useState('Lumen Tools')
  const [algorithm, setAlgorithm] = useState<'SHA-1' | 'SHA-256' | 'SHA-512'>('SHA-256')
  const [output, setOutput] = useState('')
  useEffect(() => { crypto.subtle.digest(algorithm, new TextEncoder().encode(input)).then((buffer) => setOutput(Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, '0')).join(''))) }, [input, algorithm])
  return <><div className="workspace-toolbar segmented"><select value={algorithm} onChange={(event) => setAlgorithm(event.target.value as typeof algorithm)}><option>SHA-1</option><option>SHA-256</option><option>SHA-512</option></select></div><div className="dual-editor"><EditorPanel label="输入内容" value={input} onChange={setInput} placeholder="输入需要计算摘要的文本…" /><EditorPanel label={`${algorithm} 摘要`} value={output} readOnly actions={<CopyButton value={output} />} /></div></>
}

function TimestampTool() {
  const now = Math.floor(Date.now() / 1000)
  const [timestamp, setTimestamp] = useState(String(now))
  const date = new Date(Number(timestamp) * (timestamp.length <= 10 ? 1000 : 1))
  const valid = !Number.isNaN(date.getTime())
  return <div className="timestamp-layout"><div className="live-time"><span>当前 Unix 时间</span><strong>{now}</strong><CopyButton value={String(now)} /></div><div className="field-group"><label>Unix 时间戳<input value={timestamp} onChange={(event) => setTimestamp(event.target.value.replace(/\D/g, ''))} /></label><span className="conversion-arrow">→</span><label>本地时间<input value={valid ? date.toLocaleString('zh-CN', { hour12: false }) : '无效时间'} readOnly /></label></div>{valid && <div className="date-details"><div><span>ISO 8601</span><code>{date.toISOString()}</code></div><div><span>UTC</span><code>{date.toUTCString()}</code></div></div>}</div>
}

function TextStatsTool() {
  const [value, setValue] = useState('把复杂的事情变简单，是好工具最重要的工作。\n\nLumen Tools 在浏览器本地完成所有计算。')
  const stats = { 字符: value.length, '字符（不含空格）': value.replace(/\s/g, '').length, 词语: value.trim() ? value.trim().split(/\s+|(?<=[\u4e00-\u9fa5])(?=[\u4e00-\u9fa5])/).length : 0, 行数: value ? value.split('\n').length : 0 }
  return <><div className="stats-strip">{Object.entries(stats).map(([label, number]) => <div key={label}><strong>{number}</strong><span>{label}</span></div>)}<div><strong>{Math.max(1, Math.ceil(stats.词语 / 250))}</strong><span>分钟阅读</span></div></div><EditorPanel label="文本内容" value={value} onChange={setValue} placeholder="开始输入或粘贴文本…" actions={<button className="mini-action" onClick={() => setValue('')}><Trash2 size={14} />清空</button>} /></>
}

function ColorTool() {
  const [hex, setHex] = useState('#b8f35d')
  const normalized = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#000000'
  const r = parseInt(normalized.slice(1, 3), 16), g = parseInt(normalized.slice(3, 5), 16), b = parseInt(normalized.slice(5, 7), 16)
  const max = Math.max(r, g, b) / 255, min = Math.min(r, g, b) / 255
  let h = 0; const l = (max + min) / 2; const d = max - min; const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  if (d) { if (max === r / 255) h = 60 * (((g - b) / 255 / d) % 6); else if (max === g / 255) h = 60 * ((b - r) / 255 / d + 2); else h = 60 * ((r - g) / 255 / d + 4) }
  if (h < 0) h += 360
  const values = [{ label: 'HEX', value: normalized.toUpperCase() }, { label: 'RGB', value: `rgb(${r}, ${g}, ${b})` }, { label: 'HSL', value: `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)` }]
  return <div className="color-layout"><div className="color-stage" style={{ background: normalized }}><input type="color" value={normalized} onChange={(event) => setHex(event.target.value)} /><span>点击选择颜色</span></div><div className="color-values"><label>颜色值<input value={hex} onChange={(event) => setHex(event.target.value)} maxLength={7} /></label>{values.map((item) => <div key={item.label}><span>{item.label}</span><code>{item.value}</code><CopyButton value={item.value} /></div>)}</div></div>
}

function RegexTool() {
  const [pattern, setPattern] = useState('[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}')
  const [flags, setFlags] = useState('gi')
  const [text, setText] = useState('联系我们：hello@lumen.tools\n备用邮箱：team@example.com')
  let matches: RegExpMatchArray[] = [], error = ''
  try { matches = Array.from(text.matchAll(new RegExp(pattern, flags.includes('g') ? flags : `${flags}g`))) } catch (err) { error = err instanceof Error ? err.message : '表达式无效' }
  return <><div className="regex-input"><span>/</span><input value={pattern} onChange={(event) => setPattern(event.target.value)} /><span>/</span><input className="flags" value={flags} onChange={(event) => setFlags(event.target.value.replace(/[^dgimsuvy]/g, ''))} /></div><div className="dual-editor"><EditorPanel label="测试文本" value={text} onChange={setText} /><EditorPanel label={error ? '表达式错误' : `${matches.length} 个匹配`}><div className="match-list">{error ? <p className="regex-error">{error}</p> : matches.length ? matches.map((match, index) => <div key={`${match.index}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><code>{match[0]}</code><small>位置 {match.index}</small></div>) : <p>没有匹配结果</p>}</div></EditorPanel></div></>
}

function CommandPalette({ onClose, onSelect }: { onClose: () => void; onSelect: (id: ToolId) => void }) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => inputRef.current?.focus(), [])
  const results = tools.filter((tool) => [tool.name, tool.description, ...tool.tags].join(' ').toLowerCase().includes(value.toLowerCase()))
  return <div className="command-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><div className="command-panel"><div className="command-input"><Search size={20} /><input ref={inputRef} value={value} onChange={(event) => setValue(event.target.value)} placeholder="输入工具名或关键词…" /><kbd>ESC</kbd></div><div className="command-results"><p>{value ? `找到 ${results.length} 个工具` : '所有工具'}</p>{results.map((tool) => { const Icon = tool.icon; return <button key={tool.id} onClick={() => onSelect(tool.id)}><span className="command-icon" style={{ '--tool-accent': tool.accent } as CSSProperties}><Icon size={18} /></span><span><strong>{tool.name}</strong><small>{tool.description}</small></span><em>{tool.category}</em></button> })}</div><div className="command-footer"><span><kbd>↑↓</kbd> 浏览</span><span><kbd>↵</kbd> 打开</span><span>数据始终在本地处理</span></div></div></div>
}

export default App
