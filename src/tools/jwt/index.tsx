import { ShieldAlert, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { CopyButton, EditorPanel } from '../shared/EditorPanel'

function decodeJwtJson(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('分段包含非法 Base64URL 字符')
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  return JSON.stringify(JSON.parse(text), null, 2)
}

export default function JwtToolPage() {
  const sample = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJsdW1lbi11c2VyIiwibmFtZSI6IkRldmVsb3BlciIsImlhdCI6MTcwMDAwMDAwMH0.demo-signature'
  const [input, setInput] = useState(sample)
  const segments = input.trim().split('.')
  let header = '', payload = '', error = ''
  if (segments.length !== 3) error = 'JWT 必须由 Header、Payload、Signature 三段组成'
  else try { header = decodeJwtJson(segments[0]); payload = decodeJwtJson(segments[1]) }
  catch (cause) { error = cause instanceof Error ? cause.message : 'JWT 内容无法解析' }
  const signature = segments.length === 3 ? segments[2] : ''

  return <div className="stacked-workspace"><EditorPanel label="JWT Token" value={input} onChange={setInput} placeholder="粘贴 JWT…" /><div className="dual-editor compact"><EditorPanel label={error ? 'Header 解析失败' : 'Header JSON'} value={header} readOnly actions={<CopyButton value={header} />} language="json" emptyMessage={error || 'Header'} /><EditorPanel label={error ? 'Payload 解析失败' : 'Payload JSON'} value={payload} readOnly actions={<CopyButton value={payload} />} language="json" emptyMessage={error || 'Payload'} /></div><div className="result-lines"><div><span>签名段</span><code>{signature || '—'}</code><CopyButton value={signature} /></div></div><div className={`status-line ${error ? 'error' : 'warning'}`}>{error ? <ShieldAlert size={15} /> : <ShieldCheck size={15} />}{error || '仅解码三段结构，不验证签名、算法或 Token 是否可信'}</div></div>
}
