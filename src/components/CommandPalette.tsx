import { Search } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { tools } from '../tools/registry'
import type { ToolId } from '../types/tool'

export default function CommandPalette({ onClose, onSelect }: { onClose: () => void; onSelect: (id: ToolId) => void }) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => inputRef.current?.focus(), [])
  const results = tools.filter((tool) => [tool.name, tool.description, ...tool.tags].join(' ').toLowerCase().includes(value.toLowerCase()))

  return (
    <div className="command-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="command-panel">
        <div className="command-input"><Search size={20} /><input ref={inputRef} value={value} onChange={(event) => setValue(event.target.value)} placeholder="输入工具名或关键词…" /><kbd>ESC</kbd></div>
        <div className="command-results"><p>{value ? `${results.length} 个结果` : '所有工具'}</p>{results.map((tool) => { const Icon = tool.icon; return <button key={tool.id} onClick={() => onSelect(tool.id)}><span className="command-icon" style={{ '--tool-accent': tool.accent } as CSSProperties}><Icon size={18} /></span><span><strong>{tool.name}</strong><small>{tool.description}</small></span><em>{tool.category}</em></button> })}</div>
        <div className="command-footer"><span><kbd>↑↓</kbd> 选择</span><span><kbd>↵</kbd> 打开</span><span>输入内容不离开浏览器</span></div>
      </div>
    </div>
  )
}
