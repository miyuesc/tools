import { Check, Trash2, WandSparkles, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CopyButton, EditorPanel } from '../shared/EditorPanel'

export default function JsonToolPage() {
  const [input, setInput] = useState('{\n  "name": "Lumen Tools",\n  "private": true,\n  "tools": 11\n}')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const changeInput = (value: string) => { setInput(value); setOutput(''); setError('') }
  const convert = (compact = false) => {
    try { setOutput(JSON.stringify(JSON.parse(input), null, compact ? 0 : 2)); setError('') }
    catch (err) {
      const message = err instanceof Error ? err.message : 'JSON 格式无效'
      const position = Number(message.match(/position\s+(\d+)/i)?.[1])
      const prefix = Number.isFinite(position) ? input.slice(0, position) : ''
      const location = Number.isFinite(position) ? `（第 ${prefix.split('\n').length} 行，第 ${prefix.length - prefix.lastIndexOf('\n')} 列）` : ''
      setError(`${message}${location}`)
      setOutput('')
    }
  }
  useEffect(() => { convert() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <><div className="workspace-toolbar"><button className="primary-action" onClick={() => convert(false)}><WandSparkles size={16} />格式化</button><button onClick={() => convert(true)}>压缩</button><button onClick={() => { setInput(''); setOutput(''); setError('') }}><Trash2 size={15} />清空</button><span className="toolbar-hint">手动运行 · 支持错误位置提示</span></div><div className="dual-editor"><EditorPanel label="输入 JSON" value={input} onChange={changeInput} placeholder="粘贴 JSON…" /><EditorPanel label={error ? '验证失败' : '格式化结果'} value={output} readOnly actions={<CopyButton value={output} />} language="json" emptyMessage={error || '格式化或压缩后显示结果'} /></div><div className={`status-line ${error ? 'error' : ''}`}>{error ? <X size={15} /> : <Check size={15} />}{error || (output ? '有效 JSON' : '输入已变化，请重新运行')}</div></>
}
