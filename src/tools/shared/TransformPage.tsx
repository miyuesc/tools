import { ArrowLeftRight, CircleAlert, Info, X } from 'lucide-react'
import { useState } from 'react'
import { CopyButton, EditorPanel } from './EditorPanel'

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  return btoa(binary)
}

function encodeBase64(value: string, urlSafe: boolean) {
  const encoded = bytesToBase64(new TextEncoder().encode(value))
  return urlSafe ? encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '') : encoded
}

function decodeBase64(value: string) {
  const compact = value.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(compact) || compact.length % 4 === 1) throw new Error('Base64 包含非法字符或长度不正确')
  const padded = compact.padEnd(Math.ceil(compact.length / 4) * 4, '=')
  const bytes = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}

export default function TransformPage({ kind }: { kind: 'base64' | 'url' }) {
  const [input, setInput] = useState('Lumen Tools 在浏览器中处理文本')
  const [output, setOutput] = useState('')
  const [mode, setMode] = useState<'encode' | 'decode'>('encode')
  const [urlSafe, setUrlSafe] = useState(false)
  const [urlScope, setUrlScope] = useState<'component' | 'full'>('component')
  const [error, setError] = useState('')

  const resetResult = () => { setOutput(''); setError('') }
  const changeInput = (value: string) => { setInput(value); resetResult() }
  const changeMode = (next: 'encode' | 'decode') => { setMode(next); resetResult() }
  const run = () => {
    if (!input) { setError('请先输入需要转换的内容'); setOutput(''); return }
    try {
      const result = kind === 'base64'
        ? mode === 'encode' ? encodeBase64(input, urlSafe) : decodeBase64(input)
        : mode === 'encode'
          ? urlScope === 'component' ? encodeURIComponent(input) : encodeURI(input)
          : urlScope === 'component' ? decodeURIComponent(input) : decodeURI(input)
      setOutput(result)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '无法转换，请检查输入格式')
      setOutput('')
    }
  }

  return <>
    <div className="workspace-toolbar segmented">
      <button className={mode === 'encode' ? 'active' : ''} onClick={() => changeMode('encode')}>编码</button>
      <button className={mode === 'decode' ? 'active' : ''} onClick={() => changeMode('decode')}>解码</button>
      {kind === 'base64' && <label className="toolbar-check"><input type="checkbox" checked={urlSafe} onChange={(event) => { setUrlSafe(event.target.checked); resetResult() }} />URL-safe</label>}
      {kind === 'url' && <select aria-label="URL 编码范围" value={urlScope} onChange={(event) => { setUrlScope(event.target.value as 'component' | 'full'); resetResult() }}><option value="component">参数 / 组件</option><option value="full">完整 URL</option></select>}
      <span />
      <button className="primary-action" onClick={run}><ArrowLeftRight size={16} />开始转换</button>
    </div>
    <div className="dual-editor">
      <EditorPanel label="原始内容" value={input} onChange={changeInput} placeholder={mode === 'encode' ? '输入需要编码的内容…' : '粘贴需要解码的内容…'} />
      <EditorPanel label={error ? '转换失败' : '转换结果'} value={output} readOnly actions={<CopyButton value={output} />} emptyMessage={error || '点击“开始转换”生成结果'} />
    </div>
    <div className={`status-line ${error ? 'error' : ''}`}>{error ? <><X size={15} />{error}</> : output ? <><Info size={15} />已处理 {input.length.toLocaleString()} 个字符</> : <><CircleAlert size={15} />手动运行 · 修改输入会清除旧结果</>}</div>
  </>
}
