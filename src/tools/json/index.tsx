import { Check, Trash2, WandSparkles, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CopyButton, EditorPanel } from '../shared/EditorPanel'

type Indent = '2' | '4' | 'tab'
type FormatMode = 'format' | 'compact'

function sortJsonKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonKeys)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortJsonKeys((value as Record<string, unknown>)[key])]))
  }
  return value
}

function jsonError(error: unknown, input: string) {
  const message = error instanceof Error ? error.message : 'JSON 格式无效'
  const position = Number(message.match(/position\s+(\d+)/i)?.[1])
  const prefix = Number.isFinite(position) ? input.slice(0, position) : ''
  const location = Number.isFinite(position) ? `（第 ${prefix.split('\n').length} 行，第 ${prefix.length - prefix.lastIndexOf('\n')} 列）` : ''
  return `${message}${location}`
}

export default function JsonToolPage() {
  const [input, setInput] = useState('{\n  "name": "Lumen Tools",\n  "private": true,\n  "tools": 11\n}')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [indent, setIndent] = useState<Indent>('2')
  const [sortKeys, setSortKeys] = useState(false)
  const [showLineNumbers, setShowLineNumbers] = useState(true)
  const [autoFormat, setAutoFormat] = useState(true)
  const [lastMode, setLastMode] = useState<FormatMode>('format')
  const changeInput = (value: string) => { setInput(value); setOutput(''); setError('') }
  const convert = (mode: FormatMode, source = input, indentValue = indent, shouldSort = sortKeys) => {
    if (!source.trim()) { setOutput(''); setError(''); return }
    try {
      const parsed = JSON.parse(source) as unknown
      const normalized = shouldSort ? sortJsonKeys(parsed) : parsed
      const spacing = indentValue === 'tab' ? '\t' : Number(indentValue)
      setOutput(JSON.stringify(normalized, null, mode === 'compact' ? 0 : spacing))
      setLastMode(mode)
      setError('')
    } catch (cause) {
      setError(jsonError(cause, source))
      setOutput('')
    }
  }
  useEffect(() => {
    if (!autoFormat) return
    const timer = window.setTimeout(() => convert('format'), 320)
    return () => window.clearTimeout(timer)
  }, [autoFormat, indent, input, sortKeys]) // eslint-disable-line react-hooks/exhaustive-deps

  const resetResult = () => { setOutput(''); setError('') }
  const changeIndent = (value: Indent) => { setIndent(value); resetResult() }
  const changeSort = (value: boolean) => { setSortKeys(value); resetResult() }

  return <><div className="workspace-toolbar json-toolbar"><button className="primary-action" onClick={() => convert('format')}><WandSparkles size={16} />格式化</button><button onClick={() => convert('compact')}>压缩</button><label className="toolbar-field">缩进<select aria-label="缩进间距" value={indent} onChange={(event) => changeIndent(event.target.value as Indent)}><option value="2">2 空格</option><option value="4">4 空格</option><option value="tab">Tab</option></select></label><label className="toolbar-check"><input type="checkbox" checked={sortKeys} onChange={(event) => changeSort(event.target.checked)} />排序属性</label><label className="toolbar-check"><input type="checkbox" checked={showLineNumbers} onChange={(event) => setShowLineNumbers(event.target.checked)} />行号</label><label className="toolbar-check"><input type="checkbox" checked={autoFormat} onChange={(event) => setAutoFormat(event.target.checked)} />自动格式化</label><button onClick={() => { setInput(''); resetResult() }}><Trash2 size={15} />清空</button></div><div className="dual-editor"><EditorPanel label="输入 JSON" value={input} onChange={changeInput} placeholder="粘贴 JSON…" showLineNumbers={showLineNumbers} /><EditorPanel label={error ? '验证失败' : lastMode === 'compact' ? '压缩结果' : '格式化结果'} value={output} readOnly actions={<CopyButton value={output} />} language="json" showLineNumbers={showLineNumbers} emptyMessage={error || (autoFormat ? '输入有效 JSON 后自动生成结果' : '格式化或压缩后显示结果')} /></div><div className={`status-line ${error ? 'error' : ''}`}>{error ? <X size={15} /> : <Check size={15} />}{error || (output ? `有效 JSON · ${sortKeys ? '属性已排序' : '保留属性顺序'} · ${lastMode === 'compact' ? '已压缩' : `缩进 ${indent === 'tab' ? 'Tab' : `${indent} 空格`}`}` : autoFormat ? '等待有效 JSON，输入停止 320ms 后自动格式化' : '输入已变化，请手动运行')}</div></>
}
