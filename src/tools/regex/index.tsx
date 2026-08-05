import { useState } from 'react'
import { EditorPanel } from '../shared/EditorPanel'

const flagOptions = [['g', '全局'], ['i', '忽略大小写'], ['m', '多行']] as const

export default function RegexToolPage() {
  const [pattern, setPattern] = useState('([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\\.[A-Za-z]{2,})')
  const [flags, setFlags] = useState('gi')
  const [text, setText] = useState('联系我们：hello@lumen.tools\n备用邮箱：team@example.com')
  let matches: RegExpMatchArray[] = [], error = ''
  try { matches = Array.from(text.matchAll(new RegExp(pattern, flags.includes('g') ? flags : `${flags}g`))) }
  catch (cause) { error = cause instanceof Error ? cause.message : '表达式无效' }
  const toggleFlag = (flag: string) => setFlags((value) => value.includes(flag) ? value.replace(flag, '') : `${value}${flag}`)

  return <>
    <div className="regex-input"><span>/</span><input aria-label="正则表达式" value={pattern} onChange={(event) => setPattern(event.target.value)} /><span>/</span><input aria-label="正则标志" className="flags" value={flags} onChange={(event) => setFlags(Array.from(new Set(event.target.value.replace(/[^dgimsuvy]/g, ''))).join(''))} /></div>
    <div className="workspace-toolbar regex-options">{flagOptions.map(([flag, label]) => <label key={flag}><input type="checkbox" checked={flags.includes(flag)} onChange={() => toggleFlag(flag)} />{label} <code>{flag}</code></label>)}<span className="toolbar-hint">匹配预览始终遍历全文；开关会写入表达式标志</span></div>
    <div className="dual-editor"><EditorPanel label="测试文本" value={text} onChange={setText} /><EditorPanel label={error ? '表达式错误' : `${matches.length} 个匹配`}><div className="match-list">{error ? <p className="regex-error">{error}</p> : matches.length ? matches.map((match, index) => <div key={`${match.index}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><code>{match[0] || '空匹配'}</code><small>位置 {match.index}</small>{match.length > 1 && <dl>{match.slice(1).map((group, groupIndex) => <div key={groupIndex}><dt>${groupIndex + 1}</dt><dd>{group ?? '未参与匹配'}</dd></div>)}</dl>}</div>) : <p>没有匹配结果</p>}</div></EditorPanel></div>
  </>
}
