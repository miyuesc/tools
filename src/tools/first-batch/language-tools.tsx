import { AlertTriangle, ArrowUpDown, CheckCircle2, PackageCheck, WandSparkles } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { CopyButton, EditorPanel, type EditorLanguage } from '../shared/EditorPanel'
import { bumpSemVer, compareSemVer, parseSemVer, satisfiesSemVer, stringifySemVer } from './semver'

type JsonObject = Record<string, unknown>
type Diagnostic = { level: 'error' | 'warning' | 'success'; message: string; detail?: string }

const SAMPLE_JSON = `{
  "id": 1042,
  "display_name": "Lumen",
  "active": true,
  "created_at": "2026-08-12T08:30:00Z",
  "roles": ["admin", "editor"],
  "profile": {
    "email": "hello@example.com",
    "score": 98.5
  }
}`

function isRecord(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function pascalCase(value: string, fallback = 'Generated') {
  const result = value.replace(/[^A-Za-z0-9]+(.)?/g, (_, character: string | undefined) => character?.toUpperCase() || '')
    .replace(/^[a-z]/, (character) => character.toUpperCase())
    .replace(/^[^A-Za-z_]/, '_$&')
  return result || fallback
}

function camelCase(value: string, fallback = 'value') {
  const pascal = pascalCase(value, fallback)
  return pascal.charAt(0).toLowerCase() + pascal.slice(1)
}

function commonArrayValue(values: unknown[]) {
  const nonNull = values.filter((value) => value !== null && value !== undefined)
  return nonNull[0]
}

type JavaDefinition = { name: string; fields: Array<{ jsonName: string; name: string; type: string }> }

const JAVA_RESERVED = new Set(['abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally', 'float', 'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new', 'package', 'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'try', 'void', 'volatile', 'while', 'record', 'sealed', 'permits', 'var', 'yield'])

function javaFieldName(value: string) {
  const normalized = camelCase(value)
  return JAVA_RESERVED.has(normalized) ? `${normalized}Value` : normalized
}

function inferJavaType(value: unknown, hint: string, definitions: Map<string, JavaDefinition>): string {
  if (value === null || value === undefined) return 'Object'
  if (typeof value === 'string') return 'String'
  if (typeof value === 'boolean') return 'Boolean'
  if (typeof value === 'number') return Number.isInteger(value) ? 'Long' : 'Double'
  if (Array.isArray(value)) {
    const sample = commonArrayValue(value)
    return `List<${sample === undefined ? 'Object' : inferJavaType(sample, `${hint}Item`, definitions)}>`
  }
  if (isRecord(value)) {
    const name = pascalCase(hint)
    if (!definitions.has(name)) {
      definitions.set(name, { name, fields: [] })
      const fields = Object.entries(value).map(([jsonName, child]) => ({
        jsonName,
        name: javaFieldName(jsonName),
        type: inferJavaType(child, `${name}${pascalCase(jsonName)}`, definitions),
      }))
      definitions.set(name, { name, fields })
    }
    return name
  }
  return 'Object'
}

function renderJavaDefinition(definition: JavaDefinition, style: 'record' | 'class' | 'lombok', rootName: string, jsonProperties: boolean) {
  const visibility = definition.name === rootName ? 'public ' : ''
  const annotation = (field: JavaDefinition['fields'][number]) => jsonProperties && field.jsonName !== field.name ? `@JsonProperty(${JSON.stringify(field.jsonName)}) ` : ''
  if (style === 'record') {
    const fields = definition.fields.map((field) => `    ${annotation(field)}${field.type} ${field.name}`).join(',\n')
    return `${visibility}record ${definition.name}(\n${fields}\n) {}`
  }
  const body = definition.fields.map((field) => `    ${annotation(field)}private ${field.type} ${field.name};`).join('\n')
  if (style === 'lombok') return `@Data\n${visibility}class ${definition.name} {\n${body}\n}`
  const accessors = definition.fields.map((field) => {
    const method = pascalCase(field.name)
    return `    public ${field.type} get${method}() { return ${field.name}; }\n    public void set${method}(${field.type} ${field.name}) { this.${field.name} = ${field.name}; }`
  }).join('\n\n')
  return `${visibility}class ${definition.name} {\n${body}${accessors ? `\n\n${accessors}` : ''}\n}`
}

function generateJava(input: string, rootValue: string, packageName: string, style: 'record' | 'class' | 'lombok', jsonProperties: boolean) {
  const value: unknown = JSON.parse(input)
  const rootName = pascalCase(rootValue, 'Root')
  const definitions = new Map<string, JavaDefinition>()
  if (Array.isArray(value)) {
    const itemType = inferJavaType(commonArrayValue(value), `${rootName}Item`, definitions)
    definitions.set(rootName, { name: rootName, fields: [{ jsonName: 'items', name: 'items', type: `List<${itemType}>` }] })
  } else if (isRecord(value)) {
    inferJavaType(value, rootName, definitions)
  } else {
    definitions.set(rootName, { name: rootName, fields: [{ jsonName: 'value', name: 'value', type: inferJavaType(value, `${rootName}Value`, definitions) }] })
  }
  const ordered = [definitions.get(rootName), ...[...definitions.values()].filter((definition) => definition.name !== rootName)].filter(Boolean) as JavaDefinition[]
  const imports = ['import java.util.List;']
  if (style === 'lombok') imports.push('import lombok.Data;')
  if (jsonProperties) imports.push('import com.fasterxml.jackson.annotation.JsonProperty;')
  const packageLine = packageName.trim() ? `package ${packageName.trim()};\n\n` : ''
  return `${packageLine}${imports.join('\n')}\n\n${ordered.map((definition) => renderJavaDefinition(definition, style, rootName, jsonProperties)).join('\n\n')}`
}

type GoDefinition = { name: string; fields: Array<{ jsonName: string; name: string; type: string }> }

function inferGoType(value: unknown, hint: string, definitions: Map<string, GoDefinition>, inferDates: boolean): string {
  if (value === null || value === undefined) return 'any'
  if (typeof value === 'string') return inferDates && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value) ? 'time.Time' : 'string'
  if (typeof value === 'boolean') return 'bool'
  if (typeof value === 'number') return Number.isInteger(value) ? 'int64' : 'float64'
  if (Array.isArray(value)) {
    const sample = commonArrayValue(value)
    return `[]${sample === undefined ? 'any' : inferGoType(sample, `${hint}Item`, definitions, inferDates)}`
  }
  if (isRecord(value)) {
    const name = pascalCase(hint)
    if (!definitions.has(name)) {
      definitions.set(name, { name, fields: [] })
      const fields = Object.entries(value).map(([jsonName, child]) => ({
        jsonName,
        name: pascalCase(jsonName, 'Value'),
        type: inferGoType(child, `${name}${pascalCase(jsonName)}`, definitions, inferDates),
      }))
      definitions.set(name, { name, fields })
    }
    return name
  }
  return 'any'
}

function generateGo(input: string, rootValue: string, tagMode: 'json' | 'json-yaml', pointers: boolean, inferDates: boolean) {
  const value: unknown = JSON.parse(input)
  const rootName = pascalCase(rootValue, 'Root')
  const definitions = new Map<string, GoDefinition>()
  let rootAlias = ''
  if (Array.isArray(value)) rootAlias = `type ${rootName} ${inferGoType(value, rootName, definitions, inferDates)}`
  else if (isRecord(value)) inferGoType(value, rootName, definitions, inferDates)
  else rootAlias = `type ${rootName} ${inferGoType(value, `${rootName}Value`, definitions, inferDates)}`
  const ordered = [definitions.get(rootName), ...[...definitions.values()].filter((definition) => definition.name !== rootName)].filter(Boolean) as GoDefinition[]
  const rendered = ordered.map((definition) => {
    const fields = definition.fields.map((field) => {
      const pointerType = pointers && /^(?:string|bool|int64|float64|time\.Time)$/.test(field.type) ? `*${field.type}` : field.type
      const tags = tagMode === 'json-yaml' ? `json:${JSON.stringify(field.jsonName)} yaml:${JSON.stringify(field.jsonName)}` : `json:${JSON.stringify(field.jsonName)}`
      return `\t${field.name} ${pointerType} \`${tags}\``
    }).join('\n')
    return `type ${definition.name} struct {\n${fields}\n}`
  })
  const packageLine = 'package model'
  const importLine = inferDates && [...definitions.values()].some((definition) => definition.fields.some((field) => field.type === 'time.Time')) ? '\n\nimport "time"' : ''
  return `${packageLine}${importLine}\n\n${[rootAlias, ...rendered].filter(Boolean).join('\n\n')}`
}

function GeneratorToolbar({ rootName, setRootName, children, onGenerate }: { rootName: string; setRootName: (value: string) => void; children: ReactNode; onGenerate: () => void }) {
  return <div className="workspace-toolbar generator-toolbar"><label className="toolbar-field">根类型<input value={rootName} onChange={(event) => setRootName(event.target.value)} /></label>{children}<span /><button className="primary-action" onClick={onGenerate}><WandSparkles size={15} />生成代码</button></div>
}

export function JsonToJavaPage() {
  const [input, setInput] = useState(SAMPLE_JSON)
  const [output, setOutput] = useState('')
  const [rootName, setRootName] = useState('UserResponse')
  const [packageName, setPackageName] = useState('com.example.api')
  const [style, setStyle] = useState<'record' | 'class' | 'lombok'>('record')
  const [jsonProperties, setJsonProperties] = useState(true)
  const [error, setError] = useState('')
  const generate = () => {
    try { setOutput(generateJava(input, rootName, packageName, style, jsonProperties)); setError('') }
    catch (cause) { setOutput(''); setError(cause instanceof Error ? cause.message : 'JSON 无法解析') }
  }
  return <div className="language-workbench">
    <GeneratorToolbar rootName={rootName} setRootName={setRootName} onGenerate={generate}>
      <label className="toolbar-field">包名<input value={packageName} onChange={(event) => setPackageName(event.target.value)} /></label>
      <select aria-label="Java 类型风格" value={style} onChange={(event) => setStyle(event.target.value as typeof style)}><option value="record">Record</option><option value="class">POJO Class</option><option value="lombok">Lombok @Data</option></select>
      <label className="toolbar-check"><input type="checkbox" checked={jsonProperties} onChange={(event) => setJsonProperties(event.target.checked)} />JsonProperty</label>
    </GeneratorToolbar>
    <div className="dual-editor"><EditorPanel label="JSON 示例" language="json" value={input} onChange={setInput} showLineNumbers /><EditorPanel label="Java 模型" language="java" value={output} readOnly showLineNumbers actions={<CopyButton value={output} />} emptyMessage="配置根类型后生成 Java 代码" /></div>
    <div className={`status-line ${error ? 'error' : ''}`}>{error || (output ? `已生成 ${output.split('\n').length} 行 Java 代码` : '支持嵌套对象、数组、Record、POJO 与 Lombok')}</div>
  </div>
}

export function JsonToGoPage() {
  const [input, setInput] = useState(SAMPLE_JSON)
  const [output, setOutput] = useState('')
  const [rootName, setRootName] = useState('UserResponse')
  const [tagMode, setTagMode] = useState<'json' | 'json-yaml'>('json-yaml')
  const [pointers, setPointers] = useState(false)
  const [inferDates, setInferDates] = useState(true)
  const [error, setError] = useState('')
  const generate = () => {
    try { setOutput(generateGo(input, rootName, tagMode, pointers, inferDates)); setError('') }
    catch (cause) { setOutput(''); setError(cause instanceof Error ? cause.message : 'JSON 无法解析') }
  }
  return <div className="language-workbench">
    <GeneratorToolbar rootName={rootName} setRootName={setRootName} onGenerate={generate}>
      <select aria-label="Go Struct 标签" value={tagMode} onChange={(event) => setTagMode(event.target.value as typeof tagMode)}><option value="json">JSON tags</option><option value="json-yaml">JSON + YAML</option></select>
      <label className="toolbar-check"><input type="checkbox" checked={pointers} onChange={(event) => setPointers(event.target.checked)} />标量指针</label>
      <label className="toolbar-check"><input type="checkbox" checked={inferDates} onChange={(event) => setInferDates(event.target.checked)} />识别 time.Time</label>
    </GeneratorToolbar>
    <div className="dual-editor"><EditorPanel label="JSON 示例" language="json" value={input} onChange={setInput} showLineNumbers /><EditorPanel label="Go Struct" language="go" value={output} readOnly showLineNumbers actions={<CopyButton value={output} />} emptyMessage="配置标签后生成 Go Struct" /></div>
    <div className={`status-line ${error ? 'error' : ''}`}>{error || (output ? `已生成 ${output.split('\n').length} 行 Go 代码` : '支持嵌套 Struct、数组、Tag、指针与时间识别')}</div>
  </div>
}

type FormatLanguage = 'javascript' | 'jsx' | 'typescript' | 'tsx' | 'css'

const FORMAT_SAMPLES: Record<FormatLanguage, string> = {
  javascript: `const greet=(name)=>{console.log('Hello, '+name);return {ok:true,name}}\ngreet('Lumen')`,
  jsx: `export default function Badge({label,active}){return <button className={active?'active':''} onClick={()=>console.log(label)}>{label}</button>}`,
  typescript: `type User={id:number;name:string};const find=(users:User[],id:number):User|undefined=>users.find(item=>item.id===id)`,
  tsx: `type Props={title:string};export function Card({title}:Props){return <section><h2>{title}</h2><button>Open</button></section>}`,
  css: `.panel{display:grid;grid-template-columns:1fr auto;padding:12px;color:#fff;background:linear-gradient(135deg,#111,#334)}.panel:hover{transform:translateY(-2px)}`,
}

export function CodeFormatterPage() {
  const [language, setLanguage] = useState<FormatLanguage>('typescript')
  const [input, setInput] = useState(FORMAT_SAMPLES.typescript)
  const [output, setOutput] = useState('')
  const [printWidth, setPrintWidth] = useState(100)
  const [tabWidth, setTabWidth] = useState(2)
  const [singleQuote, setSingleQuote] = useState(true)
  const [semi, setSemi] = useState(false)
  const [error, setError] = useState('')
  const changeLanguage = (next: FormatLanguage) => { setLanguage(next); setInput(FORMAT_SAMPLES[next]); setOutput(''); setError('') }
  const formatCode = async () => {
    try {
      const parser = language === 'css' ? 'css' : language === 'typescript' || language === 'tsx' ? 'typescript' : 'babel'
      const pluginPromise = language === 'css'
        ? import('prettier/plugins/postcss').then((plugin) => [plugin.default])
        : Promise.all([
            language === 'typescript' || language === 'tsx' ? import('prettier/plugins/typescript') : import('prettier/plugins/babel'),
            import('prettier/plugins/estree'),
          ]).then((plugins) => plugins.map((plugin) => plugin.default))
      const [{ format }, plugins] = await Promise.all([import('prettier/standalone'), pluginPromise])
      const result = await format(input, { parser, plugins, printWidth, tabWidth, singleQuote, semi })
      setOutput(result); setError('')
    } catch (cause) { setOutput(''); setError(cause instanceof Error ? cause.message : '格式化失败') }
  }
  const editorLanguage: EditorLanguage = language === 'css' ? 'css' : language === 'typescript' || language === 'tsx' ? 'typescript' : 'javascript'
  return <div className="language-workbench">
    <div className="workspace-toolbar formatter-toolbar"><select aria-label="代码语言" value={language} onChange={(event) => changeLanguage(event.target.value as FormatLanguage)}><option value="javascript">JavaScript</option><option value="jsx">JSX</option><option value="typescript">TypeScript</option><option value="tsx">TSX</option><option value="css">CSS</option></select><label className="toolbar-field">行宽<input type="number" min="40" max="240" value={printWidth} onChange={(event) => setPrintWidth(Number(event.target.value))} /></label><label className="toolbar-field">缩进<input type="number" min="1" max="8" value={tabWidth} onChange={(event) => setTabWidth(Number(event.target.value))} /></label><label className="toolbar-check"><input type="checkbox" checked={singleQuote} onChange={(event) => setSingleQuote(event.target.checked)} />单引号</label><label className="toolbar-check"><input type="checkbox" checked={semi} onChange={(event) => setSemi(event.target.checked)} />分号</label><span /><button className="primary-action" onClick={formatCode}><WandSparkles size={15} />格式化</button></div>
    <div className="dual-editor"><EditorPanel label={`原始 ${language.toUpperCase()}`} language={editorLanguage} value={input} onChange={setInput} showLineNumbers /><EditorPanel label="格式化结果" language={editorLanguage} value={output} readOnly showLineNumbers actions={<CopyButton value={output} />} emptyMessage="点击“格式化”生成结果" /></div>
    <div className={`status-line ${error ? 'error' : ''}`}>{error || (output ? `Prettier 已格式化 ${output.split('\n').length} 行代码` : '格式化在浏览器中完成，不会执行输入代码')}</div>
  </div>
}

const SAMPLE_PACKAGE = `{
  "name": "lumen-widget",
  "version": "1.2.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^19.0.0"
  },
  "devDependencies": {
    "typescript": "~5.7.2",
    "vite": "^6.0.5"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}`

const PACKAGE_ORDER = ['name', 'version', 'description', 'keywords', 'homepage', 'bugs', 'repository', 'funding', 'license', 'author', 'contributors', 'files', 'type', 'main', 'module', 'types', 'exports', 'imports', 'bin', 'scripts', 'engines', 'packageManager', 'os', 'cpu', 'private', 'workspaces', 'peerDependencies', 'peerDependenciesMeta', 'dependencies', 'optionalDependencies', 'devDependencies']

function sortStringRecord(value: unknown) {
  if (!isRecord(value)) return value
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)))
}

function normalizePackage(value: JsonObject) {
  const entries = Object.entries(value).sort(([left], [right]) => {
    const leftIndex = PACKAGE_ORDER.indexOf(left)
    const rightIndex = PACKAGE_ORDER.indexOf(right)
    return (leftIndex < 0 ? 999 : leftIndex) - (rightIndex < 0 ? 999 : rightIndex) || left.localeCompare(right)
  }).map(([key, child]) => [key, ['scripts', 'dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies', 'exports'].includes(key) ? sortStringRecord(child) : child])
  return Object.fromEntries(entries)
}

function packageDiagnostics(input: string): { value?: JsonObject; diagnostics: Diagnostic[] } {
  try {
    const value: unknown = JSON.parse(input)
    if (!isRecord(value)) return { diagnostics: [{ level: 'error', message: 'package.json 根节点必须是对象' }] }
    const diagnostics: Diagnostic[] = []
    if (typeof value.name !== 'string' || !value.name) diagnostics.push({ level: 'error', message: '缺少有效的 name 字段' })
    else if (!/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(value.name)) diagnostics.push({ level: 'error', message: '包名格式不符合 npm 规则', detail: '使用小写字母、数字、点、短横线或作用域名称' })
    if (typeof value.version !== 'string' || !parseSemVer(value.version)) diagnostics.push({ level: 'error', message: 'version 不是有效 SemVer' })
    if (!value.description) diagnostics.push({ level: 'warning', message: '建议补充 description' })
    if (!value.license && value.private !== true) diagnostics.push({ level: 'warning', message: '公开包建议声明 license' })
    if (!['module', 'commonjs', undefined].includes(value.type as string | undefined)) diagnostics.push({ level: 'error', message: 'type 只能是 module 或 commonjs' })
    if (value.scripts !== undefined && !isRecord(value.scripts)) diagnostics.push({ level: 'error', message: 'scripts 必须是对象' })
    const dependencies = isRecord(value.dependencies) ? value.dependencies : {}
    const development = isRecord(value.devDependencies) ? value.devDependencies : {}
    const duplicates = Object.keys(dependencies).filter((name) => name in development)
    if (duplicates.length) diagnostics.push({ level: 'warning', message: 'dependencies 与 devDependencies 存在重复项', detail: duplicates.join(', ') })
    for (const [group, entries] of [['dependencies', dependencies], ['devDependencies', development]] as const) {
      const invalid = Object.entries(entries).filter(([, range]) => typeof range !== 'string' || !range.trim()).map(([name]) => name)
      if (invalid.length) diagnostics.push({ level: 'error', message: `${group} 包含无效版本`, detail: invalid.join(', ') })
    }
    if (!diagnostics.some((diagnostic) => diagnostic.level === 'error')) diagnostics.push({ level: 'success', message: '结构有效，可以作为 package.json 使用' })
    return { value, diagnostics }
  } catch (cause) {
    return { diagnostics: [{ level: 'error', message: 'JSON 语法错误', detail: cause instanceof Error ? cause.message : undefined }] }
  }
}

export function PackageJsonPage() {
  const [input, setInput] = useState(SAMPLE_PACKAGE)
  const analysis = useMemo(() => packageDiagnostics(input), [input])
  const updateField = (key: string, value: string | boolean) => {
    if (!analysis.value) return
    setInput(JSON.stringify({ ...analysis.value, [key]: value }, null, 2))
  }
  const organize = () => { if (analysis.value) setInput(`${JSON.stringify(normalizePackage(analysis.value), null, 2)}\n`) }
  return <div className="package-workbench">
    <div className="package-builder"><label>名称<input value={typeof analysis.value?.name === 'string' ? analysis.value.name : ''} onChange={(event) => updateField('name', event.target.value)} disabled={!analysis.value} /></label><label>版本<input value={typeof analysis.value?.version === 'string' ? analysis.value.version : ''} onChange={(event) => updateField('version', event.target.value)} disabled={!analysis.value} /></label><label>模块类型<select value={typeof analysis.value?.type === 'string' ? analysis.value.type : 'module'} onChange={(event) => updateField('type', event.target.value)} disabled={!analysis.value}><option value="module">ES Module</option><option value="commonjs">CommonJS</option></select></label><label className="package-private"><input type="checkbox" checked={analysis.value?.private === true} onChange={(event) => updateField('private', event.target.checked)} disabled={!analysis.value} />私有包</label><button onClick={organize} disabled={!analysis.value}><ArrowUpDown size={15} />整理字段与依赖</button></div>
    <div className="package-grid"><EditorPanel label="package.json" language="json" value={input} onChange={setInput} showLineNumbers actions={<CopyButton value={input} />} /><section className="diagnostic-panel"><header><PackageCheck size={18} /><div><strong>结构检查</strong><span>{analysis.diagnostics.length} 项结果</span></div></header><div>{analysis.diagnostics.map((diagnostic, index) => <article className={diagnostic.level} key={`${diagnostic.message}-${index}`}>{diagnostic.level === 'error' ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}<div><strong>{diagnostic.message}</strong>{diagnostic.detail && <small>{diagnostic.detail}</small>}</div></article>)}</div></section></div>
  </div>
}

export function SemVerPage() {
  const [range, setRange] = useState('^2.4.0 || >=3.0.0 <3.2.0')
  const [versions, setVersions] = useState('1.9.0\n2.4.0\n2.8.3\n3.0.0-beta.1\n3.0.0\n3.1.7\n3.2.0')
  const [base, setBase] = useState('2.8.3')
  const rows = useMemo(() => versions.split(/\s+/).filter(Boolean).map((value) => ({ value, parsed: parseSemVer(value), matches: satisfiesSemVer(value, range) })), [range, versions])
  const sorted = useMemo(() => rows.filter((row) => row.parsed).sort((left, right) => compareSemVer(left.parsed!, right.parsed!)), [rows])
  const parsedBase = parseSemVer(base)
  return <div className="semver-workbench">
    <div className="semver-query"><label><span>版本范围</span><input value={range} onChange={(event) => setRange(event.target.value)} placeholder="^1.2.0 || >=2.0.0" /></label><label><span>基准版本</span><input value={base} onChange={(event) => setBase(event.target.value)} /></label><div className="semver-bumps">{(['patch', 'minor', 'major'] as const).map((release) => <button key={release} disabled={!parsedBase} onClick={() => parsedBase && setBase(stringifySemVer(bumpSemVer(parsedBase, release)))}><span>{release}</span><code>{parsedBase ? stringifySemVer(bumpSemVer(parsedBase, release)) : '—'}</code></button>)}</div></div>
    <div className="semver-grid"><EditorPanel label="待测试版本（每行一个）" value={versions} onChange={setVersions} /><section className="semver-results"><header><span>匹配结果</span><code>{rows.filter((row) => row.matches).length}/{rows.length}</code></header>{rows.map((row) => <div className={!row.parsed ? 'invalid' : row.matches ? 'matches' : ''} key={row.value}><code>{row.value}</code><span>{!row.parsed ? '无效版本' : row.matches ? '满足范围' : '不满足'}</span></div>)}</section></div>
    <div className="status-line">排序结果：{sorted.map((row) => row.value).join('  <  ') || '没有有效版本'}</div>
  </div>
}

const JAVA_TRACE_SAMPLE = `java.lang.IllegalStateException: Unable to load user
    at com.example.user.UserService.find(UserService.java:84)
    at com.example.api.UserController.get(UserController.java:41)
    at org.springframework.web.servlet.FrameworkServlet.doGet(FrameworkServlet.java:920)
Caused by: java.sql.SQLTimeoutException: Query timed out after 3000ms
    at com.example.store.UserRepository.query(UserRepository.java:127)
    at com.example.user.UserService.find(UserService.java:78)
    ... 18 more`

type JavaFrame = { method: string; file: string; line?: number }

function analyzeJavaTrace(value: string, prefix: string) {
  const lines = value.split('\n')
  const causes = lines.map((line) => line.trim().match(/^(?:Caused by:\s*)?([\w.$]+(?:Exception|Error|Throwable))(?::\s*(.*))?$/)).filter(Boolean).map((match) => ({ type: match![1], message: match![2] || '' }))
  const frames: JavaFrame[] = lines.map((line) => line.match(/^\s*at\s+([^()]+)\(([^():]+)(?::(\d+))?\)/)).filter(Boolean).map((match) => ({ method: match![1], file: match![2], line: match![3] ? Number(match![3]) : undefined }))
  const root = causes.at(-1)
  const business = frames.filter((frame) => prefix.trim() ? frame.method.startsWith(prefix.trim()) : !/^(?:java|javax|jdk|sun|org\.springframework)\./.test(frame.method))
  return { causes, frames, business, root }
}

export function JavaStackTracePage() {
  const [input, setInput] = useState(JAVA_TRACE_SAMPLE)
  const [prefix, setPrefix] = useState('com.example')
  const [businessOnly, setBusinessOnly] = useState(true)
  const analysis = useMemo(() => analyzeJavaTrace(input, prefix), [input, prefix])
  const visibleFrames = businessOnly ? analysis.business : analysis.frames
  const summary = [`Root cause: ${analysis.root ? `${analysis.root.type}: ${analysis.root.message}` : '未识别'}`, `Cause chain: ${analysis.causes.map((cause) => cause.type).join(' → ') || '无'}`, '', ...visibleFrames.map((frame, index) => `${index + 1}. ${frame.method} (${frame.file}${frame.line ? `:${frame.line}` : ''})`)].join('\n')
  return <div className="trace-workbench">
    <div className="workspace-toolbar"><label className="toolbar-field">业务包前缀<input value={prefix} onChange={(event) => setPrefix(event.target.value)} /></label><label className="toolbar-check"><input type="checkbox" checked={businessOnly} onChange={(event) => setBusinessOnly(event.target.checked)} />只看业务帧</label><span /><code className="toolbar-hint">{analysis.causes.length} 层异常 · {analysis.frames.length} 个调用帧</code></div>
    <div className="trace-grid"><EditorPanel label="Java Stack Trace" value={input} onChange={setInput} showLineNumbers /><section className="trace-report"><header><span>ROOT CAUSE</span><strong>{analysis.root?.type || '未识别异常类型'}</strong><p>{analysis.root?.message || '粘贴完整 Java 异常堆栈'}</p></header><div className="trace-chain">{analysis.causes.map((cause, index) => <div key={`${cause.type}-${index}`}><span>{index + 1}</span><code>{cause.type}</code><small>{cause.message}</small></div>)}</div><div className="trace-frames">{visibleFrames.map((frame, index) => <div key={`${frame.method}-${index}`}><span>{index + 1}</span><code>{frame.method}</code><small>{frame.file}{frame.line ? `:${frame.line}` : ''}</small></div>)}</div></section></div>
    <div className="status-line"><CopyButton value={summary} />{businessOnly ? `${analysis.business.length} 个业务调用帧` : `${analysis.frames.length} 个完整调用帧`}</div>
  </div>
}

const GO_DUMP_SAMPLE = `goroutine 18 [select, 4 minutes]:
database/sql.(*DB).connectionOpener(0xc0001801a0, {0x12a9c80, 0xc0001a2050})
    /usr/local/go/src/database/sql/sql.go:1253 +0x87
created by database/sql.OpenDB in goroutine 1
    /usr/local/go/src/database/sql/sql.go:833 +0x130

goroutine 42 [chan receive, 2 minutes]:
example.com/app/worker.(*Pool).Run(0xc00020a000)
    /workspace/worker/pool.go:74 +0x145
example.com/app/api.(*Server).startWorkers(0xc00019e000)
    /workspace/api/server.go:51 +0x92

goroutine 43 [chan receive, 2 minutes]:
example.com/app/worker.(*Pool).Run(0xc00020a000)
    /workspace/worker/pool.go:74 +0x145
example.com/app/api.(*Server).startWorkers(0xc00019e000)
    /workspace/api/server.go:51 +0x92`

type Goroutine = { id: number; state: string; duration: string; frames: Array<{ fn: string; location: string }> }

function parseGoroutines(value: string): Goroutine[] {
  return value.split(/\n(?=goroutine \d+ \[)/).map((block) => {
    const lines = block.trim().split('\n')
    const header = lines[0]?.match(/^goroutine (\d+) \[([^\],]+)(?:, ([^\]]+))?\]:/)
    if (!header) return null
    const frames: Goroutine['frames'] = []
    for (let index = 1; index < lines.length; index += 1) {
      const fn = lines[index].trim()
      const location = lines[index + 1]?.trim()
      if (fn && location?.startsWith('/')) { frames.push({ fn, location }); index += 1 }
    }
    return { id: Number(header[1]), state: header[2], duration: header[3] || '', frames }
  }).filter((goroutine): goroutine is Goroutine => Boolean(goroutine))
}

export function GoGoroutinePage() {
  const [input, setInput] = useState(GO_DUMP_SAMPLE)
  const [stateFilter, setStateFilter] = useState('all')
  const goroutines = useMemo(() => parseGoroutines(input), [input])
  const states = useMemo(() => [...new Set(goroutines.map((goroutine) => goroutine.state))], [goroutines])
  const visible = stateFilter === 'all' ? goroutines : goroutines.filter((goroutine) => goroutine.state === stateFilter)
  const groups = useMemo(() => {
    const signatures = new Map<string, Goroutine[]>()
    for (const goroutine of goroutines) {
      const signature = goroutine.frames.slice(0, 3).map((frame) => frame.fn.replace(/\(.*$/, '')).join(' → ') || '(no stack)'
      signatures.set(signature, [...(signatures.get(signature) || []), goroutine])
    }
    return [...signatures.entries()].sort((left, right) => right[1].length - left[1].length)
  }, [goroutines])
  const report = groups.map(([signature, items]) => `${items.length}× ${signature}\nIDs: ${items.map((item) => item.id).join(', ')}`).join('\n\n')
  return <div className="trace-workbench go-dump-workbench">
    <div className="workspace-toolbar"><select aria-label="Goroutine 状态" value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}><option value="all">全部状态</option>{states.map((state) => <option key={state}>{state}</option>)}</select><span /><code className="toolbar-hint">{goroutines.length} goroutines · {groups.length} stack groups</code></div>
    <div className="trace-grid"><EditorPanel label="Goroutine Dump" value={input} onChange={setInput} showLineNumbers /><section className="goroutine-report"><header><span>状态分布</span><div>{states.map((state) => { const count = goroutines.filter((item) => item.state === state).length; return <article key={state}><div><strong>{state}</strong><code>{count}</code></div><i style={{ width: `${goroutines.length ? count / goroutines.length * 100 : 0}%` }} /></article> })}</div></header><div className="goroutine-list">{visible.map((goroutine) => <article key={goroutine.id}><div><strong>#{goroutine.id}</strong><span>{goroutine.state}</span><small>{goroutine.duration}</small></div>{goroutine.frames.slice(0, 4).map((frame, index) => <p key={`${frame.fn}-${index}`}><code>{frame.fn.replace(/\(.*$/, '')}</code><small>{frame.location}</small></p>)}</article>)}</div></section></div>
    <div className="status-line"><CopyButton value={report} />检测到 {groups.filter(([, items]) => items.length > 1).length} 组重复堆栈</div>
  </div>
}
