import { Check, Link2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CopyButton, EditorPanel } from '../shared/EditorPanel'

type ParsedParam = { source: '查询' | 'Hash'; key: string; value: string; raw: string }

function safeDecode(value: string) {
  try { return decodeURIComponent(value.replace(/\+/g, ' ')) } catch { return value }
}

function parseParamString(value: string, source: ParsedParam['source']) {
  if (!value) return []
  return value.split('&').filter(Boolean).map((part) => {
    const separator = part.indexOf('=')
    const rawKey = separator < 0 ? part : part.slice(0, separator)
    const rawValue = separator < 0 ? '' : part.slice(separator + 1)
    return { source, key: safeDecode(rawKey), value: safeDecode(rawValue), raw: part }
  })
}

function parseUrlInput(input: string) {
  const trimmed = input.trim()
  if (!trimmed) return { url: null, assumedProtocol: false }
  try { return { url: new URL(trimmed), assumedProtocol: false } } catch {
    try { return { url: new URL(`https://${trimmed}`), assumedProtocol: true } } catch { return { url: null, assumedProtocol: false } }
  }
}

function decodedUrl(url: URL) {
  const authentication = url.username ? `${safeDecode(url.username)}${url.password ? `:${safeDecode(url.password)}` : ''}@` : ''
  const query = url.search ? `?${url.search.slice(1).split('&').map((item) => item.split('=').map(safeDecode).join('=')).join('&')}` : ''
  const hash = url.hash ? `#${safeDecode(url.hash.slice(1))}` : ''
  return `${url.protocol}//${authentication}${url.host}${safeDecode(url.pathname)}${query}${hash}`
}

export default function UrlParserPage() {
  const [input, setInput] = useState('https://user:pass@example.com:8443/中文/工具?keyword=%E6%B1%89%E5%AD%97&tag=URL&tag=%E8%A7%A3%E6%9E%90#tab=preview&name=%E9%A2%84%E8%A7%88')
  const parsed = useMemo(() => parseUrlInput(input), [input])
  const url = parsed.url
  const hashBody = url?.hash.slice(1) || ''
  const hashQuery = hashBody.includes('?') ? hashBody.slice(hashBody.indexOf('?') + 1) : /(^|&)[^=&]+=?/.test(hashBody) && hashBody.includes('=') ? hashBody : ''
  const hashPath = hashQuery ? hashBody.slice(0, Math.max(0, hashBody.indexOf('?'))) : hashBody
  const params = url ? [...parseParamString(url.search.slice(1), '查询'), ...parseParamString(hashQuery, 'Hash')] : []
  const overview = url ? [
    ['协议', url.protocol],
    ['认证', url.username ? `${safeDecode(url.username)}${url.password ? ':••••••' : ''}` : '无'],
    ['主机', url.hostname],
    ['端口', url.port || '默认端口'],
    ['路径', safeDecode(url.pathname)],
    ['Hash 路径', safeDecode(hashPath) || '无'],
  ] : []
  const decoded = url ? decodedUrl(url) : ''

  return <div className="url-parser-tool">
    <EditorPanel label="URL" value={input} onChange={setInput} placeholder="粘贴完整 URL 或域名…" wrapLongLines />
    {url ? <>
      <div className="workspace-toolbar url-parser-actions"><span className="toolbar-hint">{parsed.assumedProtocol ? '未提供协议，已按 HTTPS 解析' : 'URL 解析成功'}</span><CopyButton value={url.href} /><CopyButton value={decoded} /></div>
      <div className="url-overview">{overview.map(([label, value]) => <div key={label}><span>{label}</span><code>{value}</code><CopyButton value={value} /></div>)}</div>
      <section className="url-params">
        <div className="panel-label"><span>参数解析</span><small>{params.length} 个参数 · 自动完成百分号与汉字转码</small></div>
        {params.length ? <div className="url-param-table">{params.map((param, index) => <div key={`${param.source}-${param.raw}-${index}`}><span>{param.source}</span><code>{param.key || '空键名'}</code><p>{param.value || '空值'}</p><CopyButton value={param.value} /></div>)}</div> : <div className="url-empty">当前 URL 没有查询参数或 Hash 参数</div>}
      </section>
      <div className="url-decoded"><span>中文可读 URL</span><code>{decoded}</code><CopyButton value={decoded} /></div>
      <div className="status-line"><Check size={15} />已解析协议、认证、主机、路径、重复查询参数和 Hash 参数</div>
    </> : <div className="status-line error"><Link2 size={15} />URL 格式无效；请输入完整 URL 或可识别域名</div>}
  </div>
}
