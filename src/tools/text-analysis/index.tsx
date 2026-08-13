import {
  AlertTriangle,
  CheckCircle2,
  ClipboardPaste,
  Download,
  Eraser,
  FileUp,
  FlaskConical,
  Info,
  Network,
} from 'lucide-react'
import { useDeferredValue, useMemo, useRef, useState, type ReactNode } from 'react'
import { CopyButton, EditorPanel } from '../shared/EditorPanel'
import {
  analyzeCss,
  analyzeDependencyTree,
  analyzeGoMod,
  analyzeThreadDump,
  compareBenchmarks,
  resolvePackageTarget,
  type Finding,
} from './parsers'

const MAX_INPUT_BYTES = 1024 * 1024

const BENCH_BASELINE = `goos: darwin
goarch: arm64
pkg: example.com/codec
BenchmarkEncodeSmall-10      985420      1220 ns/op      512 B/op       6 allocs/op
BenchmarkEncodeLarge-10       48562     24580 ns/op     8192 B/op      18 allocs/op
BenchmarkDecodeSmall-10      753120      1580 ns/op      640 B/op       8 allocs/op`

const BENCH_CANDIDATE = `goos: darwin
goarch: arm64
pkg: example.com/codec
BenchmarkEncodeSmall-10     1104200      1080 ns/op      448 B/op       5 allocs/op
BenchmarkEncodeLarge-10       42110     26890 ns/op     9216 B/op      21 allocs/op
BenchmarkDecodeSmall-10      760100      1568 ns/op      640 B/op       8 allocs/op
BenchmarkStream-10            90210     13200 ns/op     2048 B/op      11 allocs/op`

const PACKAGE_SAMPLE = `{
  "name": "@lumen/widget",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "default": "./dist/index.js"
    },
    "./features/*": [
      { "browser": "./dist/browser/*.js" },
      "./dist/features/*.js"
    ],
    "./private/*": null
  },
  "imports": {
    "#internal/*": {
      "development": "./src/*.ts",
      "default": "./dist/internal/*.js"
    }
  }
}`

const MAVEN_SAMPLE = `[INFO] --- maven-dependency-plugin:3.7.0:tree (default-cli) @ service ---
[INFO] com.example:service:jar:1.0.0
[INFO] +- org.springframework:spring-core:jar:6.1.12:compile
[INFO] |  \\- commons-logging:commons-logging:jar:1.2:compile
[INFO] +- com.fasterxml.jackson.core:jackson-databind:jar:2.17.2:compile
[INFO] |  +- com.fasterxml.jackson.core:jackson-annotations:jar:2.17.2:compile
[INFO] |  \\- com.fasterxml.jackson.core:jackson-core:jar:2.17.2:compile
[INFO] \\- org.legacy:adapter:jar:2.1.0:runtime
[INFO]    \\- com.fasterxml.jackson.core:jackson-core:jar:2.15.4:runtime (omitted for conflict with 2.17.2)`

const GOMOD_SAMPLE = `module example.com/lumen/service

go 1.23.0
toolchain go1.23.6

require (
  github.com/google/uuid v1.6.0
  golang.org/x/sync v0.11.0 // indirect
  example.com/legacy v1.4.2
)

replace example.com/legacy v1.4.2 => ../legacy
exclude example.com/legacy v1.3.0
retract [v1.1.0, v1.1.2]`

const THREAD_SAMPLE = `2026-08-12 10:12:00
Full thread dump OpenJDK 64-Bit Server VM:

"http-nio-8080-exec-1" #31 prio=5 tid=0x1 nid=0x101 waiting for monitor entry
   java.lang.Thread.State: BLOCKED (on object monitor)
        at com.example.OrderService.confirm(OrderService.java:84)
        - waiting to lock <0x00000001> (a java.lang.Object)
        - locked <0x00000002> (a java.lang.Object)

"http-nio-8080-exec-2" #32 prio=5 tid=0x2 nid=0x102 waiting for monitor entry
   java.lang.Thread.State: BLOCKED (on object monitor)
        at com.example.InventoryService.reserve(InventoryService.java:52)
        - waiting to lock <0x00000002> (a java.lang.Object)
        - locked <0x00000001> (a java.lang.Object)

"worker-1" #40 prio=5 tid=0x3 nid=0x103 runnable
   java.lang.Thread.State: RUNNABLE
        at java.net.SocketInputStream.socketRead0(Native Method)
        at com.example.SyncWorker.run(SyncWorker.java:38)

"worker-2" #41 prio=5 tid=0x4 nid=0x104 runnable
   java.lang.Thread.State: RUNNABLE
        at java.net.SocketInputStream.socketRead0(Native Method)
        at com.example.SyncWorker.run(SyncWorker.java:38)`

const CSS_SAMPLE = `:where(.theme-dark) #app .toolbar > button:hover {
  color: white;
  background: #202522;
  color: #f7f7f7;
}

.toolbar .primary {
  color: #111 !important;
  background: #b8f35d;
}

#app .toolbar button.primary {
  color: #101410;
  background: color-mix(in srgb, #b8f35d 85%, white);
}

.toolbar > {
  display: flex;
}`

function bytes(value: string) {
  return new Blob([value]).size
}

function useLimitedText(initial: string) {
  const [value, setValue] = useState(initial)
  const [limitError, setLimitError] = useState('')
  const update = (next: string) => {
    const size = bytes(next)
    if (size > MAX_INPUT_BYTES) {
      setLimitError(`输入为 ${(size / 1024 / 1024).toFixed(2)} MiB，超过 1 MiB 上限`)
      return
    }
    setLimitError('')
    setValue(next)
  }
  return { value, update, limitError }
}

async function readClipboard() {
  if (!navigator.clipboard?.readText) throw new Error('浏览器不支持读取剪贴板')
  return navigator.clipboard.readText()
}

function downloadText(filename: string, value: string) {
  const url = URL.createObjectURL(new Blob([value], { type: 'text/markdown;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function Findings({ items }: { items: Finding[] }) {
  if (!items.length) return null
  return <section className="analysis-findings"><header><AlertTriangle size={15} /><strong>诊断</strong><span>{items.length}</span></header>{items.map((item, index) => <article key={`${item.message}-${index}`} className={item.severity}>
    {item.severity === 'error' ? <AlertTriangle size={15} /> : item.severity === 'warning' ? <Info size={15} /> : <CheckCircle2 size={15} />}
    <div><strong>{item.line ? `第 ${item.line} 行 · ` : ''}{item.message}</strong>{item.detail && <small>{item.detail}</small>}</div>
  </article>)}</section>
}

function EmptyResult({ children = '粘贴文本或载入示例后，结构化分析会显示在这里。' }: { children?: ReactNode }) {
  return <div className="analysis-empty"><FlaskConical size={28} /><strong>等待输入</strong><span>{children}</span></div>
}

function StatStrip({ items }: { items: Array<{ label: string; value: string | number; tone?: string }> }) {
  return <div className="analysis-stats">{items.map((item) => <div key={item.label} className={item.tone || ''}><span>{item.label}</span><strong>{item.value}</strong></div>)}</div>
}

function TextActions({ value, update, onExample, report, filename, extra }: {
  value: string
  update: (value: string) => void
  onExample: () => void
  report: string
  filename: string
  extra?: ReactNode
}) {
  const [pasteError, setPasteError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const paste = async () => {
    try { update(await readClipboard()); setPasteError('') }
    catch (error) { setPasteError(error instanceof Error ? error.message : '无法读取剪贴板') }
  }
  const importFile = async (file?: File) => {
    if (!file) return
    update(await file.text())
    if (fileRef.current) fileRef.current.value = ''
  }
  return <>
    <div className="workspace-toolbar analysis-toolbar">
      <button onClick={onExample}><FlaskConical size={15} />示例</button>
      <button onClick={paste}><ClipboardPaste size={15} />粘贴</button>
      <label className="toolbar-file"><FileUp size={15} />导入文本<input ref={fileRef} type="file" accept=".txt,.log,.json,.mod,.css,text/plain,application/json,text/css" onChange={(event) => importFile(event.target.files?.[0])} /></label>
      <button onClick={() => update('')} disabled={!value}><Eraser size={15} />清空</button>
      {extra}<span />
      <CopyButton value={report} />
      <button className="primary-action" onClick={() => downloadText(filename, report)} disabled={!report}><Download size={15} />导出摘要</button>
    </div>
    {pasteError && <div className="status-line error">{pasteError}</div>}
  </>
}

function Boundary({ children }: { children: ReactNode }) {
  return <div className="analysis-boundary"><Info size={15} /><span>{children}</span></div>
}

function formatNumber(value?: number) {
  return value === undefined ? '—' : new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(value)
}

export function GoBenchmarkPage() {
  const baseline = useLimitedText(BENCH_BASELINE)
  const candidate = useLimitedText(BENCH_CANDIDATE)
  const deferredBaseline = useDeferredValue(baseline.value)
  const deferredCandidate = useDeferredValue(candidate.value)
  const analysis = useMemo(() => compareBenchmarks(deferredBaseline, deferredCandidate), [deferredBaseline, deferredCandidate])
  const metricRows = analysis.comparisons.flatMap((item) => item.metrics)
  const report = useMemo(() => analysis.comparisons.length ? `# Go Benchmark 对比\n\n${analysis.comparisons.map((item) => `## ${item.name}\n${item.metrics.map((metric) => `- ${metric.metric}: ${formatNumber(metric.before)} → ${formatNumber(metric.after)}${metric.delta === undefined ? '' : ` (${metric.delta > 0 ? '+' : ''}${metric.delta.toFixed(2)}%, ${metric.status})`}`).join('\n')}`).join('\n\n')}\n\n> 数值越低越好；仅比较文本中共同出现的指标。` : '', [analysis])
  const [pasteTarget, setPasteTarget] = useState<'baseline' | 'candidate'>('candidate')
  const [pasteError, setPasteError] = useState('')
  const paste = async () => {
    try { (pasteTarget === 'baseline' ? baseline.update : candidate.update)(await readClipboard()); setPasteError('') }
    catch (error) { setPasteError(error instanceof Error ? error.message : '无法读取剪贴板') }
  }
  const clear = () => { baseline.update(''); candidate.update('') }
  return <div className="analysis-workbench">
    <div className="workspace-toolbar analysis-toolbar">
      <button onClick={() => { baseline.update(BENCH_BASELINE); candidate.update(BENCH_CANDIDATE) }}><FlaskConical size={15} />示例</button>
      <select aria-label="粘贴目标" value={pasteTarget} onChange={(event) => setPasteTarget(event.target.value as typeof pasteTarget)}><option value="baseline">粘贴到基准组</option><option value="candidate">粘贴到候选组</option></select>
      <button onClick={() => void paste()}><ClipboardPaste size={15} />粘贴</button>
      <button onClick={clear} disabled={!baseline.value && !candidate.value}><Eraser size={15} />清空</button><span />
      <CopyButton value={report} /><button className="primary-action" onClick={() => downloadText('go-benchmark-comparison.md', report)} disabled={!report}><Download size={15} />导出摘要</button>
    </div>
    {pasteError && <div className="status-line error">{pasteError}</div>}
    <div className="analysis-input-grid"><EditorPanel label="基准组 go test -bench 输出" value={baseline.value} onChange={baseline.update} language="plain" showLineNumbers /><EditorPanel label="候选组 go test -bench 输出" value={candidate.value} onChange={candidate.update} language="plain" showLineNumbers /></div>
    {(baseline.limitError || candidate.limitError) && <div className="status-line error">{baseline.limitError || candidate.limitError}</div>}
    {analysis.comparisons.length ? <>
      <StatStrip items={[{ label: '对齐 benchmark', value: analysis.comparisons.length }, { label: '改善指标', value: metricRows.filter((item) => item.status === 'improved').length, tone: 'good' }, { label: '退化指标', value: metricRows.filter((item) => item.status === 'regressed').length, tone: 'bad' }, { label: '缺失指标', value: metricRows.filter((item) => item.status === 'missing').length }]} />
      <div className="benchmark-table"><header><span>Benchmark / 指标</span><span>基准</span><span>候选</span><span>变化</span></header>{analysis.comparisons.map((item) => <section key={item.name}><h3>{item.name}<small>{item.baseline && item.candidate ? `${item.baseline.displayName} ↔ ${item.candidate.displayName}` : item.baseline ? '仅基准组' : '仅候选组'}</small></h3>{item.metrics.map((metric) => <div key={metric.metric} className={metric.status}><code>{metric.metric}</code><span>{formatNumber(metric.before)}</span><span>{formatNumber(metric.after)}</span><strong>{metric.delta === undefined ? '无法比较' : `${metric.delta > 0 ? '+' : ''}${metric.delta.toFixed(2)}% · ${metric.status === 'improved' ? '改善' : metric.status === 'regressed' ? '退化' : '持平'}`}</strong></div>)}</section>)}</div>
    </> : <EmptyResult />}
    <Findings items={analysis.findings} /><Boundary>按名称去掉末尾 GOMAXPROCS 后缀（如 -8、-10）后对齐；不计算统计显著性，也不替代 benchstat。ns/op、B/op、allocs/op 均按“越低越好”判断，±0.5% 内标为持平。</Boundary>
  </div>
}

export function PackageExportsPage() {
  const input = useLimitedText(PACKAGE_SAMPLE)
  const deferred = useDeferredValue(input.value)
  const [query, setQuery] = useState('./features/button')
  const [conditions, setConditions] = useState('browser, import, default')
  const analysis = useMemo(() => resolvePackageTarget(deferred, query, conditions), [deferred, query, conditions])
  const report = useMemo(() => input.value.trim() ? `# package ${analysis.field} 解析\n\n- 请求：${query}\n- 条件：${conditions}\n- 结果：${analysis.target || '未解析'}\n\n## 匹配链\n${analysis.steps.map((step, index) => `${index + 1}. [${step.status}] ${step.label}：${step.value}`).join('\n') || '- 无'}\n\n## 诊断\n${analysis.findings.map((item) => `- ${item.severity}: ${item.message}${item.detail ? ` — ${item.detail}` : ''}`).join('\n') || '- 无'}` : '', [analysis, conditions, input.value, query])
  return <div className="analysis-workbench"><TextActions value={input.value} update={input.update} onExample={() => input.update(PACKAGE_SAMPLE)} report={report} filename="package-exports-resolution.md" extra={<><label className="toolbar-field">子路径<input value={query} onChange={(event) => setQuery(event.target.value)} /></label><label className="toolbar-field wide">条件<input value={conditions} onChange={(event) => setConditions(event.target.value)} /></label></>} />
    <div className="analysis-split"><EditorPanel label="package.json" value={input.value} onChange={input.update} language="json" showLineNumbers /><div className="analysis-result">{input.value.trim() ? <><StatStrip items={[{ label: '字段', value: analysis.field }, { label: '匹配步骤', value: analysis.steps.length }, { label: '解析结果', value: analysis.target ? '成功' : '失败', tone: analysis.target ? 'good' : 'bad' }]} /><section className="resolution-result"><span>LOCAL TARGET</span><strong>{analysis.target || '未找到可用目标'}</strong><small>{query} · [{conditions}]</small></section><div className="resolution-chain">{analysis.steps.map((step, index) => <article key={`${step.label}-${index}`} className={step.status}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{step.label}</strong><small>{step.value}</small></div></article>)}</div><Findings items={analysis.findings} /></> : <EmptyResult />}</div></div>
    {input.limitError && <div className="status-line error">{input.limitError}</div>}<Boundary>模拟 exports、imports、条件对象、子路径通配符和数组 fallback 的静态匹配；遵循对象声明顺序，但不读取磁盘、不验证目标文件存在，也不执行 Node 的包边界、URL 与 CommonJS/ESM 加载流程。</Boundary>
  </div>
}

export function DependencyTreePage() {
  const input = useLimitedText(MAVEN_SAMPLE)
  const deferred = useDeferredValue(input.value)
  const analysis = useMemo(() => analyzeDependencyTree(deferred), [deferred])
  const report = useMemo(() => analysis.nodes.length ? `# ${analysis.format} 依赖树分析\n\n- 节点：${analysis.nodes.length}\n- 冲突/省略/重复版本：${analysis.conflicts.length}\n- scope/configuration：${Object.entries(analysis.scopes).map(([key, value]) => `${key}=${value}`).join(', ')}\n\n## 依赖层级\n\n\`\`\`text\n${analysis.nodes.map((node) => `${'  '.repeat(node.depth)}${node.id}:${node.version || '?'} [${node.scope}]${node.status ? ` — ${node.status}` : ''}`).join('\n')}\n\`\`\`\n\n## 诊断\n${analysis.findings.map((item) => `- ${item.message}${item.detail ? `：${item.detail}` : ''}`).join('\n') || '- 无'}` : '', [analysis])
  return <div className="analysis-workbench"><TextActions value={input.value} update={input.update} onExample={() => input.update(MAVEN_SAMPLE)} report={report} filename="dependency-tree-analysis.md" />
    <div className="analysis-split"><EditorPanel label="Maven / Gradle 依赖树" value={input.value} onChange={input.update} language="plain" showLineNumbers /><div className="analysis-result">{analysis.nodes.length ? <><StatStrip items={[{ label: '格式', value: analysis.format }, { label: '依赖节点', value: analysis.nodes.length }, { label: '异常节点', value: analysis.conflicts.length, tone: analysis.conflicts.length ? 'bad' : 'good' }, { label: '最大深度', value: Math.max(...analysis.nodes.map((node) => node.depth)) }]} /><section className="scope-list"><header><strong>Scope / Configuration</strong></header>{Object.entries(analysis.scopes).map(([scope, count]) => <div key={scope}><code>{scope}</code><span>{count}</span><i style={{ width: `${(count / analysis.nodes.length) * 100}%` }} /></div>)}</section><section className="dependency-list"><header><strong>解析层级</strong><span>{analysis.nodes.length} nodes</span></header>{analysis.nodes.map((node) => <article key={`${node.line}-${node.id}`} className={node.status ? 'warning' : ''} style={{ '--depth': node.depth } as React.CSSProperties}><span>{node.line}</span><div><code>{node.id}</code><small>{node.version || '未知版本'} · {node.scope}{node.status ? ` · ${node.status}` : ''}</small></div></article>)}</section><Findings items={analysis.findings} /></> : <><EmptyResult /><Findings items={analysis.findings} /></>}</div></div>
    {input.limitError && <div className="status-line error">{input.limitError}</div>}<Boundary>识别常见 `mvn dependency:tree` 与 Gradle `dependencies` 文本标记；不会解析自定义插件输出、下载 POM/metadata、执行版本选择或推断未显示的传递依赖。</Boundary>
  </div>
}

export function GoModGraphPage() {
  const input = useLimitedText(GOMOD_SAMPLE)
  const deferred = useDeferredValue(input.value)
  const analysis = useMemo(() => analyzeGoMod(deferred), [deferred])
  const requires = analysis.directives.filter((item) => item.kind === 'require')
  const report = useMemo(() => input.value.trim() ? `# go.mod 依赖图\n\n- module: ${analysis.module || '缺失'}\n- go: ${analysis.go || '未声明'}\n- toolchain: ${analysis.toolchain || '未声明'}\n- require: ${requires.length}\n\n## 指令\n${analysis.directives.map((item) => `- L${item.line} ${item.kind} ${item.module}${item.version ? ` ${item.version}` : ''}${item.target ? ` => ${item.target}` : ''}${item.indirect ? ' // indirect' : ''}`).join('\n') || '- 无'}\n\n> 仅表示当前文件的直接声明，不联网补全传递依赖。` : '', [analysis, input.value, requires.length])
  return <div className="analysis-workbench"><TextActions value={input.value} update={input.update} onExample={() => input.update(GOMOD_SAMPLE)} report={report} filename="go-mod-graph.md" />
    <div className="analysis-split"><EditorPanel label="go.mod" value={input.value} onChange={input.update} language="go" showLineNumbers /><div className="analysis-result">{input.value.trim() ? <><section className="module-head"><span>MODULE</span><strong>{analysis.module || '未识别 module'}</strong><small>go {analysis.go || '—'} · toolchain {analysis.toolchain || '—'}</small></section><StatStrip items={[{ label: 'Require', value: requires.length }, { label: 'Indirect', value: requires.filter((item) => item.indirect).length }, { label: 'Replace', value: analysis.directives.filter((item) => item.kind === 'replace').length }, { label: 'Exclude / Retract', value: analysis.directives.filter((item) => item.kind === 'exclude' || item.kind === 'retract').length }]} /><section className="directive-list">{analysis.directives.map((item) => <article key={`${item.kind}-${item.line}`}><span>{item.line}</span><b>{item.kind}</b><div><code>{item.module}{item.version ? ` ${item.version}` : ''}</code>{item.target && <small>→ {item.target}</small>}{item.indirect && <em>indirect</em>}</div></article>)}</section><Findings items={analysis.findings} /></> : <EmptyResult />}</div></div>
    {input.limitError && <div className="status-line error">{input.limitError}</div>}<Boundary>解析 module、go、toolchain、require、replace、exclude、retract 与 indirect 注释；图只覆盖当前 go.mod 的声明关系，不请求 proxy.golang.org、不读取 go.sum，也不补全传递模块。</Boundary>
  </div>
}

export function JavaThreadDumpPage() {
  const input = useLimitedText(THREAD_SAMPLE)
  const deferred = useDeferredValue(input.value)
  const [filter, setFilter] = useState('http|worker|pool|executor|biz|task')
  const analysis = useMemo(() => analyzeThreadDump(deferred), [deferred])
  const filtered = useMemo(() => {
    if (!filter.trim()) return analysis.threads
    try { const pattern = new RegExp(filter, 'i'); return analysis.threads.filter((thread) => pattern.test(thread.name)) }
    catch { return analysis.threads }
  }, [analysis.threads, filter])
  const filterError = useMemo(() => { try { new RegExp(filter); return '' } catch (error) { return error instanceof Error ? error.message : '过滤正则无效' } }, [filter])
  const report = useMemo(() => analysis.threads.length ? `# Java Thread Dump 摘要\n\n- 线程：${analysis.threads.length}\n- 业务过滤：${filter || '无'}（匹配 ${filtered.length}）\n- 状态：${Object.entries(analysis.states).map(([state, count]) => `${state}=${count}`).join(', ')}\n- 相同堆栈组：${analysis.groups.length}\n- 锁：${analysis.locks.length}\n- 启发式死锁环：${analysis.deadlocks.length}\n\n## 死锁候选\n${analysis.deadlocks.map((cycle) => `- ${cycle.join(' → ')}`).join('\n') || '- 无'}\n\n## 相同堆栈\n${analysis.groups.slice(0, 20).map((group) => `- ${group.count}× ${group.names.join(', ')}\n  ${group.signature.split('\n').slice(0, 3).join(' | ')}`).join('\n')}` : '', [analysis, filter, filtered.length])
  return <div className="analysis-workbench"><TextActions value={input.value} update={input.update} onExample={() => input.update(THREAD_SAMPLE)} report={report} filename="java-thread-dump-summary.md" extra={<label className="toolbar-field wide">业务线程正则<input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="留空显示全部" /></label>} />
    <div className="analysis-split"><EditorPanel label="Java Thread Dump" value={input.value} onChange={input.update} language="plain" showLineNumbers /><div className="analysis-result">{analysis.threads.length ? <><StatStrip items={[{ label: '全部线程', value: analysis.threads.length }, { label: '业务匹配', value: filtered.length }, { label: '锁对象', value: analysis.locks.length }, { label: '死锁候选', value: analysis.deadlocks.length, tone: analysis.deadlocks.length ? 'bad' : 'good' }]} /><section className="state-list"><header><strong>线程状态</strong></header>{Object.entries(analysis.states).sort((a, b) => b[1] - a[1]).map(([state, count]) => <div key={state}><code>{state}</code><span>{count}</span><i style={{ width: `${(count / analysis.threads.length) * 100}%` }} /></div>)}</section>{analysis.deadlocks.length > 0 && <section className="deadlock-list"><header><AlertTriangle size={15} /><strong>死锁候选</strong></header>{analysis.deadlocks.map((cycle, index) => <div key={index}>{cycle.join(' → ')}</div>)}</section>}<section className="thread-groups"><header><strong>相同堆栈聚合</strong><span>{analysis.groups.length} groups</span></header>{analysis.groups.slice(0, 30).map((group, index) => <article key={`${group.signature}-${index}`}><strong>{group.count}×</strong><div><span>{group.names.join('、')}</span><code>{group.signature.split('\n').slice(0, 4).join('\n')}</code></div></article>)}</section><section className="thread-list"><header><strong>业务线程</strong><span>{filtered.length}</span></header>{filtered.slice(0, 100).map((thread) => <article key={`${thread.line}-${thread.name}`}><span>{thread.state}</span><div><strong>{thread.name}</strong><code>{thread.frames[0] || '没有识别到堆栈帧'}</code></div></article>)}</section><Findings items={[...analysis.findings, ...(filterError ? [{ severity: 'error' as const, message: '业务线程过滤正则无效', detail: filterError }] : [])]} /></> : <><EmptyResult /><Findings items={analysis.findings} /></>}</div></div>
    {input.limitError && <div className="status-line error">{input.limitError}</div>}<Boundary>支持常见 HotSpot/OpenJDK 文本格式；锁环检测基于 `waiting to lock / parking to wait for / locked` 行，是启发式而非 JVM 结论。虚拟线程、被截断转储和 native 锁可能无法完整关联。</Boundary>
  </div>
}

export function CssCascadePage() {
  const input = useLimitedText(CSS_SAMPLE)
  const deferred = useDeferredValue(input.value)
  const analysis = useMemo(() => analyzeCss(deferred), [deferred])
  const importantCount = analysis.rules.flatMap((rule) => rule.declarations).filter((item) => item.important).length
  const report = useMemo(() => input.value.trim() ? `# CSS Specificity / Cascade 分析\n\n- 规则：${analysis.rules.length}\n- 选择器：${analysis.selectors.length}\n- !important：${importantCount}\n- 潜在覆盖：${analysis.overrides.length}\n\n## Specificity\n${analysis.selectors.map((item) => `- ${item.specificity.join('-')} ${item.selector}${item.valid ? '' : ' [可能无效]'}`).join('\n') || '- 无'}\n\n## 潜在覆盖\n${analysis.overrides.map((item) => `- ${item.property}: ${item.from} → ${item.to}（${item.reason}）`).join('\n') || '- 无'}\n\n> 静态分析不知道 DOM、元素状态、样式表来源、@layer 完整顺序、媒体条件或运行时注入，仅表示可能关系。` : '', [analysis, importantCount, input.value])
  return <div className="analysis-workbench"><TextActions value={input.value} update={input.update} onExample={() => input.update(CSS_SAMPLE)} report={report} filename="css-cascade-analysis.md" />
    <div className="analysis-split"><EditorPanel label="CSS 或逐行选择器" value={input.value} onChange={input.update} language="css" showLineNumbers /><div className="analysis-result">{input.value.trim() ? <><StatStrip items={[{ label: '规则', value: analysis.rules.length }, { label: '选择器', value: analysis.selectors.length }, { label: '!important', value: importantCount, tone: importantCount ? 'bad' : '' }, { label: '潜在覆盖', value: analysis.overrides.length }]} /><section className="specificity-list"><header><span>SPECIFICITY</span><strong>选择器</strong><small>行</small></header>{analysis.selectors.map((item, index) => <article key={`${item.selector}-${index}`} className={item.valid ? '' : 'invalid'}><code>{item.specificity.join('-')}</code><span>{item.selector}</span><small>{item.line}</small></article>)}</section>{analysis.overrides.length > 0 && <section className="override-list"><header><Network size={15} /><strong>潜在覆盖关系</strong><span>{analysis.overrides.length}</span></header>{analysis.overrides.map((item, index) => <article key={`${item.property}-${index}`}><code>{item.property}</code><span>{item.from} → {item.to}</span><small>{item.reason}</small></article>)}</section>}<Findings items={analysis.findings} /></> : <EmptyResult />}</div></div>
    {input.limitError && <div className="status-line error">{input.limitError}</div>}<Boundary>Specificity 支持常见 ID、class、属性、伪类、伪元素及 :is()/:not()/:has()/:where()；覆盖关系只做保守的 selector token 启发式。结果不掌握 DOM 命中、内联样式、完整 @layer/@scope 顺序、媒体查询、shadow DOM 或浏览器动态注入。</Boundary>
  </div>
}
