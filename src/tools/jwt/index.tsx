import { Clock3, KeyRound, ShieldAlert, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CopyButton, EditorPanel } from '../shared/EditorPanel'

type JwtJson = Record<string, unknown>
type CheckState = 'ok' | 'warning' | 'error' | 'neutral'
type ClaimCheck = { label: string; state: CheckState; detail: string }

function decodeBase64Url(value: string) {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('分段包含非法或空的 Base64URL 内容')
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  try { return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0)) }
  catch { throw new Error('Base64URL 填充或编码无效') }
}

function decodeJwtJson(value: string, section: string): JwtJson {
  let text = ''
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(decodeBase64Url(value)) }
  catch (cause) { throw new Error(`${section} 不是有效 UTF-8：${cause instanceof Error ? cause.message : '解码失败'}`) }
  try {
    const parsed: unknown = JSON.parse(text)
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('必须是 JSON 对象')
    return parsed as JwtJson
  } catch (cause) { throw new Error(`${section} 不是有效 JSON 对象：${cause instanceof Error ? cause.message : '解析失败'}`) }
}

function encodeBase64Url(bytes: Uint8Array) {
  let binary = ''
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function hmacHash(algorithm: unknown) {
  const hashes: Record<string, string> = { HS256: 'SHA-256', HS384: 'SHA-384', HS512: 'SHA-512' }
  if (typeof algorithm !== 'string' || !hashes[algorithm]) throw new Error(`仅支持 HS256、HS384、HS512；当前 alg 为 ${String(algorithm || '缺失')}`)
  return hashes[algorithm]
}

async function importHmacKey(secret: string, algorithm: unknown, usage: KeyUsage[]) {
  if (!secret) throw new Error('请输入 HMAC 密钥')
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: hmacHash(algorithm) }, false, usage)
}

function formatClaimTime(value: number) {
  try { return new Date(value * 1000).toLocaleString(undefined, { hour12: false }) }
  catch { return String(value) }
}

function claimChecks(payload: JwtJson | null, expectedIssuer: string, expectedAudience: string): ClaimCheck[] {
  if (!payload) return []
  const now = Math.floor(Date.now() / 1000)
  const checks: ClaimCheck[] = []
  const timed = (name: 'exp' | 'nbf' | 'iat') => {
    const value = payload[name]
    if (value === undefined) { checks.push({ label: name, state: 'neutral', detail: '未提供' }); return }
    if (typeof value !== 'number' || !Number.isFinite(value)) { checks.push({ label: name, state: 'error', detail: '必须是 NumericDate（Unix 秒数）' }); return }
    if (name === 'exp') checks.push({ label: name, state: value > now ? 'ok' : 'error', detail: `${formatClaimTime(value)} · ${value > now ? `剩余 ${value - now} 秒` : `已过期 ${now - value} 秒`}` })
    else if (name === 'nbf') checks.push({ label: name, state: value <= now ? 'ok' : 'warning', detail: `${formatClaimTime(value)} · ${value <= now ? '已经生效' : `${value - now} 秒后生效`}` })
    else checks.push({ label: name, state: value <= now + 60 ? 'ok' : 'warning', detail: `${formatClaimTime(value)} · ${value <= now + 60 ? '签发时间合理' : '签发时间在未来'}` })
  }
  timed('exp'); timed('nbf'); timed('iat')
  const stringClaim = (name: 'iss' | 'sub' | 'jti') => {
    const value = payload[name]
    checks.push(value === undefined
      ? { label: name, state: 'neutral', detail: '未提供' }
      : typeof value === 'string' && value.length > 0
        ? { label: name, state: 'ok', detail: value }
        : { label: name, state: 'error', detail: '必须是非空字符串' })
  }
  stringClaim('iss'); stringClaim('sub'); stringClaim('jti')
  const audience = payload.aud
  const audiences = typeof audience === 'string' ? [audience] : Array.isArray(audience) && audience.every((item) => typeof item === 'string') ? audience : []
  checks.push(audience === undefined
    ? { label: 'aud', state: 'neutral', detail: '未提供' }
    : audiences.length ? { label: 'aud', state: 'ok', detail: audiences.join(', ') } : { label: 'aud', state: 'error', detail: '必须是字符串或字符串数组' })
  if (expectedIssuer) checks.push({ label: 'iss 期望', state: payload.iss === expectedIssuer ? 'ok' : 'error', detail: payload.iss === expectedIssuer ? '匹配' : `不匹配：${String(payload.iss ?? '缺失')}` })
  if (expectedAudience) checks.push({ label: 'aud 期望', state: audiences.includes(expectedAudience) ? 'ok' : 'error', detail: audiences.includes(expectedAudience) ? '匹配' : '不在 Token 的 audience 中' })
  return checks
}

export default function JwtToolPage() {
  const sample = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJsdW1lbi11c2VyIiwiaXNzIjoibG9jYWwiLCJhdWQiOiJsdW1lbi10b29scyIsImlhdCI6MTcwMDAwMDAwMH0.demo-signature'
  const [input, setInputState] = useState(sample)
  const [secret, setSecret] = useState('local-demo-secret')
  const [expectedIssuer, setExpectedIssuer] = useState('')
  const [expectedAudience, setExpectedAudience] = useState('')
  const [signatureState, setSignatureState] = useState<{ state: CheckState; message: string }>({ state: 'neutral', message: '尚未验签' })
  const [running, setRunning] = useState(false)
  const setInput = (value: string) => { setInputState(value); setSignatureState({ state: 'neutral', message: 'Token 已变化，请重新验签' }) }
  const parsed = useMemo(() => {
    const segments = input.trim().split('.')
    if (segments.length !== 3) return { segments, header: null, payload: null, error: 'JWT 必须由 Header、Payload、Signature 三段组成' }
    try {
      return { segments, header: decodeJwtJson(segments[0], 'Header'), payload: decodeJwtJson(segments[1], 'Payload'), error: '' }
    } catch (cause) { return { segments, header: null, payload: null, error: cause instanceof Error ? cause.message : 'JWT 内容无法解析' } }
  }, [input])
  const checks = useMemo(() => claimChecks(parsed.payload, expectedIssuer.trim(), expectedAudience.trim()), [expectedAudience, expectedIssuer, parsed.payload])
  const headerText = parsed.header ? JSON.stringify(parsed.header, null, 2) : ''
  const payloadText = parsed.payload ? JSON.stringify(parsed.payload, null, 2) : ''
  const signature = parsed.segments.length === 3 ? parsed.segments[2] : ''

  const verify = async () => {
    if (parsed.error || !parsed.header || parsed.segments.length !== 3) { setSignatureState({ state: 'error', message: parsed.error || 'Token 结构无效' }); return }
    setRunning(true)
    try {
      const key = await importHmacKey(secret, parsed.header.alg, ['verify'])
      const valid = await crypto.subtle.verify('HMAC', key, decodeBase64Url(parsed.segments[2]), new TextEncoder().encode(`${parsed.segments[0]}.${parsed.segments[1]}`))
      setSignatureState(valid ? { state: 'ok', message: `${String(parsed.header.alg)} 签名有效` } : { state: 'error', message: '签名无效：密钥、算法或 Token 内容不匹配' })
    } catch (cause) { setSignatureState({ state: 'error', message: cause instanceof Error ? cause.message : '验签失败' }) }
    finally { setRunning(false) }
  }

  const sign = async () => {
    if (parsed.error || !parsed.header || parsed.segments.length !== 3) { setSignatureState({ state: 'error', message: parsed.error || 'Token 结构无效' }); return }
    setRunning(true)
    try {
      const key = await importHmacKey(secret, parsed.header.alg, ['sign'])
      const signingInput = `${parsed.segments[0]}.${parsed.segments[1]}`
      const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput)))
      setInputState(`${signingInput}.${encodeBase64Url(bytes)}`)
      setSignatureState({ state: 'ok', message: `已在本机用 ${String(parsed.header.alg)} 重新签名` })
    } catch (cause) { setSignatureState({ state: 'error', message: cause instanceof Error ? cause.message : '签名失败' }) }
    finally { setRunning(false) }
  }

  return <div className="stacked-workspace jwt-workbench">
    <EditorPanel label="JWT Token" value={input} onChange={setInput} placeholder="粘贴 JWT…" language="plain" />
    <div className="form-grid jwt-controls">
      <label>HMAC 密钥<input type="password" value={secret} onChange={(event) => { setSecret(event.target.value); setSignatureState({ state: 'neutral', message: '密钥已变化，请重新验签' }) }} /></label>
      <label>期望 Issuer（可选）<input value={expectedIssuer} onChange={(event) => setExpectedIssuer(event.target.value)} placeholder="https://issuer.example" /></label>
      <label>期望 Audience（可选）<input value={expectedAudience} onChange={(event) => setExpectedAudience(event.target.value)} placeholder="my-api" /></label>
      <div className="jwt-actions"><button className="primary-action" disabled={running || Boolean(parsed.error)} onClick={() => void verify()}><ShieldCheck size={15} />{running ? '处理中…' : '本地验签'}</button><button disabled={running || Boolean(parsed.error)} onClick={() => void sign()}><KeyRound size={15} />重新签名</button></div>
    </div>
    <div className="dual-editor compact"><EditorPanel label={parsed.error ? 'Header 解析失败' : 'Header JSON'} value={headerText} readOnly actions={<CopyButton value={headerText} />} language="json" emptyMessage={parsed.error || 'Header'} /><EditorPanel label={parsed.error ? 'Payload 解析失败' : 'Payload JSON'} value={payloadText} readOnly actions={<CopyButton value={payloadText} />} language="json" emptyMessage={parsed.error || 'Payload'} /></div>
    <div className="jwt-diagnostics">
      <div className="panel-label"><span>Claim 与时间状态</span><span>{checks.filter((item) => item.state === 'error').length} errors · {checks.filter((item) => item.state === 'warning').length} warnings</span></div>
      <div>{checks.map((check) => <div className={`jwt-check ${check.state}`} key={check.label}><span>{check.label}</span><strong>{check.state === 'ok' ? '通过' : check.state === 'error' ? '错误' : check.state === 'warning' ? '注意' : '可选'}</strong><code>{check.detail}</code></div>)}</div>
    </div>
    <div className="result-lines"><div><span>签名</span><code>{signature || '—'}</code><CopyButton value={signature} /></div></div>
    <div className={`status-line ${parsed.error || signatureState.state === 'error' ? 'error' : signatureState.state === 'neutral' || signatureState.state === 'warning' ? 'warning' : ''}`}>{parsed.error || signatureState.state === 'error' ? <ShieldAlert size={15} /> : signatureState.state === 'ok' ? <ShieldCheck size={15} /> : <Clock3 size={15} />}{parsed.error || signatureState.message} · 所有密钥和 Token 仅在当前浏览器内处理</div>
  </div>
}
