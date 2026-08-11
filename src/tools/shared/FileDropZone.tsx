import { useCallback, useEffect, useState, type DragEvent, type ReactNode } from 'react'
import { formatBytes } from './fileUtils'

export function FileDropZone({ accept, maxBytes, title, detail, icon, enablePaste = false, onFile, onError }: {
  accept?: string
  maxBytes: number
  title: string
  detail: string
  icon?: ReactNode
  enablePaste?: boolean
  onFile: (file: File) => void
  onError: (message: string) => void
}) {
  const [dragging, setDragging] = useState(false)

  const acceptFile = useCallback((file?: File) => {
    setDragging(false)
    if (!file) return
    if (file.size > maxBytes) { onError(`文件大小为 ${formatBytes(file.size)}，上限为 ${formatBytes(maxBytes)}`); return }
    if (accept === 'image/*' && !file.type.startsWith('image/')) { onError('请选择浏览器支持的图片文件'); return }
    onError('')
    onFile(file)
  }, [accept, maxBytes, onError, onFile])

  useEffect(() => {
    if (!enablePaste) return
    const paste = (event: ClipboardEvent) => {
      const itemFile = Array.from(event.clipboardData?.items || []).find((item) => item.kind === 'file' && item.type.startsWith('image/'))?.getAsFile()
      const file = itemFile || Array.from(event.clipboardData?.files || []).find((entry) => entry.type.startsWith('image/'))
      if (!file) return
      event.preventDefault()
      acceptFile(file)
    }
    window.addEventListener('paste', paste)
    return () => window.removeEventListener('paste', paste)
  }, [acceptFile, enablePaste])

  const drop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    acceptFile(event.dataTransfer.files[0])
  }

  return <label className={`upload-drop ${dragging ? 'is-dragging' : ''}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true) }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={drop}>
    {icon}
    <strong>{title}</strong>
    <span>{detail}{enablePaste ? ' · Ctrl/⌘V 粘贴图片' : ''}</span>
    <input type="file" accept={accept} onClick={(event) => { event.currentTarget.value = '' }} onChange={(event) => acceptFile(event.currentTarget.files?.[0])} />
  </label>
}
