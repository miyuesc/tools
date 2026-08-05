import { Grid2X2, List, Search, ShieldCheck } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useState } from 'react'
import { tools } from '../tools/registry'
import type { CategoryFilter, ToolDefinition, ToolId } from '../types/tool'

export default function HomePage({ visibleTools, category, query, setQuery, openTool, recent }: {
  visibleTools: ToolDefinition[]
  category: CategoryFilter
  query: string
  setQuery: (value: string) => void
  openTool: (id: ToolId) => void
  recent: ToolId[]
}) {
  const featuredIds = recent.length ? recent.slice(0, 3) : tools.filter((tool) => tool.featured).slice(0, 3).map((tool) => tool.id)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => localStorage.getItem('lumen-tool-view') === 'grid' ? 'grid' : 'list')
  const changeViewMode = (mode: 'list' | 'grid') => {
    setViewMode(mode)
    localStorage.setItem('lumen-tool-view', mode)
  }

  return (
    <div className="home page-enter">
      <section className="intro">
        <div className="eyebrow"><span>{tools.length} 个浏览器工具</span><span className="line" /></div>
        <h1>开发时常用的工具，<br /><em>都放在这里。</em></h1>
        <p>处理 JSON 和图片，也能转换常见编码。无需登录，输入内容不会上传。</p>
      </section>

      <section className="quick-section">
        <div className="section-heading">
          <div><span className="index">01</span><h2>{recent.length ? '最近打开' : '常用工具'}</h2></div>
          <p>{recent.length ? '回到刚才用过的工具' : '点开就能用'}</p>
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

      <section className="directory" id="tool-directory">
        <div className="section-heading">
          <div><span className="index">02</span><h2>{category}</h2></div>
          <div className="directory-actions">
            <div className="view-switcher" aria-label="工具列表布局">
              <button className={viewMode === 'list' ? 'active' : ''} onClick={() => changeViewMode('list')} aria-label="列表布局" aria-pressed={viewMode === 'list'}><List size={15} /></button>
              <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => changeViewMode('grid')} aria-label="网格布局" aria-pressed={viewMode === 'grid'}><Grid2X2 size={15} /></button>
            </div>
          <label className="inline-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="筛选当前列表" /></label>
          </div>
        </div>
        <div className={`tool-list ${viewMode === 'grid' ? 'is-grid' : ''}`}>
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
        <div><span>LOCAL BY DEFAULT</span><h2>输入内容不会上传。</h2><p>转换和编辑都在浏览器中完成。收藏、最近打开和主题设置只保存在本机。</p></div>
      </section>
    </div>
  )
}
