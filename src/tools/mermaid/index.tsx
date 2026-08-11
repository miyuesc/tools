import { Download, Image as ImageIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { CopyButton, EditorPanel } from '../shared/EditorPanel'

const initialDiagram = `flowchart LR
  A[输入内容] --> B{格式有效?}
  B -->|是| C[生成预览]
  B -->|否| D[显示错误]
  C --> E[下载 SVG / PNG]`

export default function MermaidEditorPage() {
  const [input, setInput] = useState(initialDiagram)
  const [svg, setSvg] = useState('')
  const [error, setError] = useState('')
  const sequence = useRef(0)

  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(async () => {
      try {
        const { default: mermaid } = await import('mermaid')
        mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral', fontFamily: 'system-ui, sans-serif' })
        const id = `lumen-mermaid-${++sequence.current}`
        const result = await mermaid.render(id, input)
        if (!cancelled) { setSvg(result.svg); setError('') }
      } catch (cause) {
        if (!cancelled) { setSvg(''); setError(cause instanceof Error ? cause.message.split('\n')[0] : 'Mermaid 语法无效') }
      }
    }, 280)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [input])

  const svgUrl = svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : ''
  const downloadPng = async () => {
    const image = new Image(); image.src = svgUrl; await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(800, image.naturalWidth * 2); canvas.height = Math.max(450, image.naturalHeight * 2)
    const context = canvas.getContext('2d'); if (!context) return
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'mermaid-diagram.png'; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 500)
    }, 'image/png')
  }

  return <div className="mermaid-tool">
    <div className="workspace-toolbar mermaid-toolbar"><span className="toolbar-hint">输入停止 280ms 后自动渲染</span><CopyButton value={svg} />{svg && <a href={svgUrl} download="mermaid-diagram.svg"><Download size={15} />下载 SVG</a>}<button disabled={!svg} onClick={() => void downloadPng()}><ImageIcon size={15} />下载 PNG</button></div>
    <div className="dual-editor mermaid-editor">
      <EditorPanel label="Mermaid 源码" value={input} onChange={setInput} language="plain" showLineNumbers />
      <div className="editor-panel mermaid-preview-panel"><div className="panel-label"><span>{error ? '渲染失败' : '图表预览'}</span><span className="language-badge">MERMAID</span></div><div className={`mermaid-preview ${error ? 'error' : ''}`}>{error ? <p>{error}</p> : svg ? <div dangerouslySetInnerHTML={{ __html: svg }} /> : <p>正在生成预览…</p>}</div></div>
    </div>
    <div className={`status-line ${error ? 'error' : ''}`}>{error || '支持流程图、时序图、类图、状态图、ER 图和甘特图等 Mermaid 语法'}</div>
  </div>
}
