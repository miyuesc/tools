import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { EditorPanel } from '../shared/EditorPanel'

function countSegments(value: string, granularity: 'grapheme' | 'word') {
  if (!value) return 0
  if (!('Segmenter' in Intl)) return granularity === 'grapheme' ? Array.from(value).length : value.trim().split(/\s+/).length
  const segments = new Intl.Segmenter('zh-CN', { granularity }).segment(value)
  return Array.from(segments).filter((segment) => granularity === 'grapheme' || segment.isWordLike).length
}

export default function TextToolPage() {
  const [value, setValue] = useState('发布说明：修复图片缩放时的偏移问题，并调整了导出尺寸。\n\n图片处理在当前浏览器中完成。')
  const stats = { 字素: countSegments(value, 'grapheme'), '字素（不含空格）': countSegments(value.replace(/\s/g, ''), 'grapheme'), '中英文词语': countSegments(value, 'word'), 行数: value ? value.split('\n').length : 0, 'UTF-8 字节': new TextEncoder().encode(value).byteLength }
  return <><div className="stats-strip">{Object.entries(stats).map(([label, number]) => <div key={label}><strong>{number.toLocaleString()}</strong><span>{label}</span></div>)}</div><EditorPanel label="文本内容" value={value} onChange={setValue} placeholder="开始输入或粘贴文本…" actions={<button className="mini-action" onClick={() => setValue('')}><Trash2 size={14} />清空</button>} /><div className="status-line">按 Unicode 字素统计 Emoji 与组合字符；词数使用中英文分词规则</div></>
}
