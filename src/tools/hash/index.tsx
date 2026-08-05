import { useEffect, useState } from 'react'
import { CopyButton, EditorPanel } from '../shared/EditorPanel'
import { formatBytes } from '../shared/fileUtils'

function hashText(bytes: Uint8Array, encoding: 'hex' | 'base64') {
  if (encoding === 'hex') return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  let binary = ''
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  return btoa(binary)
}

export default function HashToolPage() {
  const [input, setInput] = useState('Lumen Tools')
  const [algorithm, setAlgorithm] = useState<'SHA-1' | 'SHA-256' | 'SHA-512'>('SHA-256')
  const [encoding, setEncoding] = useState<'hex' | 'base64'>('hex')
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(null)
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    setBusy(true); setError('')
    const source = file?.bytes ?? new TextEncoder().encode(input)
    crypto.subtle.digest(algorithm, source as BufferSource)
      .then((buffer) => { if (active) setOutput(hashText(new Uint8Array(buffer), encoding)) })
      .catch(() => { if (active) { setError('当前浏览器无法计算该摘要'); setOutput('') } })
      .finally(() => { if (active) setBusy(false) })
    return () => { active = false }
  }, [algorithm, encoding, file, input])
  const chooseFile = async (selected?: File) => {
    if (!selected) return
    if (selected.size > 50 * 1024 * 1024) { setError('文件上限为 50 MB'); return }
    setBusy(true)
    try { setFile({ name: selected.name, bytes: new Uint8Array(await selected.arrayBuffer()) }) }
    catch { setError('读取文件失败') }
  }
  return <><div className="workspace-toolbar segmented"><select aria-label="哈希算法" value={algorithm} onChange={(event) => setAlgorithm(event.target.value as typeof algorithm)}><option>SHA-1</option><option>SHA-256</option><option>SHA-512</option></select><select aria-label="摘要编码" value={encoding} onChange={(event) => setEncoding(event.target.value as typeof encoding)}><option value="hex">Hex</option><option value="base64">Base64</option></select><label className="toolbar-file">选择文件<input type="file" onClick={(event) => { event.currentTarget.value = '' }} onChange={(event) => void chooseFile(event.currentTarget.files?.[0])} /></label>{file && <button onClick={() => setFile(null)}>改用文本</button>}<span className="toolbar-hint">{file ? `${file.name} · ${formatBytes(file.bytes.byteLength)}` : `${new TextEncoder().encode(input).byteLength} 个 UTF-8 字节`}</span></div><div className="dual-editor"><EditorPanel label={file ? `文件模式 · ${file.name}` : '输入内容'} value={file ? '当前使用文件内容计算摘要；点击“改用文本”返回。' : input} onChange={file ? undefined : setInput} readOnly={Boolean(file)} placeholder="输入需要计算摘要的文本…" /><EditorPanel label={error ? '计算失败' : `${algorithm} · ${encoding.toUpperCase()}`} value={output} readOnly actions={<CopyButton value={output} />} emptyMessage={error || (busy ? '正在计算摘要…' : '等待输入')} /></div><div className={`status-line ${error ? 'error' : ''}`}>{error || (busy ? '正在本地计算…' : '摘要只用于完整性校验；SHA-1 不适合安全用途')}</div></>
}
