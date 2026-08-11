import { Check, Trash2, WandSparkles, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { CopyButton, EditorPanel } from '../shared/EditorPanel'

type YamlIndent = '2' | '4'
type OutputMode = 'yaml' | 'json'

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeysDeep((value as Record<string, unknown>)[key])]))
  return value
}

export default function YamlWorkbenchPage() {
  const [input, setInput] = useState('name: Lumen\nconfig:\n  private: true\n  theme: dark\nitems:\n  - JSON\n  - YAML')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [indent, setIndent] = useState<YamlIndent>('2')
  const [sortKeys, setSortKeys] = useState(false)
  const [mode, setMode] = useState<OutputMode>('yaml')
  const [autoFormat, setAutoFormat] = useState(true)

  const format = (source = input) => {
    if (!source.trim()) { setOutput(''); setError(''); return }
    try {
      const parsed = parseYaml(source) as unknown
      const normalized = sortKeys ? sortKeysDeep(parsed) : parsed
      setOutput(mode === 'json' ? JSON.stringify(normalized, null, Number(indent)) : stringifyYaml(normalized, { indent: Number(indent), lineWidth: 0 }))
      setError('')
    } catch (cause) {
      setOutput('')
      setError(cause instanceof Error ? cause.message.split('\n')[0] : 'YAML 格式无效')
    }
  }

  useEffect(() => {
    if (!autoFormat) return
    const timer = window.setTimeout(() => format(), 320)
    return () => window.clearTimeout(timer)
  }, [autoFormat, indent, input, mode, sortKeys]) // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => { setOutput(''); setError('') }
  return <>
    <div className="workspace-toolbar yaml-toolbar">
      <button className="primary-action" onClick={() => format()}><WandSparkles size={15} />格式化</button>
      <label className="toolbar-field">结果<select aria-label="YAML 输出格式" value={mode} onChange={(event) => { setMode(event.target.value as OutputMode); reset() }}><option value="yaml">美化 YAML</option><option value="json">转为 JSON</option></select></label>
      <label className="toolbar-field">缩进<select aria-label="YAML 缩进间距" value={indent} onChange={(event) => { setIndent(event.target.value as YamlIndent); reset() }}><option value="2">2 空格</option><option value="4">4 空格</option></select></label>
      <label className="toolbar-check"><input type="checkbox" checked={sortKeys} onChange={(event) => { setSortKeys(event.target.checked); reset() }} />排序属性</label>
      <label className="toolbar-check"><input type="checkbox" checked={autoFormat} onChange={(event) => setAutoFormat(event.target.checked)} />自动格式化</label>
      <button onClick={() => { setInput(''); reset() }}><Trash2 size={14} />清空</button>
    </div>
    <div className="dual-editor"><EditorPanel label="输入 YAML" value={input} onChange={(value) => { setInput(value); reset() }} showLineNumbers language="yaml" /><EditorPanel label={error ? 'YAML 验证失败' : mode === 'json' ? 'JSON 结果' : '格式化 YAML'} value={output} readOnly actions={<CopyButton value={output} />} language={mode} showLineNumbers emptyMessage={error || (autoFormat ? '输入有效 YAML 后自动生成结果' : '点击格式化生成结果')} /></div>
    <div className={`status-line ${error ? 'error' : ''}`}>{error ? <X size={15} /> : <Check size={15} />}{error || (output ? `有效 YAML · ${sortKeys ? '属性已排序' : '保留属性顺序'} · ${mode === 'json' ? 'JSON 视图' : `缩进 ${indent} 空格`}` : '等待有效 YAML')}</div>
  </>
}
