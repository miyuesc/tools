import { Check, ClipboardX, Copy } from 'lucide-react'
import Prism from 'prismjs'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-toml'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-yaml'
import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode, type UIEvent } from 'react'

export type EditorLanguage = 'plain' | 'json' | 'yaml' | 'markup' | 'css' | 'javascript' | 'typescript' | 'sql' | 'bash' | 'markdown' | 'toml'

const languageNames: Record<EditorLanguage, string> = {
  plain: 'TEXT', json: 'JSON', yaml: 'YAML', markup: 'MARKUP', css: 'CSS', javascript: 'JS', typescript: 'TS', sql: 'SQL', bash: 'SHELL', markdown: 'MD', toml: 'TOML',
}

function inferLanguage(label: string): EditorLanguage {
  const normalized = label.toLowerCase()
  if (normalized.includes('typescript')) return 'typescript'
  if (normalized.includes('javascript') || normalized.includes('fetch')) return 'javascript'
  if (normalized.includes('json')) return 'json'
  if (normalized.includes('yaml') || normalized.includes('compose')) return 'yaml'
  if (normalized.includes('toml')) return 'toml'
  if (normalized.includes('html') || normalized.includes('xml') || normalized.includes('svg') || normalized.includes('meta tag')) return 'markup'
  if (normalized.includes('sql')) return 'sql'
  if (normalized.includes('markdown')) return 'markdown'
  if (normalized.includes('curl') || normalized.includes('git') || normalized.includes('shell')) return 'bash'
  return 'plain'
}

function highlightedMarkup(value: string, language: EditorLanguage) {
  if (!value || language === 'plain') return ''
  const grammar = Prism.languages[language]
  return grammar ? Prism.highlight(value, grammar, language) : ''
}

export function EditorPanel({ label, value = '', onChange, placeholder, actions, readOnly = false, children, language, emptyMessage = '运行工具后，结果会显示在这里' }: {
  label: string
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  actions?: ReactNode
  readOnly?: boolean
  children?: ReactNode
  language?: EditorLanguage
  emptyMessage?: string
}) {
  const resolvedLanguage = language ?? inferLanguage(label)
  const markup = useMemo(() => highlightedMarkup(value, resolvedLanguage), [resolvedLanguage, value])
  const preRef = useRef<HTMLPreElement>(null)

  const syncScroll = (event: UIEvent<HTMLTextAreaElement>) => {
    if (!preRef.current) return
    preRef.current.scrollTop = event.currentTarget.scrollTop
    preRef.current.scrollLeft = event.currentTarget.scrollLeft
  }

  const insertTab = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (readOnly || resolvedLanguage === 'plain' || event.key !== 'Tab') return
    event.preventDefault()
    const target = event.currentTarget
    const start = target.selectionStart
    const end = target.selectionEnd
    const next = `${value.slice(0, start)}  ${value.slice(end)}`
    onChange?.(next)
    requestAnimationFrame(() => {
      target.selectionStart = target.selectionEnd = start + 2
    })
  }

  return (
    <div className={`editor-panel ${readOnly ? 'is-readonly' : ''}`}>
      <div className="panel-label">
        <span>{label}</span>
        <div>{resolvedLanguage !== 'plain' && <span className="language-badge">{languageNames[resolvedLanguage]}</span>}{actions}</div>
      </div>
      {children || (
        <div className={`code-editor ${resolvedLanguage !== 'plain' ? 'has-highlighting' : ''} ${value ? '' : 'is-empty'}`}>
          {resolvedLanguage !== 'plain' && <pre ref={preRef} aria-hidden="true"><code className={`language-${resolvedLanguage}`} dangerouslySetInnerHTML={{ __html: markup }} />{value.endsWith('\n') ? '\n' : null}</pre>}
          <textarea
            aria-label={label}
            value={value}
            onChange={(event) => onChange?.(event.target.value)}
            onKeyDown={insertTab}
            onScroll={syncScroll}
            placeholder={placeholder}
            readOnly={readOnly}
            spellCheck={false}
          />
          {readOnly && !value && <span className="editor-empty" aria-live="polite">{emptyMessage}</span>}
        </div>
      )}
    </div>
  )
}

async function writeClipboard(value: string) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value)
  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()
  if (!copied) throw new Error('Clipboard unavailable')
}

export function CopyButton({ value }: { value: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const copy = async () => {
    try {
      await writeClipboard(value)
      setStatus('copied')
    } catch {
      setStatus('error')
    }
    window.setTimeout(() => setStatus('idle'), 1600)
  }

  return (
    <button className={`mini-action ${status}`} onClick={copy} disabled={!value} aria-live="polite" title={status === 'error' ? '浏览器拒绝了剪贴板访问' : undefined}>
      {status === 'copied' ? <Check size={14} /> : status === 'error' ? <ClipboardX size={14} /> : <Copy size={14} />}
      {status === 'copied' ? '已复制' : status === 'error' ? '复制失败' : '复制'}
    </button>
  )
}
