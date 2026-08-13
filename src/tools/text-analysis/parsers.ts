export type Severity = 'error' | 'warning' | 'info'
export type Finding = { severity: Severity; message: string; detail?: string; line?: number }

export type BenchmarkMetric = 'ns/op' | 'B/op' | 'allocs/op'
export type BenchmarkEntry = { name: string; displayName: string; values: Partial<Record<BenchmarkMetric, number>>; line: number }
export type BenchmarkComparison = {
  name: string
  baseline?: BenchmarkEntry
  candidate?: BenchmarkEntry
  metrics: Array<{ metric: BenchmarkMetric; before?: number; after?: number; delta?: number; status: 'improved' | 'regressed' | 'same' | 'missing' }>
}

const BENCHMARK_METRICS: BenchmarkMetric[] = ['ns/op', 'B/op', 'allocs/op']

export function parseBenchmarks(text: string) {
  const entries = new Map<string, BenchmarkEntry>()
  const findings: Finding[] = []
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim()
    if (!/^Benchmark\S+/.test(line)) return
    const name = line.match(/^(Benchmark\S+)/)?.[1]
    if (!name) return
    const values: Partial<Record<BenchmarkMetric, number>> = {}
    for (const metric of BENCHMARK_METRICS) {
      const match = line.match(new RegExp(`([0-9]+(?:\\.[0-9]+)?)\\s+${metric.replace('/', '\\/')}(?:\\s|$)`))
      if (match) values[metric] = Number(match[1])
    }
    const canonical = name.replace(/-\d+$/, '')
    if (!Object.keys(values).length) {
      findings.push({ severity: 'warning', line: index + 1, message: `未在 ${name} 中找到支持的指标`, detail: '需要 ns/op、B/op 或 allocs/op' })
      return
    }
    if (entries.has(canonical)) findings.push({ severity: 'warning', line: index + 1, message: `${canonical} 重复出现`, detail: '使用最后一条 benchmark 记录' })
    entries.set(canonical, { name: canonical, displayName: name, values, line: index + 1 })
  })
  if (text.trim() && !entries.size) findings.push({ severity: 'error', message: '没有识别到 Go benchmark 行', detail: '示例：BenchmarkEncode-8  1000  120 ns/op  32 B/op  2 allocs/op' })
  return { entries, findings }
}

export function compareBenchmarks(baselineText: string, candidateText: string) {
  const baseline = parseBenchmarks(baselineText)
  const candidate = parseBenchmarks(candidateText)
  const names = [...new Set([...baseline.entries.keys(), ...candidate.entries.keys()])].sort()
  const comparisons: BenchmarkComparison[] = names.map((name) => {
    const before = baseline.entries.get(name)
    const after = candidate.entries.get(name)
    return {
      name,
      baseline: before,
      candidate: after,
      metrics: BENCHMARK_METRICS.map((metric) => {
        const left = before?.values[metric]
        const right = after?.values[metric]
        if (left === undefined || right === undefined || left === 0) return { metric, before: left, after: right, status: 'missing' as const }
        const delta = ((right - left) / left) * 100
        return { metric, before: left, after: right, delta, status: delta < -0.5 ? 'improved' as const : delta > 0.5 ? 'regressed' as const : 'same' as const }
      }),
    }
  })
  return { comparisons, findings: [...baseline.findings.map((item) => ({ ...item, detail: `基准组：${item.detail || ''}` })), ...candidate.findings.map((item) => ({ ...item, detail: `候选组：${item.detail || ''}` }))] }
}

type JsonRecord = Record<string, unknown>
export type ResolutionStep = { label: string; value: string; status: 'matched' | 'skipped' | 'failed' }
export type PackageResolution = { target?: string; steps: ResolutionStep[]; findings: Finding[]; field: 'exports' | 'imports' }

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function jsonErrorFinding(error: unknown, text: string): Finding {
  const message = error instanceof Error ? error.message : 'JSON 无法解析'
  const position = Number(message.match(/position\s+(\d+)/i)?.[1])
  if (!Number.isFinite(position)) {
    const location = message.match(/line\s+(\d+)\s+column\s+(\d+)/i)
    return location
      ? { severity: 'error', line: Number(location[1]), message: `package.json 语法错误（第 ${location[1]} 行，第 ${location[2]} 列）`, detail: message }
      : { severity: 'error', message: 'package.json 语法错误', detail: message }
  }
  const before = text.slice(0, position)
  const line = before.split('\n').length
  const column = position - before.lastIndexOf('\n')
  return { severity: 'error', line, message: `package.json 语法错误（第 ${line} 行，第 ${column} 列）`, detail: message }
}

function findPattern(map: JsonRecord, query: string) {
  if (Object.prototype.hasOwnProperty.call(map, query)) return { key: query, star: '' }
  return Object.keys(map)
    .filter((key) => key.includes('*'))
    .map((key) => {
      const [prefix, suffix = ''] = key.split('*')
      return query.startsWith(prefix) && query.endsWith(suffix) ? { key, star: query.slice(prefix.length, query.length - suffix.length), score: prefix.length + suffix.length } : null
    })
    .filter((item): item is { key: string; star: string; score: number } => Boolean(item))
    .sort((a, b) => b.score - a.score)[0]
}

function resolveTarget(value: unknown, conditions: Set<string>, steps: ResolutionStep[], star: string, field: 'exports' | 'imports'): string | undefined {
  if (typeof value === 'string') {
    const target = value.replaceAll('*', star)
    if (field === 'exports' && !target.startsWith('./')) {
      steps.push({ label: '目标校验', value: `${target}（exports 目标必须以 ./ 开头）`, status: 'failed' })
      return undefined
    }
    steps.push({ label: '解析目标', value: target, status: 'matched' })
    return target
  }
  if (value === null) {
    steps.push({ label: '阻断目标', value: 'null 明确禁止该子路径', status: 'failed' })
    return undefined
  }
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      steps.push({ label: `fallback ${index + 1}`, value: '尝试候选目标', status: 'skipped' })
      const target = resolveTarget(value[index], conditions, steps, star, field)
      if (target) return target
    }
    return undefined
  }
  if (isRecord(value)) {
    for (const [condition, target] of Object.entries(value)) {
      const matches = condition === 'default' || conditions.has(condition)
      steps.push({ label: `条件 ${condition}`, value: matches ? '命中，继续解析' : '当前条件集合不包含此项', status: matches ? 'matched' : 'skipped' })
      if (matches) {
        const resolved = resolveTarget(target, conditions, steps, star, field)
        if (resolved) return resolved
      }
    }
    return undefined
  }
  steps.push({ label: '目标类型', value: `不支持 ${typeof value} 类型目标`, status: 'failed' })
  return undefined
}

export function resolvePackageTarget(text: string, rawQuery: string, rawConditions: string): PackageResolution {
  const query = rawQuery.trim()
  const field = query.startsWith('#') ? 'imports' : 'exports'
  const steps: ResolutionStep[] = []
  const findings: Finding[] = []
  let pkg: JsonRecord
  try {
    const value: unknown = JSON.parse(text)
    if (!isRecord(value)) throw new Error('package.json 根节点必须是对象')
    pkg = value
  } catch (error) {
    return { steps, findings: [jsonErrorFinding(error, text)], field }
  }
  if (!query) return { steps, findings: [{ severity: 'error', message: '请输入子路径或 imports 别名', detail: '例如 .、./feature 或 #internal' }], field }
  if (field === 'exports' && query !== '.' && !query.startsWith('./')) return { steps, findings: [{ severity: 'error', message: 'exports 子路径必须是 . 或以 ./ 开头' }], field }
  const root = pkg[field]
  if (root === undefined) return { steps, findings: [{ severity: 'error', message: `package.json 未声明 ${field}` }], field }
  const conditions = new Set(rawConditions.split(/[\s,]+/).filter(Boolean))
  conditions.add('default')
  let targetValue: unknown = root
  let star = ''
  if (isRecord(root)) {
    const keys = Object.keys(root)
    const isPathMap = keys.some((key) => field === 'exports' ? key.startsWith('.') : key.startsWith('#'))
    if (isPathMap) {
      const match = findPattern(root, query)
      if (!match) return { steps: [{ label: '子路径匹配', value: `${query} 没有精确项或通配符项`, status: 'failed' }], findings: [{ severity: 'error', message: `未导出 ${query}`, detail: '仅模拟 package.json 映射，不检查本地文件是否存在' }], field }
      targetValue = root[match.key]
      star = match.star
      steps.push({ label: '子路径匹配', value: match.key === query ? `${query}（精确匹配）` : `${match.key}，* = ${star}`, status: 'matched' })
    } else if (field === 'exports' && query !== '.') {
      return { steps: [{ label: '主入口映射', value: '条件对象只适用于 package 根入口 .', status: 'failed' }], findings: [{ severity: 'error', message: `未导出 ${query}` }], field }
    }
  } else if (field === 'exports' && query !== '.') {
    return { steps: [{ label: '主入口映射', value: '字符串或数组 exports 只适用于 .', status: 'failed' }], findings: [{ severity: 'error', message: `未导出 ${query}` }], field }
  }
  const target = resolveTarget(targetValue, conditions, steps, star, field)
  if (!target) findings.push({ severity: 'error', message: '所有匹配目标均解析失败', detail: '查看匹配链中的阻断、无效目标或未命中条件' })
  else findings.push({ severity: 'info', message: `静态解析到 ${target}`, detail: '未访问文件系统，也未查询 npm；目标文件是否存在不在本工具校验范围内' })
  return { target, steps, findings, field }
}

export type DependencyNode = { depth: number; id: string; version?: string; scope?: string; status?: string; line: number }
export type DependencyAnalysis = { format: 'Maven' | 'Gradle' | '未知'; nodes: DependencyNode[]; findings: Finding[]; scopes: Record<string, number>; conflicts: DependencyNode[] }

export function analyzeDependencyTree(text: string): DependencyAnalysis {
  const isGradle = /(?:^|\n)[^\n]*(?:compileClasspath|runtimeClasspath|testRuntimeClasspath|\+---|\\---)/.test(text) && !/maven-dependency-plugin|dependency:tree/.test(text)
  const format = isGradle ? 'Gradle' : /(?:\[INFO\].*[+\\]-|dependency:tree|maven-dependency-plugin)/.test(text) ? 'Maven' : '未知'
  const nodes: DependencyNode[] = []
  const findings: Finding[] = []
  let configuration = ''
  text.split(/\r?\n/).forEach((raw, index) => {
    if (isGradle) {
      const config = raw.match(/^([\w.-]+)\s+-\s+/)
      if (config) configuration = config[1]
      const marker = raw.match(/^(.*?)(?:\+---|\\---)\s+(.+)$/)
      if (!marker) return
      const depth = (marker[1].match(/(?:\| {4}| {5})/g) || []).length
      const content = marker[2].trim()
      const coordinate = content.match(/^([^:\s]+):([^:\s]+):([^\s]+)(?:\s+->\s+([^\s]+))?/)
      if (!coordinate) return
      const statusBits = [coordinate[4] ? `版本选择 ${coordinate[3]} → ${coordinate[4]}` : '', content.includes('(*)') ? '重复子树' : '', content.includes('(c)') ? '约束' : '', content.includes('(n)') ? '未解析' : ''].filter(Boolean)
      nodes.push({ depth, id: `${coordinate[1]}:${coordinate[2]}`, version: coordinate[4] || coordinate[3], scope: configuration || '未标注', status: statusBits.join('；'), line: index + 1 })
      return
    }
    const clean = raw.replace(/^\[(?:INFO|WARNING|DEBUG|ERROR)\]\s*/, '')
    const markerIndex = clean.search(/[+\\]- /)
    if (markerIndex < 0) return
    const prefix = clean.slice(0, markerIndex)
    const content = clean.slice(markerIndex + 3).trim()
    const parts = content.split(':')
    if (parts.length < 4) return
    const depth = Math.floor(prefix.length / 3)
    const scope = parts.length >= 5 ? parts[parts.length - 1].split(/\s/)[0] : '未标注'
    const version = parts.length >= 5 ? parts[parts.length - 2] : parts[3]
    const id = `${parts[0]}:${parts[1]}`
    const omitted = content.match(/\(omitted for ([^)]+)\)/)?.[1]
    nodes.push({ depth, id, version, scope, status: omitted ? `省略：${omitted}` : undefined, line: index + 1 })
  })
  if (text.trim() && !nodes.length) findings.push({ severity: 'error', message: '未识别到 Maven 或 Gradle 依赖节点', detail: '请粘贴 mvn dependency:tree 或 Gradle dependencies 的纯文本输出' })
  const versions = new Map<string, Set<string>>()
  for (const node of nodes) {
    if (!versions.has(node.id)) versions.set(node.id, new Set())
    if (node.version) versions.get(node.id)?.add(node.version)
  }
  for (const [id, values] of versions) if (values.size > 1) findings.push({ severity: 'warning', message: `${id} 出现多个版本`, detail: [...values].join('、') })
  const scopes: Record<string, number> = {}
  for (const node of nodes) scopes[node.scope || '未标注'] = (scopes[node.scope || '未标注'] || 0) + 1
  const conflicts = nodes.filter((node) => Boolean(node.status) || (versions.get(node.id)?.size || 0) > 1)
  return { format, nodes, findings, scopes, conflicts }
}

export type GoDirective = { kind: 'require' | 'replace' | 'exclude' | 'retract'; module: string; version?: string; target?: string; indirect?: boolean; line: number }
export type GoModAnalysis = { module?: string; go?: string; toolchain?: string; directives: GoDirective[]; findings: Finding[] }

export function analyzeGoMod(text: string): GoModAnalysis {
  const findings: Finding[] = []
  const directives: GoDirective[] = []
  let moduleName: string | undefined
  let goVersion: string | undefined
  let toolchain: string | undefined
  let block: GoDirective['kind'] | undefined
  text.split(/\r?\n/).forEach((raw, index) => {
    const lineNumber = index + 1
    const indirect = /\/\/\s*indirect\b/.test(raw)
    const line = raw.replace(/\/\/.*$/, '').trim()
    if (!line) return
    const open = line.match(/^(require|replace|exclude|retract)\s*\($/)
    if (open) { block = open[1] as GoDirective['kind']; return }
    if (line === ')') { if (!block) findings.push({ severity: 'error', line: lineNumber, message: '没有对应开始位置的 )' }); block = undefined; return }
    const command = block || line.split(/\s+/)[0]
    const payload = block ? line : line.slice(command.length).trim()
    if (command === 'module') { moduleName = payload; if (!payload) findings.push({ severity: 'error', line: lineNumber, message: 'module 缺少路径' }); return }
    if (command === 'go') { goVersion = payload; return }
    if (command === 'toolchain') { toolchain = payload; return }
    if (command === 'require' || command === 'exclude') {
      const [name, version] = payload.split(/\s+/)
      if (!name || !version) findings.push({ severity: 'error', line: lineNumber, message: `${command} 需要模块路径和版本` })
      else directives.push({ kind: command, module: name, version, indirect: command === 'require' && indirect, line: lineNumber })
      return
    }
    if (command === 'replace') {
      const [left, right] = payload.split(/\s+=>\s+/)
      if (!left || !right) { findings.push({ severity: 'error', line: lineNumber, message: 'replace 缺少 => 或目标' }); return }
      const leftParts = left.trim().split(/\s+/)
      directives.push({ kind: 'replace', module: leftParts[0], version: leftParts[1], target: right.trim(), line: lineNumber })
      return
    }
    if (command === 'retract') {
      const value = payload.replace(/^\[|\]$/g, '').trim()
      if (!value) findings.push({ severity: 'error', line: lineNumber, message: 'retract 缺少版本或区间' })
      else directives.push({ kind: 'retract', module: value, line: lineNumber })
      return
    }
    findings.push({ severity: 'warning', line: lineNumber, message: `无法识别指令 ${command}`, detail: line })
  })
  if (block) findings.push({ severity: 'error', message: `${block} 块缺少结束的 )` })
  if (text.trim() && !moduleName) findings.push({ severity: 'error', message: '缺少 module 指令' })
  const required = new Map(directives.filter((item) => item.kind === 'require').map((item) => [item.module, item]))
  for (const replacement of directives.filter((item) => item.kind === 'replace')) if (!required.has(replacement.module)) findings.push({ severity: 'info', line: replacement.line, message: `${replacement.module} 有 replace，但不在当前 require 中`, detail: 'replace 也可能作用于传递依赖；本工具不会联网补全依赖图' })
  return { module: moduleName, go: goVersion, toolchain, directives, findings }
}

export type ThreadInfo = { name: string; state: string; frames: string[]; waits: string[]; holds: string[]; line: number }
export type ThreadDumpAnalysis = { threads: ThreadInfo[]; states: Record<string, number>; groups: Array<{ signature: string; count: number; names: string[] }>; locks: Array<{ id: string; holders: string[]; waiters: string[] }>; deadlocks: string[][]; findings: Finding[] }

export function analyzeThreadDump(text: string): ThreadDumpAnalysis {
  const threads: ThreadInfo[] = []
  let current: ThreadInfo | undefined
  text.split(/\r?\n/).forEach((raw, index) => {
    const header = raw.match(/^"([^"]+)"/)
    if (header) { current = { name: header[1], state: 'UNKNOWN', frames: [], waits: [], holds: [], line: index + 1 }; threads.push(current); return }
    if (!current) return
    const state = raw.match(/java\.lang\.Thread\.State:\s*([A-Z_]+)/)?.[1]
    if (state) current.state = state
    const frame = raw.trim().match(/^at\s+(.+)/)?.[1]
    if (frame) current.frames.push(frame)
    const wait = raw.match(/- (?:waiting to lock|parking to wait for|waiting on)\s+<([^>]+)>/)?.[1]
    const hold = raw.match(/- locked\s+<([^>]+)>/)?.[1]
    if (wait) current.waits.push(wait)
    if (hold) current.holds.push(hold)
  })
  const findings: Finding[] = []
  if (text.trim() && !threads.length) findings.push({ severity: 'error', message: '未识别到线程标题', detail: '线程应以双引号名称开头，例如 "http-nio-8080-exec-1"' })
  const states: Record<string, number> = {}
  for (const thread of threads) states[thread.state] = (states[thread.state] || 0) + 1
  const signatures = new Map<string, ThreadInfo[]>()
  for (const thread of threads) {
    const signature = `${thread.state}\n${thread.frames.slice(0, 12).join('\n')}`
    if (!signatures.has(signature)) signatures.set(signature, [])
    signatures.get(signature)?.push(thread)
  }
  const groups = [...signatures.entries()].map(([signature, values]) => ({ signature, count: values.length, names: values.map((item) => item.name) })).sort((a, b) => b.count - a.count)
  const lockMap = new Map<string, { holders: string[]; waiters: string[] }>()
  for (const thread of threads) {
    for (const id of thread.holds) { if (!lockMap.has(id)) lockMap.set(id, { holders: [], waiters: [] }); lockMap.get(id)?.holders.push(thread.name) }
    for (const id of thread.waits) { if (!lockMap.has(id)) lockMap.set(id, { holders: [], waiters: [] }); lockMap.get(id)?.waiters.push(thread.name) }
  }
  const edges = new Map<string, string[]>()
  for (const { holders, waiters } of lockMap.values()) for (const waiter of waiters) edges.set(waiter, [...(edges.get(waiter) || []), ...holders])
  const deadlocks: string[][] = []
  const deadlockKeys = new Set<string>()
  const visit = (node: string, path: string[]) => {
    const position = path.indexOf(node)
    if (position >= 0) {
      const core = path.slice(position)
      const rotations = core.map((_, index) => [...core.slice(index), ...core.slice(0, index)].join('\u0000'))
      const key = rotations.sort()[0]
      if (!deadlockKeys.has(key)) { deadlockKeys.add(key); deadlocks.push([...core, core[0]]) }
      return
    }
    if (path.length > Math.min(threads.length, 64) || deadlocks.length >= 50) return
    for (const next of edges.get(node) || []) visit(next, [...path, node])
  }
  for (const node of edges.keys()) visit(node, [])
  if (/Found one Java-level deadlock|Found \d+ deadlocks?/i.test(text)) findings.push({ severity: 'error', message: '原始转储明确报告 Java 级死锁' })
  if (deadlocks.length) findings.push({ severity: 'error', message: `锁等待图发现 ${deadlocks.length} 个环`, detail: '这是启发式结果，请结合完整 JVM deadlock 段确认' })
  return { threads, states, groups, locks: [...lockMap.entries()].map(([id, value]) => ({ id, ...value })), deadlocks, findings }
}

export type CssSelector = { selector: string; specificity: [number, number, number]; line: number; valid: boolean }
export type CssRule = { selectors: CssSelector[]; declarations: Array<{ property: string; value: string; important: boolean; line: number }>; line: number }
export type CssAnalysis = { rules: CssRule[]; selectors: CssSelector[]; findings: Finding[]; overrides: Array<{ property: string; from: string; to: string; reason: string }> }

function splitTopLevel(value: string, separator = ',') {
  const result: string[] = []
  let depth = 0
  let quote = ''
  let start = 0
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i]
    if (quote) { if (char === quote && value[i - 1] !== '\\') quote = ''; continue }
    if (char === '"' || char === "'") quote = char
    else if (char === '(' || char === '[') depth += 1
    else if (char === ')' || char === ']') depth -= 1
    else if (char === separator && depth === 0) { result.push(value.slice(start, i)); start = i + 1 }
  }
  result.push(value.slice(start))
  return result
}

function addSpecificity(left: [number, number, number], right: [number, number, number]): [number, number, number] {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]]
}

function maxSpecificity(values: Array<[number, number, number]>): [number, number, number] {
  return values.sort((a, b) => b[0] - a[0] || b[1] - a[1] || b[2] - a[2])[0] || [0, 0, 0]
}

export function calculateSpecificity(raw: string): [number, number, number] {
  let selector = raw
  let score: [number, number, number] = [0, 0, 0]
  selector = selector.replace(/:(where|is|not|has)\(([^()]*)\)/g, (_, name: string, content: string) => {
    if (name !== 'where') score = addSpecificity(score, maxSpecificity(splitTopLevel(content).map((part) => calculateSpecificity(part))))
    return ''
  })
  selector = selector.replace(/:nth-(?:child|last-child)\(([^()]*)\)/g, (_, content: string) => {
    score[1] += 1
    const of = content.match(/\bof\s+(.+)$/)?.[1]
    if (of) score = addSpecificity(score, maxSpecificity(splitTopLevel(of).map((part) => calculateSpecificity(part))))
    return ''
  })
  score[0] += (selector.match(/#[\w-]+/g) || []).length
  score[1] += (selector.match(/\.[\w-]+/g) || []).length
  score[1] += (selector.match(/\[[^\]]+\]/g) || []).length
  score[2] += (selector.match(/::[\w-]+/g) || []).length
  const withoutPseudoElements = selector.replace(/::[\w-]+/g, '')
  score[1] += (withoutPseudoElements.match(/:(?!:)[\w-]+(?:\([^)]*\))?/g) || []).length
  const cleaned = withoutPseudoElements.replace(/#[\w-]+|\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+(?:\([^)]*\))?|\*/g, ' ')
  score[2] += (cleaned.match(/(?:^|[\s>+~|])([a-zA-Z][\w-]*)/g) || []).length
  return score
}

function selectorValid(selector: string) {
  let round = 0; let square = 0
  for (const char of selector) { if (char === '(') round += 1; if (char === ')') round -= 1; if (char === '[') square += 1; if (char === ']') square -= 1; if (round < 0 || square < 0) return false }
  return Boolean(selector.trim()) && round === 0 && square === 0 && !/[>+~]\s*$/.test(selector)
}

function selectorTokens(selector: string) {
  return new Set(selector.match(/#[\w-]+|\.[\w-]+|\[[^\]]+\]|(?:^|[\s>+~])([a-zA-Z][\w-]*)/g)?.map((value) => value.trim()) || [])
}

function mayOverlap(left: string, right: string) {
  if (left === right) return true
  const leftTokens = selectorTokens(left)
  const rightTokens = selectorTokens(right)
  return [...leftTokens].some((token) => rightTokens.has(token)) || left.includes(right) || right.includes(left)
}

export function analyzeCss(text: string): CssAnalysis {
  const findings: Finding[] = []
  const rules: CssRule[] = []
  const withoutComments = text.replace(/\/\*[\s\S]*?\*\//g, (match) => '\n'.repeat((match.match(/\n/g) || []).length))
  if ((text.match(/\/\*/g) || []).length !== (text.match(/\*\//g) || []).length) findings.push({ severity: 'error', message: 'CSS 注释没有正确闭合' })
  if (!withoutComments.includes('{')) {
    const selectors = withoutComments.split(/\r?\n/).map((selector, index) => ({ selector: selector.trim(), specificity: calculateSpecificity(selector), line: index + 1, valid: selectorValid(selector) })).filter((item) => item.selector)
    selectors.filter((item) => !item.valid).forEach((item) => findings.push({ severity: 'error', line: item.line, message: `选择器可能无效：${item.selector}` }))
    return { rules, selectors, findings, overrides: [] }
  }
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g
  let match: RegExpExecArray | null
  while ((match = rulePattern.exec(withoutComments))) {
    const leadingSelectorWhitespace = match[1].match(/^\s*/)?.[0] || ''
    const line = withoutComments.slice(0, match.index).split('\n').length + (leadingSelectorWhitespace.match(/\n/g) || []).length
    const selectorText = match[1].trim()
    if (selectorText.startsWith('@') && !/^@(scope|layer)\b/.test(selectorText)) continue
    const selectors = splitTopLevel(selectorText).map((selector) => ({ selector: selector.trim(), specificity: calculateSpecificity(selector), line, valid: selectorValid(selector) }))
    const declarations: CssRule['declarations'] = []
    const bodyOffset = match.index + match[0].indexOf('{') + 1
    let declarationCursor = 0
    splitTopLevel(match[2], ';').forEach((rawDeclaration) => {
      const declaration = rawDeclaration.trim()
      if (!declaration) return
      const colon = declaration.indexOf(':')
      const relativeOffset = match?.[2].indexOf(rawDeclaration, declarationCursor) ?? 0
      declarationCursor = relativeOffset + rawDeclaration.length + 1
      const declarationOffset = bodyOffset + relativeOffset + rawDeclaration.indexOf(declaration)
      const declarationLine = withoutComments.slice(0, declarationOffset).split('\n').length
      if (colon <= 0) { findings.push({ severity: 'error', line: declarationLine, message: `声明缺少属性或冒号：${declaration}` }); return }
      const property = declaration.slice(0, colon).trim().toLowerCase()
      const rawValue = declaration.slice(colon + 1).trim()
      if (!/^--[\w-]+$|^-?[a-z][\w-]*$/i.test(property) || !rawValue) { findings.push({ severity: 'error', line: declarationLine, message: `无效声明：${declaration}` }); return }
      declarations.push({ property, value: rawValue.replace(/\s*!important\s*$/i, '').trim(), important: /!important\s*$/i.test(rawValue), line: declarationLine })
    })
    const seen = new Map<string, number>()
    for (const declaration of declarations) {
      if (seen.has(declaration.property)) findings.push({ severity: 'warning', line: declaration.line, message: `${selectorText} 重复声明 ${declaration.property}`, detail: `前一次位于第 ${seen.get(declaration.property)} 行；后声明通常覆盖前声明` })
      seen.set(declaration.property, declaration.line)
    }
    selectors.filter((item) => !item.valid).forEach((item) => findings.push({ severity: 'error', line: item.line, message: `选择器可能无效：${item.selector}` }))
    rules.push({ selectors, declarations, line })
  }
  const openCount = (withoutComments.match(/\{/g) || []).length
  const closeCount = (withoutComments.match(/\}/g) || []).length
  if (openCount !== closeCount) findings.push({ severity: 'error', message: `花括号不平衡：${openCount} 个 {，${closeCount} 个 }` })
  const selectors = rules.flatMap((rule) => rule.selectors)
  const overrides: CssAnalysis['overrides'] = []
  const overrideKeys = new Set<string>()
  const comparableRuleCount = Math.min(rules.length, 500)
  if (rules.length > comparableRuleCount) findings.push({ severity: 'warning', message: `覆盖关系仅比较前 ${comparableRuleCount} 条规则`, detail: `共解析 ${rules.length} 条规则；specificity 与声明诊断仍覆盖全部输入` })
  for (let leftIndex = 0; leftIndex < comparableRuleCount && overrides.length < 100; leftIndex += 1) for (let rightIndex = leftIndex + 1; rightIndex < comparableRuleCount && overrides.length < 100; rightIndex += 1) {
    const left = rules[leftIndex]; const right = rules[rightIndex]
    for (const leftDeclaration of left.declarations) for (const rightDeclaration of right.declarations) {
      if (overrides.length >= 100) break
      if (leftDeclaration.property !== rightDeclaration.property) continue
      for (const leftSelector of left.selectors) for (const rightSelector of right.selectors) {
        if (!mayOverlap(leftSelector.selector, rightSelector.selector)) continue
        const important = leftDeclaration.important !== rightDeclaration.important ? (rightDeclaration.important ? '后规则使用 !important' : '前规则的 !important 可能阻止覆盖') : '同一重要性下按 specificity 与源码顺序决定'
        const key = [leftDeclaration.property, leftSelector.selector, rightSelector.selector, important].join('\u0000')
        if (!overrideKeys.has(key)) { overrideKeys.add(key); overrides.push({ property: leftDeclaration.property, from: leftSelector.selector, to: rightSelector.selector, reason: important }) }
      }
    }
  }
  return { rules, selectors, findings, overrides }
}
