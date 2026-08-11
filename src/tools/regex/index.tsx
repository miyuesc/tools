import { useMemo, useState } from 'react'
import { EditorPanel } from '../shared/EditorPanel'

const flagOptions = [['g', '全局'], ['i', '忽略大小写'], ['m', '多行'], ['s', '点匹配换行'], ['u', 'Unicode'], ['y', '粘滞匹配']] as const

type RegexNode = { value: string; type: string; description: string }
function visualizePattern(pattern: string) {
  const nodes: RegexNode[] = []
  for (let index = 0; index < pattern.length;) {
    const rest = pattern.slice(index)
    const escaped = rest.match(/^\\(?:p\{[^}]+\}|P\{[^}]+\}|[dDsSwWbBtrnvf0/\\.^$|?*+()[\]{}-])/)
    const characterClass = rest.match(/^\[(?:\\.|[^\]\\])*\]/)
    const quantifier = rest.match(/^(?:\{\d+(?:,\d*)?\}|[?*+])\??/)
    const group = rest.match(/^\(\?(?:<[^>]+>|[:=!<])|^\(/)
    const literal = rest.match(/^[^\\[\]{}()*+?|.^$]+/)
    const match = escaped || characterClass || quantifier || group || literal
    const value = match?.[0] || pattern[index]
    let type = 'literal'; let description = '按字面匹配'
    if (escaped) { type = 'escape'; description = value.startsWith('\\p') || value.startsWith('\\P') ? 'Unicode 属性' : '转义或预定义字符类' }
    else if (characterClass) { type = 'class'; description = '字符集合，匹配其中一个字符' }
    else if (quantifier) { type = 'quantifier'; description = '限定前一个元素的重复次数' }
    else if (group) { type = 'group'; description = value === '(' ? '捕获分组开始' : '特殊分组或断言开始' }
    else if (value === ')') { type = 'group'; description = '分组结束' }
    else if (value === '|') { type = 'branch'; description = '匹配左侧或右侧分支' }
    else if (value === '^' || value === '$') { type = 'anchor'; description = value === '^' ? '文本或行起点' : '文本或行终点' }
    else if (value === '.') { type = 'class'; description = '除换行外的任意字符' }
    nodes.push({ value, type, description }); index += value.length
  }
  return nodes
}

export default function RegexToolPage() {
  const [pattern, setPattern] = useState('([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\\.[A-Za-z]{2,})')
  const [flags, setFlags] = useState('gi')
  const [text, setText] = useState('联系我们：hello@lumen.tools\n备用邮箱：team@example.com')
  let matches: RegExpMatchArray[] = [], error = ''
  try { matches = Array.from(text.matchAll(new RegExp(pattern, flags.includes('g') ? flags : `${flags}g`))) }
  catch (cause) { error = cause instanceof Error ? cause.message : '表达式无效' }
  const toggleFlag = (flag: string) => setFlags((value) => value.includes(flag) ? value.replace(flag, '') : `${value}${flag}`)
  const nodes = useMemo(() => visualizePattern(pattern), [pattern])

  return <>
    <div className="regex-input"><span>/</span><input aria-label="正则表达式" value={pattern} onChange={(event) => setPattern(event.target.value)} /><span>/</span><input aria-label="正则标志" className="flags" value={flags} onChange={(event) => setFlags(Array.from(new Set(event.target.value.replace(/[^dgimsuvy]/g, ''))).join(''))} /></div>
    <div className="workspace-toolbar regex-options">{flagOptions.map(([flag, label]) => <label key={flag}><input type="checkbox" checked={flags.includes(flag)} onChange={() => toggleFlag(flag)} />{label} <code>{flag}</code></label>)}<span className="toolbar-hint">匹配预览始终遍历全文；开关会写入表达式标志</span></div>
    <section className="regex-visualizer"><div className="panel-label"><span>表达式结构</span><small>{nodes.length} 个语法节点 · 参考 regex-vis 的可视化编辑思路</small></div><div className="regex-track">{nodes.map((node, index) => <div className={`regex-node ${node.type}`} key={`${index}-${node.value}`} title={node.description}><code>{node.value || '空'}</code><span>{node.description}</span></div>)}</div></section>
    <div className="dual-editor"><EditorPanel label="测试文本" value={text} onChange={setText} /><EditorPanel label={error ? '表达式错误' : `${matches.length} 个匹配`}><div className="match-list">{error ? <p className="regex-error">{error}</p> : matches.length ? matches.map((match, index) => <div key={`${match.index}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><code>{match[0] || '空匹配'}</code><small>位置 {match.index}</small>{match.length > 1 && <dl>{match.slice(1).map((group, groupIndex) => <div key={groupIndex}><dt>${groupIndex + 1}</dt><dd>{group ?? '未参与匹配'}</dd></div>)}</dl>}</div>) : <p>没有匹配结果</p>}</div></EditorPanel></div>
  </>
}
