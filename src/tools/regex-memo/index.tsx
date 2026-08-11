import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CopyButton, EditorPanel } from '../shared/EditorPanel'

type RegexSnippet = { category: string; name: string; pattern: string; description: string }
const r = String.raw
const rows = (category: string, items: [string, string, string][]) => items.map(([name, pattern, description]) => ({ category, name, pattern, description }))

const coreSnippets: RegexSnippet[] = [
  ...rows('日期时间', [
    ['24 小时时间', r`(?:[01]\d|2[0-3]):[0-5]\d`, 'HH:mm'], ['带秒时间', r`(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d`, 'HH:mm:ss'], ['12 小时时间', r`(?:0?[1-9]|1[0-2]):[0-5]\d\s?(?:AM|PM)`, '英文 AM/PM'], ['ISO 日期', r`\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])`, 'YYYY-MM-DD'], ['斜杠日期', r`\d{4}/(?:0?[1-9]|1[0-2])/(?:0?[1-9]|[12]\d|3[01])`, 'YYYY/MM/DD'], ['中文日期', r`\d{4}年(?:0?[1-9]|1[0-2])月(?:0?[1-9]|[12]\d|3[01])日`, '中文年月日'], ['ISO 日期时间', r`\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?`, 'ISO 8601 常用形式'], ['年月', r`\d{4}-(?:0[1-9]|1[0-2])`, 'YYYY-MM'], ['季度', r`\d{4}-?Q[1-4]`, '例如 2026-Q3'], ['Unix 秒时间戳', r`\b1\d{9}\b`, '10 位时间戳'],
  ]),
  ...rows('网络地址', [
    ['HTTP URL', r`https?://[^\s<>"']+`, 'HTTP 或 HTTPS 地址'], ['域名', r`(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}`, '常见国际域名'], ['IPv4', r`(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)`, '严格 IPv4'], ['IPv4 CIDR', r`(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)/(?:[0-9]|[12]\d|3[0-2])`, 'IPv4 与前缀长度'], ['IPv6 简写', r`(?:[\da-fA-F]{1,4}:){2,7}[\da-fA-F]{0,4}`, '常见 IPv6 形式'], ['端口', r`(?:6553[0-5]|655[0-2]\d|65[0-4]\d{2}|6[0-4]\d{3}|[1-5]?\d{1,4})`, '0–65535'], ['MAC 地址', r`(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}`, '冒号或连字符'], ['URL 查询参数', r`[?&]([^=&]+)=([^&#]*)`, '捕获键和值'], ['localhost URL', r`https?://(?:localhost|127\.0\.0\.1)(?::\d+)?(?:/[^\s]*)?`, '本地开发地址'], ['WebSocket URL', r`wss?://[^\s]+`, 'ws 或 wss'],
  ]),
  ...rows('联系方式', [
    ['邮箱', r`[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}`, '常用邮箱地址'], ['中国手机号', r`1[3-9]\d{9}`, '11 位大陆手机号'], ['中国座机', r`(?:0\d{2,3}-?)?\d{7,8}`, '带可选区号'], ['国际电话', r`\+?[1-9]\d{6,14}`, 'E.164 常用形式'], ['分机号', r`(?:ext\.?|转)\s?\d{1,6}`, '英文 ext 或中文转'], ['QQ 号', r`[1-9]\d{4,11}`, '5–12 位 QQ'], ['微信号', r`[A-Za-z][-_A-Za-z0-9]{5,19}`, '字母开头 6–20 位'], ['邮政编码', r`[1-9]\d{5}`, '中国大陆邮编'], ['mailto 链接', r`mailto:[^\s?]+(?:\?[^\s]+)?`, '邮件链接'], ['电话分隔格式', r`\d{3}[- ]\d{3,4}[- ]\d{4}`, '分段电话号码'],
  ]),
  ...rows('姓名账户', [
    ['中文姓名', r`[\u4e00-\u9fa5·]{2,20}`, '支持少数民族间隔点'], ['英文名称', r`[A-Za-z]+(?:[ '-][A-Za-z]+){0,4}`, '英文姓名或名称'], ['昵称', r`[\p{L}\p{N}_-]{2,24}`, 'Unicode 字母、数字及连接符'], ['用户名', r`[A-Za-z][A-Za-z0-9_]{3,31}`, '字母开头'], ['Slug', r`[a-z0-9]+(?:-[a-z0-9]+)*`, '小写短横线标识'], ['GitHub 用户名', r`[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?`, 'GitHub 用户名规则'], ['工号', r`[A-Z]{2,5}-?\d{4,10}`, '字母前缀工号'], ['中文公司名', r`[\u4e00-\u9fa5（）()A-Za-z0-9]{4,50}(?:公司|集团|中心|工作室)`, '常见组织名称'], ['首字母缩写', r`(?:[A-Z]\.){2,}|[A-Z]{2,10}`, '例如 API 或 U.S.'], ['显示名称', r`[\p{L}\p{N} ._'-]{2,40}`, '宽松 Unicode 显示名'],
  ]),
  ...rows('数字金额', [
    ['整数', r`[+-]?\d+`, '正负整数'], ['非负整数', r`\d+`, '零与正整数'], ['正整数', r`[1-9]\d*`, '不含零'], ['小数', r`[+-]?(?:\d+\.\d+|\d+)`, '整数或小数'], ['两位金额', r`(?:0|[1-9]\d*)(?:\.\d{1,2})?`, '最多两位小数'], ['千分位金额', r`(?:\d{1,3})(?:,\d{3})*(?:\.\d{2})?`, '例如 12,345.67'], ['百分比', r`(?:100(?:\.0+)?|\d{1,2}(?:\.\d+)?)%`, '0%–100%'], ['科学计数法', r`[+-]?(?:\d+\.?\d*|\.\d+)[eE][+-]?\d+`, '例如 1.2e-5'], ['十六进制数', r`0[xX][0-9A-Fa-f]+`, '0x 前缀'], ['数字范围', r`[+-]?\d+(?:\.\d+)?\s*(?:-|~|至)\s*[+-]?\d+(?:\.\d+)?`, '起止范围'],
  ]),
  ...rows('中文文本', [
    ['汉字', r`[\u4e00-\u9fff]+`, '基本中日韩统一表意文字'], ['中文标点', r`[，。！？；：“”‘’（）【】《》、…—]`, '常用中文标点'], ['中文段落', r`[\u4e00-\u9fff，。！？；：“”‘’（）【】《》、…—\s]+`, '汉字、标点及空白'], ['不含汉字', r`^[^\u4e00-\u9fff]*$`, '整段不出现汉字'], ['包含汉字', r`[\s\S]*[\u4e00-\u9fff][\s\S]*`, '整段至少一个汉字'], ['中英文混排', r`[\u4e00-\u9fffA-Za-z0-9\s]+`, '文字、数字及空格'], ['成对中文引号', r`“[^”]*”|‘[^’]*’`, '提取中文引号内容'], ['中文括号内容', r`（[^）]*）`, '提取全角括号'], ['连续空行', r`\n\s*\n(?:\s*\n)+`, '两个以上空行'], ['行尾空白', r`[ \t]+$`, '配合 m 标志'],
  ]),
  ...rows('编程格式', [
    ['Hex 颜色', r`#(?:[0-9A-Fa-f]{3,4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})`, 'CSS Hex 颜色'], ['RGB 颜色', r`rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)`, 'RGB/RGBA'], ['UUID', r`[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}`, 'UUID v1–v5'], ['SemVer', r`(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?`, '语义化版本'], ['CSS 变量', r`--[A-Za-z0-9_-]+`, '自定义属性名'], ['JS 标识符', r`[$A-Za-z_][$\w]*`, 'ASCII JavaScript 标识符'], ['HTML 标签', r`<([A-Za-z][\w:-]*)(?:\s[^<>]*?)?>[\s\S]*?</\1>`, '简单成对标签'], ['JSON 键', r`"((?:\\.|[^"\\])+)"\s*:`, '提取 JSON 属性名'], ['环境变量', r`^[A-Z_][A-Z0-9_]*=.*$`, '.env 单行'], ['Markdown 链接', r`\[([^\]]+)\]\((https?://[^\s)]+)\)`, '捕获文本与 URL'],
  ]),
  ...rows('文件路径', [
    ['文件扩展名', r`\.([A-Za-z0-9]{1,10})$`, '提取扩展名'], ['图片文件', r`[^\\/]+\.(?:png|jpe?g|gif|webp|svg|avif)$`, '常见图片格式'], ['Windows 路径', r`[A-Za-z]:\\(?:[^\\/:*?"<>|\r\n]+\\)*[^\\/:*?"<>|\r\n]*`, 'Windows 本地路径'], ['Unix 绝对路径', r`/(?:[^/\0]+/)*[^/\0]*`, 'Unix/Linux 路径'], ['相对路径', r`(?:\.\.?/)+(?:[^/\s]+/)*[^/\s]*`, './ 或 ../'], ['文件名', r`[^\\/:*?"<>|\r\n]+`, '跨平台保守文件名'], ['JS/TS 文件', r`[^\\/]+\.(?:[cm]?[jt]sx?)$`, 'JavaScript/TypeScript'], ['压缩文件', r`[^\\/]+\.(?:zip|7z|rar|tar|tar\.gz|tgz)$`, '常见压缩包'], ['隐藏文件', r`(?:^|/)\.[^/]+$`, '点号开头文件'], ['带行号路径', r`(.+?):(\d+)(?::(\d+))?$`, 'path:line:column'],
  ]),
  ...rows('表单业务', [
    ['中国身份证', r`[1-9]\d{5}(?:18|19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]`, '18 位身份证格式'], ['银行卡号', r`[1-9]\d{11,18}`, '12–19 位数字'], ['车牌号', r`[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼][A-Z][A-Z0-9]{5,6}`, '大陆常见车牌'], ['统一社会信用代码', r`[0-9ABCDEFGHJKLMNPQRTUWXY]{18}`, '18 位信用代码'], ['ISBN-13', r`97[89]-?\d{1,5}-?\d{1,7}-?\d{1,7}-?[\dX]`, 'ISBN 常用形式'], ['订单号', r`(?:ORD|ORDER)[-_]?\d{8,24}`, '常见订单前缀'], ['物流单号', r`[A-Z]{2}\d{9}[A-Z]{2}|\d{10,20}`, '国际或纯数字单号'], ['发票代码', r`\d{10,12}`, '常见发票代码长度'], ['经纬度', r`[+-]?(?:90(?:\.0+)?|[1-8]?\d(?:\.\d+)?),\s*[+-]?(?:180(?:\.0+)?|1[0-7]\d(?:\.\d+)?|\d{1,2}(?:\.\d+)?)`, '纬度,经度'], ['验证码', r`[A-Za-z0-9]{4,8}`, '常见图形验证码'],
  ]),
  ...rows('安全校验', [
    ['基础密码', r`(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,64}`, '字母与数字'], ['强密码', r`(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{10,64}`, '大小写、数字和符号'], ['Base64', r`(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?`, '标准 Base64'], ['Base64URL', r`[A-Za-z0-9_-]+`, 'URL-safe 字符'], ['JWT', r`eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+`, 'JWT 三段结构'], ['SHA-256', r`[0-9A-Fa-f]{64}`, '64 位十六进制'], ['MD5', r`[0-9A-Fa-f]{32}`, '32 位十六进制'], ['API Key', r`(?:api[_-]?key|token)[=: ]+[A-Za-z0-9_-]{16,}`, '常见键值形式'], ['Bearer Token', r`Bearer\s+[A-Za-z0-9._~-]+`, 'Authorization 值'], ['PEM 区块', r`-----BEGIN ([A-Z ]+)-----[\s\S]+?-----END \1-----`, '证书或密钥区块'],
  ]),
]

const generatedSnippets: RegexSnippet[] = [
  ...Array.from({ length: 25 }, (_, index) => ({ category: '固定数字长度', name: `${index + 1} 位数字`, pattern: `\\d{${index + 1}}`, description: `恰好 ${index + 1} 位数字` })),
  ...Array.from({ length: 25 }, (_, index) => ({ category: '字母数字长度', name: `${index + 4} 位字母数字`, pattern: `[A-Za-z0-9]{${index + 4}}`, description: `恰好 ${index + 4} 位 ASCII 字母或数字` })),
  ...Array.from({ length: 25 }, (_, index) => ({ category: '字母长度', name: `${index + 2} 位英文字母`, pattern: `[A-Za-z]{${index + 2}}`, description: `恰好 ${index + 2} 位英文字母` })),
  ...['USR', 'ORD', 'INV', 'SKU', 'PRJ'].flatMap((prefix) => [4, 6, 8, 10, 12].map((length) => ({ category: '业务编码', name: `${prefix}-${length} 位`, pattern: `${prefix}-\\d{${length}}`, description: `${prefix} 前缀加 ${length} 位数字` }))),
]

const regexSnippets = [...coreSnippets, ...generatedSnippets]
const categories = ['全部', ...new Set(regexSnippets.map((item) => item.category))]

export default function RegexMemoPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('全部')
  const [selected, setSelected] = useState(regexSnippets[0])
  const [value, setValue] = useState(regexSnippets[0].pattern)
  const filtered = useMemo(() => regexSnippets.filter((item) => (category === '全部' || item.category === category) && `${item.name} ${item.description} ${item.pattern}`.toLowerCase().includes(query.toLowerCase())), [category, query])
  const choose = (item: RegexSnippet) => { setSelected(item); setValue(item.pattern) }

  return <div className="regex-memo-tool">
    <div className="reference-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`搜索 ${regexSnippets.length} 条常用正则…`} /><span>{filtered.length} 条</span></div>
    <div className="regex-category-strip">{categories.map((item) => <button key={item} className={item === category ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div>
    <div className="regex-memo-layout">
      <div className="regex-snippet-list">{filtered.map((item) => <button key={`${item.category}-${item.name}`} className={item === selected ? 'active' : ''} onClick={() => choose(item)}><span>{item.category}</span><strong>{item.name}</strong><small>{item.description}</small></button>)}{!filtered.length && <p>没有匹配的正则表达式</p>}</div>
      <div className="regex-snippet-detail"><div><span className="result-kicker">{selected.category}</span><h2>{selected.name}</h2><p>{selected.description}</p></div><EditorPanel label="正则表达式" value={value} onChange={setValue} actions={<CopyButton value={value} />} /><div className="status-line">备忘表达式用于常见格式筛选；关键业务数据仍应配合专用校验算法</div></div>
    </div>
  </div>
}
