import {
  ArrowLeftRight,
  BookOpen,
  Code2,
  FileCode2,
  FileJson,
  Github,
  Globe2,
  Images,
  Menu,
  Moon,
  Network,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  TextCursorInput,
  WandSparkles,
  Workflow,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import ToolPageLayout from '../layouts/ToolPageLayout'
import HomePage from '../pages/HomePage'
import { getTool, tools } from '../tools/registry'
import type { CategoryFilter, ToolId } from '../types/tool'
import CommandPalette from './CommandPalette'

const categories = [
  { label: '全部工具', icon: Sparkles },
  { label: 'JavaScript', icon: Code2 },
  { label: 'Node.js', icon: FileJson },
  { label: 'Java', icon: FileCode2 },
  { label: 'Go', icon: FileCode2 },
  { label: 'CSS 设计', icon: Palette },
  { label: 'SVG 图形', icon: Workflow },
  { label: '图片媒体', icon: Images },
  { label: '数据格式', icon: FileJson },
  { label: '编码转换', icon: ArrowLeftRight },
  { label: '文本处理', icon: TextCursorInput },
  { label: '安全加密', icon: ShieldCheck },
  { label: '网络工具', icon: Network },
  { label: '系统运维', icon: Globe2 },
  { label: '生成计算', icon: WandSparkles },
  { label: '开发参考', icon: BookOpen },
] as const

const readIds = (key: string): ToolId[] => {
  try {
    const stored = JSON.parse(localStorage.getItem(key) || '[]') as string[]
    return stored.filter((id): id is ToolId => Boolean(getTool(id)))
  } catch {
    return []
  }
}

export default function AppShell() {
  const [activeTool, setActiveTool] = useState<ToolId | null>(() => getTool(window.location.hash.replace('#/', ''))?.id || null)
  const [category, setCategory] = useState<CategoryFilter>('全部工具')
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => localStorage.getItem('lumen-theme') === 'light' ? 'light' : 'dark')
  const [favorites, setFavorites] = useState<ToolId[]>(() => readIds('lumen-favorites'))
  const [recent, setRecent] = useState<ToolId[]>(() => readIds('lumen-recent'))

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('lumen-theme', theme)
  }, [theme])
  useEffect(() => localStorage.setItem('lumen-favorites', JSON.stringify(favorites)), [favorites])
  useEffect(() => localStorage.setItem('lumen-recent', JSON.stringify(recent)), [recent])

  useEffect(() => {
    const onHashChange = () => setActiveTool(getTool(window.location.hash.replace('#/', ''))?.id || null)
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }
      if (event.key === 'Escape') setSearchOpen(false)
    }
    window.addEventListener('hashchange', onHashChange)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('hashchange', onHashChange)
      window.removeEventListener('keydown', onKeyDown)
    }
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const showCategory = (nextCategory: CategoryFilter) => {
    setCategory(nextCategory)
    setActiveTool(null)
    history.replaceState(null, '', window.location.pathname)
    setMobileOpen(false)
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      document.getElementById('tool-directory')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }))
  }

  const visibleTools = useMemo(() => tools.filter((tool) => {
    const inCategory = category === '全部工具' || tool.category === category
    const needle = query.toLowerCase()
    return inCategory && (!needle || [tool.name, tool.description, ...tool.tags].join(' ').toLowerCase().includes(needle))
  }), [category, query])

  const current = activeTool ? getTool(activeTool) : undefined

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
            <button key={label} className={category === label && !activeTool ? 'active' : ''} onClick={() => showCategory(label)} title={label}>
              <Icon size={18} strokeWidth={1.8} />
              {sidebarOpen && <span>{label}</span>}
              {sidebarOpen && label === '全部工具' && <small>{tools.length}</small>}
            </button>
          ))}
        </nav>

        {sidebarOpen && (favorites.length > 0 || recent.length > 0) && (
          <div className="side-section">
            <p>{favorites.length ? '收藏' : '最近打开'}</p>
            {(favorites.length ? favorites : recent).slice(0, 4).map((id) => {
              const tool = getTool(id)!
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
          <button className="search-trigger" onClick={() => setSearchOpen(true)}><Search size={17} /><span>搜索工具或关键词…</span><kbd>⌘ K</kbd></button>
          <div className="top-actions">
            <div className="local-badge"><span />本地运行</div>
            <button className="icon-button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="切换主题">{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
            <a className="icon-button" href="https://github.com/miyuesc/tools" target="_blank" rel="noreferrer" aria-label="GitHub"><Github size={18} /></a>
          </div>
        </header>

        {current ? (
          <ToolPageLayout tool={current} favorite={favorites.includes(current.id)} onFavorite={() => setFavorites((items) => items.includes(current.id) ? items.filter((item) => item !== current.id) : [...items, current.id])} onBack={goHome} />
        ) : (
          <HomePage visibleTools={visibleTools} category={category} query={query} setQuery={setQuery} openTool={openTool} recent={recent} />
        )}

        <footer><span><span className="footer-dot" /> 处理在当前浏览器中完成</span><span>开源 · 不上传输入内容</span></footer>
      </main>

      {searchOpen && <CommandPalette onClose={() => setSearchOpen(false)} onSelect={openTool} />}
    </div>
  )
}
