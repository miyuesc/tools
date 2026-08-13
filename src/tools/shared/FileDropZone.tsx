import { useCallback, useEffect, useState, type DragEvent, type ReactNode } from 'react'
import { formatBytes } from './fileUtils'

export function FileDropZone({ accept, maxBytes, title, detail, icon, enablePaste = false, multiple = false, onFile, onFiles, onError }: {
  accept?: string
  maxBytes: number
  title: string
  detail: string
  icon?: ReactNode
  enablePaste?: boolean
  multiple?: boolean
  onFile: (file: File) => void
  onFiles?: (files: File[]) => void
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

  const acceptFiles = useCallback((input?: FileList | File[]) => {
    const files = Array.from(input || [])
    if (!multiple || !onFiles) { acceptFile(files[0]); return }
    setDragging(false)
    const valid = files.filter((file) => {
      if (file.size > maxBytes) return false
      if (accept === 'image/*' && !file.type.startsWith('image/')) return false
      return true
    })
    if (valid.length !== files.length) onError(`${files.length - valid.length} 个文件因格式不支持或超过 ${formatBytes(maxBytes)} 被跳过`)
    else onError('')
    if (valid.length) onFiles(valid)
  }, [accept, acceptFile, maxBytes, multiple, onError, onFiles])

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
    acceptFiles(event.dataTransfer.files)
  }

  return <label className={`upload-drop ${dragging ? 'is-dragging' : ''}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true) }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={drop}>
    {icon}
    <strong>{title}</strong>
    <span>{detail}{enablePaste ? ' · Ctrl/⌘V 粘贴图片' : ''}</span>
    <input type="file" accept={accept} multiple={multiple} onClick={(event) => { event.currentTarget.value = '' }} onChange={(event) => acceptFiles(event.currentTarget.files || undefined)} />
  </label>
}
