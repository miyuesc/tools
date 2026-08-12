import { Heart, Maximize2, Minimize2, ShieldCheck } from 'lucide-react'
import { Suspense, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import type { ToolDefinition } from '../types/tool'

export default function ToolPageLayout({ tool, favorite, onFavorite, onBack }: {
  tool: ToolDefinition
  favorite: boolean
  onFavorite: () => void
  onBack: () => void
}) {
  const [fullPage, setFullPage] = useState(false)
  const [supportsFullPage, setSupportsFullPage] = useState(Boolean(tool.fullPage))
  const workspaceRef = useRef<HTMLDivElement>(null)
  const Icon = tool.icon
  const ToolComponent = tool.component
  const isWebWorkspace = tool.workspaceClassName?.split(/\s+/).includes('web-workspace')
  const useWorkspaceViewbar = !tool.fullPage || isWebWorkspace

  useLayoutEffect(() => {
    setFullPage(false)
    setSupportsFullPage(Boolean(tool.fullPage))
  }, [tool.id, tool.fullPage])

  useEffect(() => {
    const workspace = workspaceRef.current
    if (!workspace || tool.fullPage) return
    const updateSupport = () => {
      setSupportsFullPage(Boolean(workspace.querySelector('.dual-editor, .json-diff-inputs')))
    }
    updateSupport()
    const observer = new MutationObserver(updateSupport)
    observer.observe(workspace, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [tool.id, tool.fullPage])

  useEffect(() => {
    if (!fullPage) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFullPage(false)
    }
    document.body.classList.add('editor-fullpage-open')
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.classList.remove('editor-fullpage-open')
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [fullPage])

  return (
    <div className={`tool-page page-enter ${fullPage ? 'is-fullpage' : ''} ${fullPage && isWebWorkspace ? 'is-document-fullpage' : ''}`} style={{ '--tool-accent': tool.accent } as CSSProperties}>
      <div className="tool-header">
        <button className="back-link" onClick={onBack}>← 所有工具</button>
        <div className="tool-title-line">
          <span className="large-tool-icon"><Icon size={28} strokeWidth={1.5} /></span>
          <div><p>{tool.category} / {tool.sourceId ? `IT-Tools · ${tool.sourceId}` : '本地工具'}</p><h1>{tool.name}</h1><span>{tool.description}</span></div>
          <button className={`favorite-button ${favorite ? 'selected' : ''}`} onClick={onFavorite}>
            <Heart size={18} fill={favorite ? 'currentColor' : 'none'} />{favorite ? '已收藏' : '收藏'}
          </button>
        </div>
      </div>
      <div ref={workspaceRef} className={`workspace ${supportsFullPage ? 'supports-fullpage' : ''} ${tool.workspaceClassName || ''}`}>
        {supportsFullPage && (!useWorkspaceViewbar ? <button className="fullpage-toggle" onClick={() => setFullPage((value) => !value)} title={fullPage ? '退出全网页模式（Esc）' : '全网页打开'}>
          {fullPage ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          <span>{fullPage ? '退出全屏' : '全网页'}</span>
        </button> : <div className="workspace-viewbar"><button className="workspace-fullpage-toggle" onClick={() => setFullPage((value) => !value)} title={fullPage ? '退出全网页模式（Esc）' : '全网页打开'}>
          {fullPage ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          <span>{fullPage ? '退出全屏' : '全网页'}</span>
        </button></div>)}
        <Suspense fallback={<div className="tool-loading" role="status" aria-live="polite">
          <span className="tool-loading-mark" />
          <div><strong>正在载入工具</strong><small>仅加载当前工具所需代码…</small></div>
        </div>}>
          <ToolComponent />
        </Suspense>
      </div>
      <div className="tool-note"><ShieldCheck size={17} /><span><strong>本地处理</strong>，输入内容不会发送到服务器。</span></div>
    </div>
  )
}
