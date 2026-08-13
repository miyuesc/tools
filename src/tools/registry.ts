import {
  ArrowLeftRight,
  Braces,
  Binary,
  Clock3,
  Code2,
  FileCode2,
  FileDiff,
  FileImage,
  Fingerprint,
  Grid2X2,
  Hash,
  FileJson,
  FileType2,
  Images,
  KeyRound,
  Link2,
  ListTree,
  LockKeyhole,
  Network,
  Palette,
  QrCode,
  Regex,
  ShieldCheck,
  Sigma,
  TextCursorInput,
  Type,
  WandSparkles,
  Workflow,
} from 'lucide-react'
import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { ToolDefinition } from '../types/tool'

type PageModule = Record<string, ComponentType>

function lazyDefault(load: () => Promise<{ default: ComponentType }>) {
  return lazy(load)
}

function createLazyPages<const Names extends readonly string[]>(
  load: () => Promise<unknown>,
  names: Names,
) {
  return Object.fromEntries(names.map((name) => [
    name,
    lazy(() => load().then((module) => ({ default: (module as PageModule)[name] }))),
  ])) as { [Name in Names[number]]: LazyExoticComponent<ComponentType> }
}

const Base64ToolPage = lazyDefault(() => import('./base64'))
const ColorToolPage = lazyDefault(() => import('./color'))
const CronPage = lazyDefault(() => import('./cron'))
const HashToolPage = lazyDefault(() => import('./hash'))
const ImageStudioPage = lazyDefault(() => import('./image-studio'))
const JsonToolPage = lazyDefault(() => import('./json'))
const JwtToolPage = lazyDefault(() => import('./jwt'))
const MermaidEditorPage = lazyDefault(() => import('./mermaid'))
const QrCodePage = lazyDefault(() => import('./qr'))
const RegexToolPage = lazyDefault(() => import('./regex'))
const RegexMemoPage = lazyDefault(() => import('./regex-memo'))
const TextToolPage = lazyDefault(() => import('./text'))
const TimestampToolPage = lazyDefault(() => import('./timestamp'))
const UrlToolPage = lazyDefault(() => import('./url'))
const UuidToolPage = lazyDefault(() => import('./uuid'))
const GitMemoPage = lazyDefault(() => import('./git-memo'))
const SvgPlaceholderPage = lazyDefault(() => import('./svg-placeholder'))
const UrlParserPage = lazyDefault(() => import('./url-parser'))
const YamlWorkbenchPage = lazyDefault(() => import('./yaml-workbench'))

const { FluidTypePage, EasedGradientPage } = createLazyPages(
  () => import('./web-design/type-gradient'),
  ['FluidTypePage', 'EasedGradientPage'] as const,
)
const { ShapeOutsidePage, HudFramePage } = createLazyPages(
  () => import('./web-design/shape-hud'),
  ['ShapeOutsidePage', 'HudFramePage'] as const,
)
const {
  BorderRadiusPage,
  BoxShadowPage,
  ButtonStatePage,
  TextShadowPage,
} = createLazyPages(
  () => import('./web-design/button-shadow-radius'),
  ['BorderRadiusPage', 'BoxShadowPage', 'ButtonStatePage', 'TextShadowPage'] as const,
)
const { SvgPathEditorPage } = createLazyPages(
  () => import('./web-design/svg-path'),
  ['SvgPathEditorPage'] as const,
)

const {
  CodeFormatterPage,
  GoGoroutinePage,
  JavaStackTracePage,
  JsonToGoPage,
  JsonToJavaPage,
  PackageJsonPage,
  SemVerPage,
} = createLazyPages(
  () => import('./first-batch/language-tools'),
  ['CodeFormatterPage', 'GoGoroutinePage', 'JavaStackTracePage', 'JsonToGoPage', 'JsonToJavaPage', 'PackageJsonPage', 'SemVerPage'] as const,
)
const {
  CssLayoutPage,
  CssTransformFilterPage,
  KeyframesBezierPage,
  SvgSpritePage,
  WcagContrastPage,
} = createLazyPages(
  () => import('./first-batch/design-tools'),
  ['CssLayoutPage', 'CssTransformFilterPage', 'KeyframesBezierPage', 'SvgSpritePage', 'WcagContrastPage'] as const,
)

const {
  CssCascadePage,
  DependencyTreePage,
  GoBenchmarkPage,
  GoModGraphPage,
  JavaThreadDumpPage,
  PackageExportsPage,
} = createLazyPages(
  () => import('./text-analysis'),
  ['CssCascadePage', 'DependencyTreePage', 'GoBenchmarkPage', 'GoModGraphPage', 'JavaThreadDumpPage', 'PackageExportsPage'] as const,
)

const {
  Base64FilePage,
  BasicAuthPage,
  ChronometerPage,
  DeviceInfoPage,
  DockerComposePage,
  EmailNormalizerPage,
  EmojiPickerPage,
  HmacPage,
  IbanPage,
  Ipv4AddressPage,
  Ipv4RangePage,
  Ipv4SubnetPage,
  Ipv6UlaPage,
  JsonCsvPage,
  JsonDiffPage,
  JsonTomlPage,
  JsonYamlPage,
  JsonXmlPage,
  CameraRecorderPage,
  SafeLinkPage,
  MacLookupPage,
  BenchmarkPage,
  RsaKeyPage,
  KeycodePage,
  ListConverterPage,
  MacGeneratorPage,
  MathEvaluatorPage,
  MetaTagPage,
  NatoPage,
  NumeronymPage,
  ObfuscatorPage,
  OtpPage,
  PasswordStrengthPage,
  PercentagePage,
  RandomPortPage,
  SlugifyPage,
  TemperaturePage,
  TomlJsonPage,
  TomlYamlPage,
  TokenPage,
  UlidPage,
  UnicodePage,
  UserAgentPage,
  XmlJsonPage,
  YamlJsonPage,
  EtaPage,
  EncryptionPage,
} = createLazyPages(
  () => import('./advanced'),
  [
    'Base64FilePage', 'BasicAuthPage', 'ChronometerPage', 'DeviceInfoPage', 'DockerComposePage',
    'EmailNormalizerPage', 'EmojiPickerPage', 'HmacPage', 'IbanPage', 'Ipv4AddressPage',
    'Ipv4RangePage', 'Ipv4SubnetPage', 'Ipv6UlaPage', 'JsonCsvPage', 'JsonDiffPage',
    'JsonTomlPage', 'JsonYamlPage', 'JsonXmlPage', 'CameraRecorderPage', 'SafeLinkPage',
    'MacLookupPage', 'BenchmarkPage', 'RsaKeyPage', 'KeycodePage', 'ListConverterPage',
    'MacGeneratorPage', 'MathEvaluatorPage', 'MetaTagPage', 'NatoPage', 'NumeronymPage',
    'ObfuscatorPage', 'OtpPage', 'PasswordStrengthPage', 'PercentagePage', 'RandomPortPage',
    'SlugifyPage', 'TemperaturePage', 'TomlJsonPage', 'TomlYamlPage', 'TokenPage', 'UlidPage',
    'UnicodePage', 'UserAgentPage', 'XmlJsonPage', 'YamlJsonPage', 'EtaPage', 'EncryptionPage',
  ] as const,
)

const {
  CaseConverterPage,
  AsciiTablePage,
  BinaryTextPage,
  ChmodPage,
  CurlToCodePage,
  DiffToolPage,
  FaviconGeneratorPage,
  HtmlToolPage,
  HtmlEntitiesPage,
  HttpStatusPage,
  ImageBase64Page,
  ImageConverterPage,
  JsonTypesToolPage,
  MarkdownToolPage,
  MimeTypePage,
  NumberBasePage,
  PasswordGeneratorPage,
  RomanNumeralPage,
  SqlToolPage,
  SvgOptimizerPage,
  TextCleanerPage,
  XmlToolPage,
  LoremPage,
} = createLazyPages(
  () => import('./extended'),
  [
    'CaseConverterPage', 'AsciiTablePage', 'BinaryTextPage', 'ChmodPage', 'CurlToCodePage',
    'DiffToolPage', 'FaviconGeneratorPage', 'HtmlToolPage', 'HtmlEntitiesPage', 'HttpStatusPage',
    'ImageBase64Page', 'ImageConverterPage', 'JsonTypesToolPage', 'MarkdownToolPage',
    'MimeTypePage', 'NumberBasePage', 'PasswordGeneratorPage', 'RomanNumeralPage', 'SqlToolPage',
    'SvgOptimizerPage', 'TextCleanerPage', 'XmlToolPage', 'LoremPage',
  ] as const,
)

const rawTools: Array<Omit<ToolDefinition, 'category'> & { category: string }> = [
  { id: 'go-benchmark-compare', name: 'Go Benchmark 对比', description: '对齐两组 go test -bench 输出并比较耗时、内存与分配变化', category: 'Go', icon: ArrowLeftRight, tags: ['go', 'golang', 'benchmark', 'benchstat', 'ns/op', 'B/op', 'allocs/op', '性能', '对比'], accent: '#5dd6e8', component: GoBenchmarkPage, fullPage: true },
  { id: 'package-exports', name: 'package exports 解析器', description: '本地模拟 exports、imports、条件导出、子路径与 fallback 匹配', category: 'Node.js', icon: FileJson, tags: ['node', 'npm', 'package.json', 'exports', 'imports', 'conditions', 'subpath', 'fallback', '解析'], accent: '#cb3837', component: PackageExportsPage, fullPage: true },
  { id: 'dependency-tree', name: 'Maven / Gradle 依赖树分析', description: '解析依赖层级、版本冲突、省略节点与 scope / configuration 统计', category: 'Java', icon: ListTree, tags: ['java', 'maven', 'gradle', 'dependency tree', 'dependencies', 'conflict', 'scope', 'configuration'], accent: '#ff9f68', component: DependencyTreePage, fullPage: true },
  { id: 'go-mod-graph', name: 'go.mod 依赖图', description: '解析模块声明、依赖、替换、排除、撤回与 indirect 关系', category: 'Go', icon: Network, tags: ['go', 'golang', 'go.mod', 'module', 'require', 'replace', 'exclude', 'retract', 'indirect'], accent: '#59d4e8', component: GoModGraphPage, fullPage: true },
  { id: 'java-thread-dump', name: 'Java Thread Dump 分析', description: '统计线程状态、聚合堆栈、关联锁并启发式检测死锁', category: 'Java', icon: FileDiff, tags: ['java', 'thread dump', 'jstack', 'deadlock', 'lock', 'stack', '线程', '死锁'], accent: '#f59e42', component: JavaThreadDumpPage, fullPage: true },
  { id: 'css-specificity-cascade', name: 'CSS Specificity / Cascade 分析', description: '计算选择器权重并检查 !important、重复声明与潜在覆盖', category: 'CSS 设计', icon: Palette, tags: ['css', 'specificity', 'cascade', 'selector', 'important', 'override', '选择器', '优先级'], accent: '#b8f35d', component: CssCascadePage, fullPage: true },
  { id: 'code-formatter', name: 'JS / TS / JSX / CSS 格式化器', description: '使用本地 Prettier 格式化 JavaScript、TypeScript、JSX、TSX 与 CSS', category: '语言', icon: FileCode2, tags: ['javascript', 'typescript', 'jsx', 'tsx', 'css', 'prettier', '格式化'], accent: '#f7df1e', component: CodeFormatterPage, featured: true },
  { id: 'json-java', name: 'JSON 转 Java', description: '从 JSON 推断并生成 Record、POJO 或 Lombok 数据模型', category: '语言', icon: Braces, tags: ['java', 'json', 'record', 'pojo', 'lombok', 'jackson'], accent: '#f59e42', component: JsonToJavaPage },
  { id: 'json-go', name: 'JSON 转 Go Struct', description: '从 JSON 生成嵌套 Struct、字段标签、指针与 time.Time', category: '语言', icon: Braces, tags: ['go', 'golang', 'json', 'struct', 'tag'], accent: '#59d4e8', component: JsonToGoPage },
  { id: 'package-json', name: 'package.json 构建与检查', description: '编辑包元数据、检查结构冲突并整理字段和依赖顺序', category: '语言', icon: FileJson, tags: ['node', 'npm', 'package.json', 'dependencies', 'scripts'], accent: '#cb3837', component: PackageJsonPage, featured: true },
  { id: 'semver', name: 'SemVer 计算器', description: '验证、排序版本，测试范围并计算 major、minor、patch 升级', category: '语言', icon: Sigma, tags: ['semver', 'node', 'npm', 'version', 'range'], accent: '#c7f36c', component: SemVerPage },
  { id: 'java-stack-trace', name: 'Java Stack Trace 分析', description: '识别异常链、根因和业务调用帧，生成精简报告', category: '语言', icon: FileDiff, tags: ['java', 'stack trace', 'exception', 'root cause', 'debug'], accent: '#ff9f68', component: JavaStackTracePage },
  { id: 'go-goroutine-dump', name: 'Go Goroutine Dump 分析', description: '解析 Goroutine 状态、重复堆栈与阻塞调用位置', category: '语言', icon: ListTree, tags: ['go', 'golang', 'goroutine', 'dump', 'stack'], accent: '#5dd6e8', component: GoGoroutinePage },
  { id: 'css-layout', name: 'CSS Grid / Flexbox 构建器', description: '可视化组合 Grid 与 Flexbox 容器并复制完整 CSS', category: '设计', icon: Grid2X2, tags: ['css', 'grid', 'flexbox', 'layout', '布局'], accent: '#b8f35d', component: CssLayoutPage, fullPage: true, workspaceClassName: 'web-workspace' },
  { id: 'css-transform-filter', name: 'CSS Transform / Filter 编辑器', description: '组合 2D/3D 变换、滤镜与 backdrop-filter 并实时预览', category: '设计', icon: WandSparkles, tags: ['css', 'transform', 'filter', '3d', 'backdrop'], accent: '#7df9ff', component: CssTransformFilterPage, fullPage: true, workspaceClassName: 'web-workspace' },
  { id: 'keyframes-bezier', name: 'Keyframes 与 Bézier 编辑器', description: '编辑关键帧、动画时长和三次贝塞尔缓动曲线', category: '设计', icon: Workflow, tags: ['css', 'animation', 'keyframes', 'cubic-bezier', 'motion'], accent: '#c4a7ff', component: KeyframesBezierPage, fullPage: true, workspaceClassName: 'web-workspace' },
  { id: 'wcag-contrast', name: 'WCAG 颜色对比检查', description: '计算对比度并检查 WCAG 2.2 的 AA、AAA 与非文本要求', category: '设计', icon: ShieldCheck, tags: ['wcag', 'accessibility', 'contrast', 'color', 'a11y'], accent: '#f2d45c', component: WcagContrastPage, fullPage: true, workspaceClassName: 'web-workspace' },
  { id: 'svg-sprite', name: 'SVG Sprite 生成器', description: '导入多个本地 SVG，生成 symbol Sprite、引用代码并下载', category: '设计', icon: Images, tags: ['svg', 'sprite', 'symbol', 'icon', 'use'], accent: '#ff6fae', component: SvgSpritePage, fullPage: true, workspaceClassName: 'web-workspace' },
  { id: 'image-studio', name: '图片裁剪与拼接', description: '编辑、拼接图片，复制或导出透明 PNG', category: '图片', icon: Images, tags: ['图片', '裁剪', '拼接', 'png', 'canvas'], accent: '#b8f35d', component: ImageStudioPage, featured: true, fullPage: true, workspaceClassName: 'image-workspace' },
  { id: 'fluid-type', name: '流体排版', description: '生成完整模块化字阶与视口/容器 clamp() 变量', category: 'Web', icon: Type, tags: ['css', 'fluid type', 'clamp', 'responsive', '排版'], accent: '#b8f35d', component: FluidTypePage, featured: true, fullPage: true, workspaceClassName: 'web-workspace' },
  { id: 'eased-gradient', name: '缓动渐变', description: '用可控缓动和色阶生成顺滑 CSS 渐变', category: 'Web', icon: Palette, tags: ['css', 'gradient', 'easing', 'color'], accent: '#ff6fae', component: EasedGradientPage, fullPage: true, workspaceClassName: 'web-workspace' },
  { id: 'shape-outside', name: 'CSS Shape 编辑器', description: '生成并预览 shape-outside、clip-path、offset-path 与 border-shape', category: 'Web', icon: Workflow, tags: ['css', 'shape', 'shape-outside', 'clip-path', 'offset-path', 'polygon'], accent: '#f2d45c', component: ShapeOutsidePage, fullPage: true, workspaceClassName: 'web-workspace' },
  { id: 'hud-frame', name: 'HUD SVG 边框', description: '生成带切角、数据节点和辉光的科幻 SVG 框', category: 'Web', icon: Images, tags: ['svg', 'hud', 'frame', 'sci-fi', 'generator'], accent: '#7df9ff', component: HudFramePage, fullPage: true, workspaceClassName: 'web-workspace' },
  { id: 'button-state', name: '按钮状态构建器', description: '设计五种业务状态、模拟流程并导出 HTML/CSS/JS', category: 'Web', icon: WandSparkles, tags: ['css', 'button', 'loading', 'success', 'error', 'disabled'], accent: '#b8f35d', component: ButtonStatePage, fullPage: true, workspaceClassName: 'web-workspace' },
  { id: 'box-shadow', name: '盒阴影生成器', description: '叠加多层 box-shadow 并实时预览', category: 'Web', icon: Code2, tags: ['css', 'box-shadow', 'shadow'], accent: '#9fb9ff', component: BoxShadowPage, fullPage: true, workspaceClassName: 'web-workspace' },
  { id: 'text-shadow', name: '文字阴影生成器', description: '组合多层文字阴影与霓虹效果', category: 'Web', icon: Type, tags: ['css', 'text-shadow', 'type', 'neon'], accent: '#7df9ff', component: TextShadowPage, fullPage: true, workspaceClassName: 'web-workspace' },
  { id: 'border-radius', name: '圆角生成器', description: '编辑八轴椭圆圆角并复制 border-radius', category: 'Web', icon: Sigma, tags: ['css', 'border-radius', 'corner', 'blob'], accent: '#c7f36c', component: BorderRadiusPage, fullPage: true, workspaceClassName: 'web-workspace' },
  { id: 'svg-path-editor', name: 'SVG Path 编辑器', description: '逐命令编辑、变换和优化路径并导出完整 SVG', category: 'Web', icon: Workflow, tags: ['svg', 'path', 'vector', 'editor'], accent: '#c4a7ff', component: SvgPathEditorPage, fullPage: true, workspaceClassName: 'web-workspace' },
  { id: 'json', name: 'JSON 工作台', description: '格式化、排序、压缩和检查 JSON', category: '开发', icon: Braces, tags: ['json', '格式化', 'validate'], accent: '#b8f35d', component: JsonToolPage, featured: true, sourceId: 'json-viewer' },
  { id: 'base64', name: 'Base64 编解码', description: '编码或解码 UTF-8 文本', category: '编码', icon: ArrowLeftRight, tags: ['base64', '编码', '解码'], accent: '#8ad8ff', component: Base64ToolPage, featured: true, sourceId: 'base64-string-converter' },
  { id: 'url', name: 'URL 编解码', description: '编码或解码文本、URL 及其中的参数值', category: '编码', icon: Link2, tags: ['url', 'encode', 'decode'], accent: '#c4a7ff', component: UrlToolPage, sourceId: 'url-encoder' },
  { id: 'jwt', name: 'JWT 解码器', description: '解码 Claim、检查时间状态并在本地完成 HMAC 签名与验签', category: '开发', icon: KeyRound, tags: ['jwt', 'token', 'hmac', 'claim', 'debug'], accent: '#ffb86b', component: JwtToolPage, sourceId: 'jwt-parser' },
  { id: 'uuid', name: 'UUID 生成器', description: '一次生成多个 UUID v4', category: '生成', icon: Fingerprint, tags: ['uuid', 'guid', '生成'], accent: '#ff8fa3', component: UuidToolPage, sourceId: 'uuid-generator' },
  { id: 'hash', name: '哈希生成器', description: '计算文本或本地文件的 SHA 摘要', category: '生成', icon: Hash, tags: ['hash', 'sha', '摘要'], accent: '#7ee2c8', component: HashToolPage, sourceId: 'hash-text' },
  { id: 'timestamp', name: '时间戳转换', description: 'Unix 时间戳和本地时间互转', category: '开发', icon: Clock3, tags: ['时间戳', 'unix', 'date'], accent: '#ffd166', component: TimestampToolPage, sourceId: 'date-time-converter' },
  { id: 'text', name: '文本统计', description: '查看字符、词语、行数和阅读时间', category: '文本', icon: TextCursorInput, tags: ['文本', '统计', '字数'], accent: '#8fb8ff', component: TextToolPage, sourceId: 'text-statistics' },
  { id: 'color', name: '颜色转换', description: '在 HEX、RGB 和 HSL 之间转换', category: '开发', icon: Palette, tags: ['颜色', 'hex', 'rgb'], accent: '#fa9fd9', component: ColorToolPage, sourceId: 'color-converter' },
  { id: 'regex', name: '正则测试器', description: '测试表达式并查看匹配位置', category: '开发', icon: Regex, tags: ['regex', '正则', '匹配'], accent: '#a6e3a1', component: RegexToolPage, sourceId: 'regex-tester' },
  { id: 'html', name: 'HTML 格式化', description: '整理 HTML 缩进并快速复制结果', category: '开发', icon: FileCode2, tags: ['html', '格式化', 'pretty'], accent: '#ff9f68', component: HtmlToolPage },
  { id: 'xml', name: 'XML 格式化', description: '整理 XML 结构，便于阅读和排查', category: '开发', icon: FileType2, tags: ['xml', '格式化', 'pretty'], accent: '#9be564', component: XmlToolPage, sourceId: 'xml-formatter' },
  { id: 'sql', name: 'SQL 格式化', description: '按数据库方言整理 SQL 与关键字', category: '开发', icon: Code2, tags: ['sql', '格式化', 'query'], accent: '#75c9ff', component: SqlToolPage, sourceId: 'sql-prettify' },
  { id: 'json-types', name: 'JSON 转 TypeScript', description: '从 JSON 自动生成 TypeScript interfaces', category: '转换', icon: FileJson, tags: ['json', 'typescript', 'types'], accent: '#5dd6c0', component: JsonTypesToolPage },
  { id: 'diff', name: '文本差异比较', description: '逐行比较两段文本，突出新增和删除', category: '文本', icon: FileDiff, tags: ['diff', 'compare', '比较'], accent: '#ffad66', component: DiffToolPage, sourceId: 'text-diff' },
  { id: 'case', name: '文本大小写转换', description: '转换大写、小写、camelCase、snake_case 等', category: '文本', icon: Type, tags: ['case', 'camel', 'snake', '大小写'], accent: '#c7a1ff', component: CaseConverterPage, sourceId: 'case-converter' },
  { id: 'text-cleaner', name: '文本清理器', description: '移除空行、首尾空格，去重并排序', category: '文本', icon: ListTree, tags: ['clean', 'trim', 'deduplicate'], accent: '#8fe1a3', component: TextCleanerPage },
  { id: 'markdown', name: 'Markdown 转 HTML', description: '将 Markdown 转成可复制的 HTML 片段', category: '转换', icon: FileCode2, tags: ['markdown', 'html', 'preview'], accent: '#9cb5ff', component: MarkdownToolPage, sourceId: 'markdown-to-html' },
  { id: 'password', name: '安全密码生成器', description: '使用浏览器加密随机源生成高强度密码', category: '生成', icon: LockKeyhole, tags: ['password', '密码', 'random'], accent: '#f5cf5d', component: PasswordGeneratorPage, featured: true },
  { id: 'number-base', name: '进制转换', description: '在二进制、八进制、十进制和十六进制间转换', category: '编码', icon: Binary, tags: ['base', 'binary', 'hex', '进制'], accent: '#75e0e6', component: NumberBasePage, sourceId: 'integer-base-converter' },
  { id: 'roman', name: '罗马数字转换', description: '转换 1–3999 的阿拉伯数字与罗马数字', category: '转换', icon: Sigma, tags: ['roman', 'number', '数字'], accent: '#e2a6ff', component: RomanNumeralPage, sourceId: 'roman-numeral-converter' },
  { id: 'chmod', name: 'chmod 权限计算器', description: '通过权限选择生成八进制值和 chmod 命令', category: '开发', icon: ShieldCheck, tags: ['chmod', 'linux', 'permission'], accent: '#a7d36d', component: ChmodPage, sourceId: 'chmod-calculator' },
  { id: 'url-parser', name: 'URL 解析器', description: '拆解 URL、查询参数和 Hash 参数并显示中文转码', category: '开发', icon: Link2, tags: ['url', 'parse', 'query', 'hash'], accent: '#c4a7ff', component: UrlParserPage, sourceId: 'url-parser' },
  { id: 'http-status', name: 'HTTP 状态码参考', description: '快速查询常见 HTTP 状态码含义', category: '参考', icon: Network, tags: ['http', 'status', 'reference'], accent: '#ff9e8a', component: HttpStatusPage, sourceId: 'http-status-codes' },
  { id: 'mime', name: 'MIME 类型参考', description: '查询常见文件扩展名对应的 MIME 类型', category: '参考', icon: FileType2, tags: ['mime', 'content-type', 'reference'], accent: '#87c9ff', component: MimeTypePage, sourceId: 'mime-types' },
  { id: 'image-base64', name: '图片转 Base64', description: '将图片转换为 Data URI 或 Base64 文本', category: '图片', icon: FileImage, tags: ['image', 'base64', 'data-uri'], accent: '#ff8fb8', component: ImageBase64Page, sourceId: 'base64-file-converter' },
  { id: 'image-converter', name: '图片格式转换', description: '批量调整尺寸、质量并在本地转换 PNG、JPEG 和 WebP', category: '图片', icon: Images, tags: ['image', 'resize', 'batch', 'metadata', 'png', 'jpeg', 'webp'], accent: '#ffb56b', component: ImageConverterPage, fullPage: true },
  { id: 'favicon', name: 'Favicon 生成器', description: '从图片生成网站图标和 link 标签', category: '图片', icon: WandSparkles, tags: ['favicon', 'icon', 'png'], accent: '#d2f06b', component: FaviconGeneratorPage },
  { id: 'qr-code', name: '二维码创建', description: '配置颜色、中心图片、遮罩和边框并导出二维码', category: '图片', icon: QrCode, tags: ['qr', 'qrcode', '二维码'], accent: '#78dfc2', component: QrCodePage },
  { id: 'svg-optimizer', name: 'SVG 优化器', description: '保守整理属性、空白与颜色，并比较优化差异和体积', category: '图片', icon: Images, tags: ['svg', 'optimize', 'minify', 'diff', 'color'], accent: '#e4a7ff', component: SvgOptimizerPage },
  { id: 'cron', name: 'Cron 表达式', description: '严格验证并用中文解析五字段 Cron 表达式', category: '开发', icon: Clock3, tags: ['cron', 'schedule', '定时'], accent: '#f0c96d', component: CronPage, sourceId: 'crontab-generator' },
  { id: 'curl-to-code', name: 'cURL 转 fetch', description: '将常见 cURL 请求转换为 JavaScript fetch', category: '转换', icon: Code2, tags: ['curl', 'fetch', 'http'], accent: '#7ec8ff', component: CurlToCodePage },
  { id: 'lorem', name: 'Lorem Ipsum 生成器', description: '按段落、句子或单词生成占位文本', category: '生成', icon: WandSparkles, tags: ['lorem', 'placeholder', '占位'], accent: '#d6a6ff', component: LoremPage, sourceId: 'lorem-ipsum-generator' },
  { id: 'mermaid', name: 'Mermaid 图表编辑器', description: '在线编辑、预览并下载 Mermaid 图表', category: '开发', icon: Workflow, tags: ['mermaid', 'diagram', 'flowchart'], accent: '#83d4ff', component: MermaidEditorPage },
  { id: 'ascii', name: 'ASCII 表', description: '查询可打印字符、十进制和十六进制编码', category: '参考', icon: FileType2, tags: ['ascii', '字符', 'reference'], accent: '#9ae58b', component: AsciiTablePage },
  { id: 'html-entities', name: 'HTML 实体编解码', description: '编码或解码 HTML 特殊字符和实体', category: '编码', icon: FileCode2, tags: ['html', 'entities', 'encode'], accent: '#ffa878', component: HtmlEntitiesPage, sourceId: 'html-entities' },
  { id: 'binary-text', name: '文本与二进制转换', description: '在 UTF-8 文本和二进制字节之间转换', category: '编码', icon: Binary, tags: ['binary', 'text', 'utf8'], accent: '#7cdddf', component: BinaryTextPage, sourceId: 'text-to-binary' },
  { id: 'base64-file', name: '文件转 Base64', description: '将任意文件转换为 Data URI 或 Base64', category: '编码', icon: FileImage, tags: ['base64', 'file', 'data-uri'], accent: '#8ad8ff', component: Base64FilePage, sourceId: 'base64-file-converter' },
  { id: 'basic-auth', name: 'Basic Auth 生成器', description: '根据用户名和密码生成 Authorization Header', category: '安全', icon: LockKeyhole, tags: ['basic auth', 'authorization', 'header'], accent: '#ffb86b', component: BasicAuthPage, sourceId: 'basic-auth-generator' },
  { id: 'chronometer', name: '计时器', description: '启动、暂停和重置一个精确到毫秒的计时器', category: '生成', icon: Clock3, tags: ['chronometer', 'timer', '计时'], accent: '#ffd166', component: ChronometerPage, sourceId: 'chronometer' },
  { id: 'device-info', name: '设备信息', description: '查看浏览器、屏幕、时区和 User Agent 信息', category: '参考', icon: Network, tags: ['device', 'browser', 'navigator'], accent: '#9ed0ff', component: DeviceInfoPage, sourceId: 'device-information' },
  { id: 'email-normalizer', name: '邮箱标准化', description: '清理 mailto 前缀、空格并统一小写', category: '文本', icon: Link2, tags: ['email', 'normalize', '邮箱'], accent: '#a7e1a4', component: EmailNormalizerPage, sourceId: 'email-normalizer' },
  { id: 'emoji-picker', name: 'Emoji 选择器', description: '选择常用 Emoji 并复制到剪贴板', category: '生成', icon: WandSparkles, tags: ['emoji', 'picker', '符号'], accent: '#ff9fd3', component: EmojiPickerPage, sourceId: 'emoji-picker' },
  { id: 'hmac', name: 'HMAC 生成器', description: '使用 Web Crypto 计算 HMAC-SHA256', category: '安全', icon: Hash, tags: ['hmac', 'sha256', '签名'], accent: '#7ee2c8', component: HmacPage, sourceId: 'hmac-generator' },
  { id: 'iban', name: 'IBAN 校验器', description: '标准化并校验国际银行账号的 MOD-97 校验码', category: '参考', icon: ShieldCheck, tags: ['iban', 'bank', 'validate'], accent: '#9fe0a8', component: IbanPage, sourceId: 'iban-validator-and-parser' },
  { id: 'ipv4-address', name: 'IPv4 地址转换', description: '在 IPv4、整数、十六进制和二进制之间转换', category: '网络', icon: Network, tags: ['ipv4', 'ip', 'network'], accent: '#80d9ef', component: Ipv4AddressPage, sourceId: 'ipv4-address-converter' },
  { id: 'ipv4-range', name: 'IPv4 范围展开', description: '展开起始地址到结束地址之间的 IPv4 列表', category: '网络', icon: Network, tags: ['ipv4', 'range', 'network'], accent: '#7ac7ff', component: Ipv4RangePage, sourceId: 'ipv4-range-expander' },
  { id: 'ipv4-subnet', name: 'IPv4 CIDR 工作台', description: '计算、合并、拆分 CIDR，并从地址或网段中执行排除', category: '网络', icon: Network, tags: ['ipv4', 'subnet', 'cidr', 'merge', 'split', 'exclude'], accent: '#75e0e6', component: Ipv4SubnetPage, sourceId: 'ipv4-subnet-calculator', fullPage: true },
  { id: 'ipv6-ula', name: 'IPv6 ULA 生成器', description: '生成本地唯一 IPv6 ULA 前缀', category: '网络', icon: Network, tags: ['ipv6', 'ula', 'network'], accent: '#b7a6ff', component: Ipv6UlaPage, sourceId: 'ipv6-ula-generator' },
  { id: 'json-csv', name: 'JSON 转 CSV', description: '将对象数组转换为带引号处理的 CSV', category: '转换', icon: FileJson, tags: ['json', 'csv', 'convert'], accent: '#8bdc9d', component: JsonCsvPage, sourceId: 'json-to-csv' },
  { id: 'json-xml', name: 'JSON 转 XML', description: '将 JSON 对象转换为可读 XML', category: '转换', icon: FileCode2, tags: ['json', 'xml', 'convert'], accent: '#ffb56b', component: JsonXmlPage, sourceId: 'json-to-xml' },
  { id: 'keycode', name: 'Keycode 信息', description: '按下键盘按键查看 key、code 和 keyCode', category: '参考', icon: Code2, tags: ['keycode', 'keyboard', '键盘'], accent: '#c9a5ff', component: KeycodePage, sourceId: 'keycode-info' },
  { id: 'list-converter', name: '列表转换器', description: '在换行、逗号和 JSON 数组之间转换列表', category: '文本', icon: ListTree, tags: ['list', 'array', '列表'], accent: '#9ce0a7', component: ListConverterPage, sourceId: 'list-converter' },
  { id: 'mac-generator', name: 'MAC 地址生成器', description: '生成本地管理的单播 MAC 地址', category: '网络', icon: Fingerprint, tags: ['mac', 'address', 'network'], accent: '#e2b3ff', component: MacGeneratorPage, sourceId: 'mac-address-generator' },
  { id: 'meta-tags', name: 'Meta 标签生成器', description: '生成 title、description、OG 和主题色标签', category: '开发', icon: FileCode2, tags: ['meta', 'seo', 'html'], accent: '#ffa56f', component: MetaTagPage, sourceId: 'meta-tag-generator' },
  { id: 'numeronym', name: 'Numeronym 生成器', description: '把长单词转换为 i18n、l10n 形式的缩写', category: '文本', icon: Type, tags: ['numeronym', 'abbreviation', '缩写'], accent: '#c7a1ff', component: NumeronymPage, sourceId: 'numeronym-generator' },
  { id: 'otp', name: 'OTP 验证码生成器', description: '使用 TOTP HMAC-SHA1 生成 6 位动态验证码', category: '安全', icon: LockKeyhole, tags: ['otp', 'totp', '2fa'], accent: '#f5cf5d', component: OtpPage, sourceId: 'otp-code-generator-and-validator' },
  { id: 'password-strength', name: '密码强度分析', description: '分析密码长度、字符组合和基础强度', category: '安全', icon: ShieldCheck, tags: ['password', 'strength', '安全'], accent: '#ff9f87', component: PasswordStrengthPage, sourceId: 'password-strength-analyser' },
  { id: 'percentage', name: '百分比计算器', description: '计算比例和百分比对应数值', category: '生成', icon: Sigma, tags: ['percentage', 'percent', '数学'], accent: '#b7df6c', component: PercentagePage, sourceId: 'percentage-calculator' },
  { id: 'random-port', name: '随机端口生成器', description: '生成 1024–65535 范围内的随机端口', category: '网络', icon: Binary, tags: ['port', 'random', 'network'], accent: '#7ec8ff', component: RandomPortPage, sourceId: 'random-port-generator' },
  { id: 'slugify', name: 'Slug 生成器', description: '把标题转换为适合 URL 的短横线文本', category: '文本', icon: Type, tags: ['slug', 'url', 'seo'], accent: '#d5a6ff', component: SlugifyPage, sourceId: 'slugify-string' },
  { id: 'obfuscator', name: '字符串混淆器', description: '将字符串转换为 Hex 或 Unicode 转义序列', category: '编码', icon: LockKeyhole, tags: ['obfuscate', 'hex', 'unicode'], accent: '#ffaf76', component: ObfuscatorPage, sourceId: 'string-obfuscator' },
  { id: 'svg-placeholder', name: 'SVG 占位图生成器', description: '生成自定义尺寸和文字的 SVG 占位图', category: '图片', icon: Images, tags: ['svg', 'placeholder', 'image'], accent: '#d0f06c', component: SvgPlaceholderPage, sourceId: 'svg-placeholder-generator' },
  { id: 'temperature', name: '温度转换器', description: '转换摄氏、华氏和开尔文温度', category: '转换', icon: Sigma, tags: ['temperature', 'celsius', 'fahrenheit'], accent: '#ff977c', component: TemperaturePage, sourceId: 'temperature-converter' },
  { id: 'nato', name: 'NATO 字母表', description: '把文本转换为 NATO phonetic alphabet', category: '文本', icon: TextCursorInput, tags: ['nato', 'alphabet', 'phonetic'], accent: '#8ed9b5', component: NatoPage, sourceId: 'text-to-nato-alphabet' },
  { id: 'unicode', name: 'Unicode 编码查看器', description: '查看每个字符对应的 Unicode code point', category: '编码', icon: Code2, tags: ['unicode', 'codepoint', '字符'], accent: '#a7c7ff', component: UnicodePage, sourceId: 'text-to-unicode' },
  { id: 'token', name: 'Token 生成器', description: '使用浏览器加密随机源生成 URL-safe token', category: '生成', icon: KeyRound, tags: ['token', 'random', 'secure'], accent: '#edc965', component: TokenPage, sourceId: 'token-generator' },
  { id: 'ulid', name: 'ULID 生成器', description: '生成带时间排序能力的 ULID', category: '生成', icon: Fingerprint, tags: ['ulid', 'id', '生成'], accent: '#ff9bb8', component: UlidPage, sourceId: 'ulid-generator' },
  { id: 'user-agent', name: 'User Agent 解析器', description: '识别常见浏览器和操作系统信息', category: '网络', icon: Network, tags: ['user agent', 'browser', 'parser'], accent: '#89d2e8', component: UserAgentPage, sourceId: 'user-agent-parser' },
  { id: 'xml-json', name: 'XML 转 JSON', description: '使用浏览器 DOMParser 将 XML 转为 JSON', category: '转换', icon: FileType2, tags: ['xml', 'json', 'convert'], accent: '#9de28f', component: XmlJsonPage, sourceId: 'xml-to-json' },
  { id: 'docker-compose', name: 'docker run 转 Compose', description: '离线转换 Compose YAML，并检查服务关系、结构和环境变量', category: '转换', icon: Code2, tags: ['docker', 'compose', 'yaml', 'validate', 'environment'], accent: '#77c7ff', component: DockerComposePage, sourceId: 'docker-run-to-docker-compose-converter' },
  { id: 'json-yaml', name: 'JSON 转 YAML', description: '将 JSON 对象转换为可读 YAML', category: '转换', icon: FileCode2, tags: ['json', 'yaml', 'convert'], accent: '#a5d66f', component: JsonYamlPage, sourceId: 'json-to-yaml-converter' },
  { id: 'yaml-json', name: 'YAML 转 JSON', description: '完整解析 YAML 数组、嵌套结构和标量类型', category: '转换', icon: FileJson, tags: ['yaml', 'json', 'convert'], accent: '#7ed0ff', component: YamlJsonPage, sourceId: 'yaml-to-json-converter' },
  { id: 'yaml-viewer', name: 'YAML 工作台', description: '美化、排序 YAML 并切换 JSON 格式查看', category: '开发', icon: FileType2, tags: ['yaml', 'format', 'sort', 'json'], accent: '#9be1a1', component: YamlWorkbenchPage, sourceId: 'yaml-viewer' },
  { id: 'json-toml', name: 'JSON 转 TOML', description: '将嵌套 JSON 序列化为 TOML 1.1', category: '转换', icon: FileCode2, tags: ['json', 'toml', 'convert'], accent: '#f0b66e', component: JsonTomlPage, sourceId: 'json-to-toml' },
  { id: 'toml-json', name: 'TOML 转 JSON', description: '完整解析 TOML 表、数组表与日期', category: '转换', icon: FileJson, tags: ['toml', 'json', 'convert'], accent: '#9fc9ff', component: TomlJsonPage, sourceId: 'toml-to-json' },
  { id: 'toml-yaml', name: 'TOML 转 YAML', description: '将 TOML 1.1 配置转换为 YAML', category: '转换', icon: FileType2, tags: ['toml', 'yaml', 'convert'], accent: '#d7a5ff', component: TomlYamlPage, sourceId: 'toml-to-yaml' },
  { id: 'math-evaluator', name: '数学表达式计算', description: '安全计算数字、括号和四则运算表达式', category: '生成', icon: Sigma, tags: ['math', 'calculator', 'expression'], accent: '#8fe0b0', component: MathEvaluatorPage, sourceId: 'math-evaluator' },
  { id: 'eta-calculator', name: 'ETA 估算器', description: '根据进度和耗时估算剩余时间', category: '生成', icon: Clock3, tags: ['eta', 'estimate', 'progress'], accent: '#f4c967', component: EtaPage, sourceId: 'eta-calculator' },
  { id: 'encryption', name: 'AES 加密工具', description: '通过 PBKDF2 与 AES-GCM 加密或解密文本', category: '安全', icon: LockKeyhole, tags: ['aes', 'encryption', 'crypto'], accent: '#c1a7ff', component: EncryptionPage, sourceId: 'encryption' },
  { id: 'json-diff', name: 'JSON 差异比较', description: '并排比较两份 JSON 的结构内容', category: '开发', icon: FileDiff, tags: ['json', 'diff', 'compare'], accent: '#ffad66', component: JsonDiffPage, sourceId: 'json-diff' },
  { id: 'camera-recorder', name: '摄像头录制', description: '使用浏览器 MediaRecorder 录制摄像头和麦克风', category: '图片', icon: Images, tags: ['camera', 'recorder', 'media'], accent: '#ff9bb8', component: CameraRecorderPage, sourceId: 'camera-recorder' },
  { id: 'safe-link', name: '安全链接解码', description: '提取 Microsoft、Google 等包装链接的原始地址', category: '网络', icon: Link2, tags: ['safelink', 'url', 'decode'], accent: '#a5d88a', component: SafeLinkPage, sourceId: 'safelink-decoder' },
  { id: 'mac-lookup', name: 'MAC 厂商查询', description: '使用内置 OUI 样本表识别常见 MAC 厂商', category: '网络', icon: Network, tags: ['mac', 'oui', 'lookup'], accent: '#a5c9ff', component: MacLookupPage, sourceId: 'mac-address-lookup' },
  { id: 'regex-memo', name: '正则备忘录', description: '分类检索和复制 200 条常用正则表达式', category: '开发', icon: Regex, tags: ['regex', 'memo', 'snippet'], accent: '#b6e17c', component: RegexMemoPage, sourceId: 'regex-memo' },
  { id: 'git-memo', name: 'Git 命令备忘', description: '按工作流分类查询 Git 命令和中文说明', category: '开发', icon: Code2, tags: ['git', 'memo', 'command'], accent: '#ffb36d', component: GitMemoPage, sourceId: 'git-memo' },
  { id: 'benchmark', name: 'JSON 基准测试', description: '在浏览器中对 JSON 序列化循环进行简单基准测试', category: '开发', icon: Clock3, tags: ['benchmark', 'performance', 'json'], accent: '#85d9e8', component: BenchmarkPage, sourceId: 'benchmark-builder' },
  { id: 'rsa-key-pair', name: 'RSA 密钥对生成器', description: '使用 Web Crypto 生成可复制的 RSA-OAEP PEM 密钥', category: '安全', icon: KeyRound, tags: ['rsa', 'key', 'crypto'], accent: '#d0adff', component: RsaKeyPage, sourceId: 'rsa-key-pair-generator' },
  { id: 'json-minify', name: 'JSON 压缩器', description: '移除 JSON 空白并复制压缩结果', category: '开发', icon: Braces, tags: ['json', 'minify', '压缩'], accent: '#b8f35d', component: JsonToolPage, sourceId: 'json-minify' },
]

const categoryAssignments = {
  JavaScript: ['code-formatter', 'json-types', 'curl-to-code', 'benchmark'],
  'Node.js': ['package-json', 'package-exports', 'semver'],
  Java: ['json-java', 'java-stack-trace', 'java-thread-dump', 'dependency-tree'],
  Go: ['json-go', 'go-goroutine-dump', 'go-benchmark-compare', 'go-mod-graph'],
  'CSS 设计': ['fluid-type', 'eased-gradient', 'shape-outside', 'button-state', 'box-shadow', 'text-shadow', 'border-radius', 'css-layout', 'css-transform-filter', 'keyframes-bezier', 'wcag-contrast', 'css-specificity-cascade', 'color'],
  'SVG 图形': ['hud-frame', 'svg-path-editor', 'svg-optimizer', 'svg-placeholder', 'svg-sprite', 'mermaid'],
  图片媒体: ['image-studio', 'image-base64', 'image-converter', 'favicon', 'qr-code', 'camera-recorder'],
  数据格式: ['json', 'json-minify', 'json-diff', 'html', 'xml', 'sql', 'json-csv', 'json-xml', 'xml-json', 'json-yaml', 'yaml-json', 'yaml-viewer', 'json-toml', 'toml-json', 'toml-yaml'],
  编码转换: ['base64', 'url', 'number-base', 'html-entities', 'binary-text', 'base64-file', 'obfuscator', 'unicode'],
  文本处理: ['text', 'diff', 'case', 'text-cleaner', 'markdown', 'lorem', 'email-normalizer', 'emoji-picker', 'list-converter', 'numeronym', 'slugify', 'nato'],
  安全加密: ['jwt', 'hash', 'password', 'basic-auth', 'hmac', 'otp', 'password-strength', 'encryption', 'rsa-key-pair', 'token'],
  网络工具: ['url-parser', 'ipv4-address', 'ipv4-range', 'ipv4-subnet', 'ipv6-ula', 'mac-generator', 'random-port', 'user-agent', 'safe-link', 'mac-lookup'],
  系统运维: ['chmod', 'cron', 'docker-compose', 'git-memo'],
  生成计算: ['uuid', 'timestamp', 'roman', 'chronometer', 'percentage', 'temperature', 'ulid', 'math-evaluator', 'eta-calculator'],
  开发参考: ['regex', 'http-status', 'mime', 'ascii', 'device-info', 'iban', 'keycode', 'meta-tags', 'regex-memo'],
} as const satisfies Record<import('../types/tool').Category, readonly import('../types/tool').ToolId[]>

const categoryById = new Map(Object.entries(categoryAssignments).flatMap(([category, ids]) => ids.map((id) => [id, category])))

export const tools: ToolDefinition[] = rawTools.map((tool) => {
  const category = categoryById.get(tool.id)
  if (!category) throw new Error(`Tool ${tool.id} is missing a category assignment`)
  return { ...tool, category: category as ToolDefinition['category'] }
})

export const getTool = (id: string | null) => tools.find((tool) => tool.id === id)
