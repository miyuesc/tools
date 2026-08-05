import {
  ClipboardPaste,
  Copy,
  Crop,
  Download,
  Hand,
  ImagePlus,
  Layers,
  Maximize2,
  Move,
  RotateCcw,
  Trash2,
  Upload,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'

type CropRect = { x: number; y: number; width: number; height: number }
type Box = { x: number; y: number; width: number; height: number }
type Point = { x: number; y: number }
type GuideState = { x: number | null; y: number | null }
type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
type ImageLayer = {
  id: string
  name: string
  image: HTMLImageElement
  x: number
  y: number
  width: number
  height: number
  crop: CropRect
}
type DragState =
  | { type: 'pan'; startClientX: number; startClientY: number; originX: number; originY: number }
  | { type: 'move'; ids: string[]; primaryId: string; startX: number; startY: number; origins: Record<string, Point> }
  | { type: 'resize'; id: string; handle: ResizeHandle; startX: number; startY: number; origin: Box }
  | { type: 'crop-create'; id: string; startX: number; startY: number }
  | { type: 'crop-move'; id: string; startX: number; startY: number; origin: CropRect }
  | { type: 'crop-resize'; id: string; handle: ResizeHandle; startX: number; startY: number; origin: CropRect }

const handles: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const isInside = (point: Point, box: Box) => point.x >= box.x && point.x <= box.x + box.width && point.y >= box.y && point.y <= box.y + box.height

const handleCursor: Record<ResizeHandle, string> = {
  nw: 'nwse-resize', n: 'ns-resize', ne: 'nesw-resize', e: 'ew-resize',
  se: 'nwse-resize', s: 'ns-resize', sw: 'nesw-resize', w: 'ew-resize',
}

function handlePoint(box: Box, handle: ResizeHandle) {
  const centerX = box.x + box.width / 2
  const centerY = box.y + box.height / 2
  return {
    x: handle.includes('w') ? box.x : handle.includes('e') ? box.x + box.width : centerX,
    y: handle.includes('n') ? box.y : handle.includes('s') ? box.y + box.height : centerY,
  }
}

function hitHandle(point: Point, box: Box, zoom: number) {
  const range = 10 / (zoom / 100)
  return handles.find((handle) => {
    const target = handlePoint(box, handle)
    return Math.abs(point.x - target.x) <= range && Math.abs(point.y - target.y) <= range
  }) || null
}

function resizeBox(origin: Box, handle: ResizeHandle, deltaX: number, deltaY: number, minimum = 24): Box {
  let left = origin.x
  let right = origin.x + origin.width
  let top = origin.y
  let bottom = origin.y + origin.height
  if (handle.includes('w')) left = Math.min(right - minimum, origin.x + deltaX)
  if (handle.includes('e')) right = Math.max(left + minimum, origin.x + origin.width + deltaX)
  if (handle.includes('n')) top = Math.min(bottom - minimum, origin.y + deltaY)
  if (handle.includes('s')) bottom = Math.max(top + minimum, origin.y + origin.height + deltaY)
  return { x: left, y: top, width: right - left, height: bottom - top }
}

function resizeCrop(origin: CropRect, handle: ResizeHandle, deltaX: number, deltaY: number): CropRect {
  const minimum = .02
  let left = origin.x
  let right = origin.x + origin.width
  let top = origin.y
  let bottom = origin.y + origin.height
  if (handle.includes('w')) left = clamp(origin.x + deltaX, 0, right - minimum)
  if (handle.includes('e')) right = clamp(origin.x + origin.width + deltaX, left + minimum, 1)
  if (handle.includes('n')) top = clamp(origin.y + deltaY, 0, bottom - minimum)
  if (handle.includes('s')) bottom = clamp(origin.y + origin.height + deltaY, top + minimum, 1)
  return { x: left, y: top, width: right - left, height: bottom - top }
}

function drawHandles(context: CanvasRenderingContext2D, box: Box, zoom: number, fill: string) {
  const size = 10 / (zoom / 100)
  context.setLineDash([])
  context.lineWidth = 1.5 / (zoom / 100)
  context.strokeStyle = '#172017'
  context.fillStyle = fill
  handles.forEach((handle) => {
    const point = handlePoint(box, handle)
    context.fillRect(point.x - size / 2, point.y - size / 2, size, size)
    context.strokeRect(point.x - size / 2, point.y - size / 2, size, size)
  })
}

function drawImageLayers(context: CanvasRenderingContext2D, layers: ImageLayer[]) {
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  layers.forEach((layer) => {
    context.drawImage(
      layer.image,
      layer.crop.x,
      layer.crop.y,
      layer.crop.width,
      layer.crop.height,
      layer.x,
      layer.y,
      layer.width,
      layer.height,
    )
  })
}

function getBounds(layers: ImageLayer[]): Box | null {
  if (!layers.length) return null
  const left = Math.min(...layers.map((layer) => layer.x))
  const top = Math.min(...layers.map((layer) => layer.y))
  const right = Math.max(...layers.map((layer) => layer.x + layer.width))
  const bottom = Math.max(...layers.map((layer) => layer.y + layer.height))
  return { x: left, y: top, width: right - left, height: bottom - top }
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG 生成失败')), 'image/png'))
}

export default function ImageStudioPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const [layers, setLayers] = useState<ImageLayer[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [viewportSize, setViewportSize] = useState({ width: 1, height: 1 })
  const [zoom, setZoom] = useState(100)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [guides, setGuides] = useState<GuideState>({ x: null, y: null })
  const [dragActive, setDragActive] = useState(false)
  const [spacePressed, setSpacePressed] = useState(false)
  const [cursor, setCursor] = useState('default')
  const [cropMode, setCropMode] = useState(false)
  const [cropDraft, setCropDraft] = useState<CropRect>({ x: 0, y: 0, width: 1, height: 1 })
  const [notice, setNotice] = useState('按 ⌘V / Ctrl+V 即可粘贴图片')

  const selectedId = selectedIds.at(-1) || null
  const selected = layers.find((layer) => layer.id === selectedId) || null
  const deviceScale = Math.min(window.devicePixelRatio || 1, 3)

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const updateSize = () => setViewportSize({ width: Math.max(1, viewport.clientWidth), height: Math.max(1, viewport.clientHeight) })
    const observer = new ResizeObserver(updateSize)
    observer.observe(viewport)
    updateSize()
    return () => observer.disconnect()
  }, [])

  const changeZoom = useCallback((next: number | ((current: number) => number)) => {
    setZoom((current) => clamp(Math.round(typeof next === 'function' ? next(current) : next), 5, 800))
  }, [])

  const frameLayers = useCallback((items: ImageLayer[]) => {
    const viewport = viewportRef.current
    const bounds = getBounds(items)
    if (!viewport || !bounds) return
    const scale = clamp(Math.min((viewport.clientWidth - 120) / Math.max(bounds.width, 1), (viewport.clientHeight - 120) / Math.max(bounds.height, 1)), .05, 2)
    setZoom(Math.round(scale * 100))
    setPan({ x: -(bounds.x + bounds.width / 2) * scale, y: -(bounds.y + bounds.height / 2) * scale })
  }, [])

  const fitContent = useCallback(() => {
    const items = selectedIds.length ? layers.filter((layer) => selectedIds.includes(layer.id)) : layers
    frameLayers(items)
  }, [frameLayers, layers, selectedIds])

  const renderOutput = useCallback((ids?: string[]) => {
    const includedIds = ids?.length ? ids : layers.map((layer) => layer.id)
    const items = layers.filter((layer) => includedIds.includes(layer.id))
    const bounds = getBounds(items)
    if (!bounds) throw new Error('请先添加至少一张图片')
    const left = Math.floor(bounds.x)
    const top = Math.floor(bounds.y)
    const right = Math.ceil(bounds.x + bounds.width)
    const bottom = Math.ceil(bounds.y + bounds.height)
    const width = Math.max(1, right - left)
    const height = Math.max(1, bottom - top)
    if (width > 16384 || height > 16384 || width * height > 100_000_000) throw new Error(`所选范围 ${width}×${height} 过大，请缩小后导出`)
    const output = document.createElement('canvas')
    output.width = width
    output.height = height
    const context = output.getContext('2d')
    if (!context) throw new Error('无法创建导出画布')
    context.clearRect(0, 0, width, height)
    context.translate(-left, -top)
    drawImageLayers(context, items)
    return { output, width, height, count: items.length }
  }, [layers])

  const copyPng = useCallback(async (ids?: string[]) => {
    try {
      const result = renderOutput(ids)
      const blob = await canvasToBlob(result.output)
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setNotice(`已复制 ${result.count} 张图片 · ${result.width}×${result.height} 透明 PNG`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '复制失败，请检查剪贴板权限')
    }
  }, [renderOutput])

  const exportPng = useCallback(async () => {
    try {
      const result = renderOutput(selectedIds)
      const blob = await canvasToBlob(result.output)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `lumen-selection-${result.width}x${result.height}.png`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setNotice(`已导出 ${result.count} 张图片 · ${result.width}×${result.height} 透明 PNG`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '导出失败')
    }
  }, [renderOutput, selectedIds])

  const loadFiles = useCallback(async (fileList: File[] | FileList) => {
    const files = Array.from(fileList).filter((file) => file.type.startsWith('image/'))
    if (!files.length) {
      setNotice('没有检测到可用的图片文件')
      return
    }

    const loaded = await Promise.all(files.map((file, index) => new Promise<ImageLayer>((resolve, reject) => {
      const reader = new FileReader()
      const image = new Image()
      image.onload = () => resolve({
        id: crypto.randomUUID(),
        name: file.name || `剪贴板图片 ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`,
        image,
        x: -image.naturalWidth / 2 + index * 32,
        y: -image.naturalHeight / 2 + index * 32,
        width: image.naturalWidth,
        height: image.naturalHeight,
        crop: { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight },
      })
      image.onerror = () => reject(new Error(`无法读取 ${file.name}`))
      reader.onload = () => { image.src = String(reader.result) }
      reader.onerror = () => reject(new Error(`无法读取 ${file.name}`))
      reader.readAsDataURL(file)
    })))

    setLayers((current) => [...current, ...loaded])
    setSelectedIds(loaded.map((layer) => layer.id))
    setCropMode(false)
    setNotice(`已按原始尺寸添加 ${loaded.length} 张图片`)
    window.requestAnimationFrame(() => frameLayers(loaded))
  }, [frameLayers])

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const imageFiles = Array.from(event.clipboardData?.items || [])
        .filter((item) => item.type.startsWith('image/'))
        .map((item, index) => {
          const blob = item.getAsFile()
          return blob ? new File([blob], `clipboard-${Date.now()}-${index}.png`, { type: blob.type }) : null
        })
        .filter((file): file is File => Boolean(file))
      if (imageFiles.length) {
        event.preventDefault()
        void loadFiles(imageFiles)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [loadFiles])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const editing = Boolean(target?.matches('input, textarea, select'))
      const command = event.metaKey || event.ctrlKey
      if (event.code === 'Space' && !editing) {
        event.preventDefault()
        setSpacePressed(true)
      }
      if (!editing && command && event.key.toLowerCase() === 'a' && layers.length) {
        event.preventDefault()
        setSelectedIds(layers.map((layer) => layer.id))
        setCropMode(false)
        setNotice(`已全选 ${layers.length} 张图片，可直接 ⌘C / Ctrl+C 复制`)
      }
      if (!editing && command && event.key.toLowerCase() === 'c' && layers.length) {
        event.preventDefault()
        void copyPng(selectedIds)
      }
      if (!editing && (event.key === '+' || event.key === '=')) {
        event.preventDefault()
        changeZoom((value) => value + 10)
      }
      if (!editing && event.key === '-') {
        event.preventDefault()
        changeZoom((value) => value - 10)
      }
      if (!editing && event.key === '0') {
        event.preventDefault()
        fitContent()
      }
      if (!editing && (event.key === 'Delete' || event.key === 'Backspace') && selectedIds.length) {
        event.preventDefault()
        setLayers((items) => items.filter((layer) => !selectedIds.includes(layer.id)))
        setSelectedIds([])
        setCropMode(false)
      }
      if (!editing && selectedIds.length && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault()
        const step = event.shiftKey ? 10 : 1
        setLayers((items) => items.map((layer) => selectedIds.includes(layer.id) ? {
          ...layer,
          x: layer.x + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0),
          y: layer.y + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0),
        } : layer))
      }
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') setSpacePressed(false)
    }
    const clearSpace = () => setSpacePressed(false)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', clearSpace)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', clearSpace)
    }
  }, [changeZoom, copyPng, fitContent, layers, selectedIds])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, 0, canvas.width, canvas.height)

    const scale = zoom / 100
    context.setTransform(
      deviceScale * scale,
      0,
      0,
      deviceScale * scale,
      deviceScale * (viewportSize.width / 2 + pan.x),
      deviceScale * (viewportSize.height / 2 + pan.y),
    )
    drawImageLayers(context, layers)

    const selectedLayers = layers.filter((layer) => selectedIds.includes(layer.id))
    selectedLayers.forEach((layer) => {
      context.save()
      context.strokeStyle = '#b8f35d'
      context.lineWidth = (layer.id === selectedId ? 2 : 1) / scale
      context.setLineDash(layer.id === selectedId ? [] : [5 / scale, 5 / scale])
      context.strokeRect(layer.x, layer.y, layer.width, layer.height)
      context.restore()
    })

    if (selected && selectedIds.length === 1) {
      context.save()
      if (cropMode) {
        const crop = {
          x: selected.x + selected.width * cropDraft.x,
          y: selected.y + selected.height * cropDraft.y,
          width: selected.width * cropDraft.width,
          height: selected.height * cropDraft.height,
        }
        context.fillStyle = 'rgba(4, 7, 5, .58)'
        context.fillRect(selected.x, selected.y, selected.width, crop.y - selected.y)
        context.fillRect(selected.x, crop.y + crop.height, selected.width, selected.y + selected.height - crop.y - crop.height)
        context.fillRect(selected.x, crop.y, crop.x - selected.x, crop.height)
        context.fillRect(crop.x + crop.width, crop.y, selected.x + selected.width - crop.x - crop.width, crop.height)
        context.strokeStyle = '#ffffff'
        context.lineWidth = 1.5 / scale
        context.setLineDash([8 / scale, 6 / scale])
        context.strokeRect(crop.x, crop.y, crop.width, crop.height)
        drawHandles(context, crop, zoom, '#ffffff')
      } else {
        drawHandles(context, selected, zoom, '#b8f35d')
      }
      context.restore()
    }

    const viewLeft = (-viewportSize.width / 2 - pan.x) / scale
    const viewTop = (-viewportSize.height / 2 - pan.y) / scale
    const viewRight = viewLeft + viewportSize.width / scale
    const viewBottom = viewTop + viewportSize.height / scale
    context.save()
    context.strokeStyle = 'rgba(184, 243, 93, .85)'
    context.lineWidth = 1 / scale
    context.setLineDash([5 / scale, 5 / scale])
    if (guides.x !== null) { context.beginPath(); context.moveTo(guides.x, viewTop); context.lineTo(guides.x, viewBottom); context.stroke() }
    if (guides.y !== null) { context.beginPath(); context.moveTo(viewLeft, guides.y); context.lineTo(viewRight, guides.y); context.stroke() }
    context.restore()
  }, [cropDraft, cropMode, deviceScale, guides, layers, pan, selected, selectedId, selectedIds, viewportSize, zoom])

  const pointFromEvent = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const scale = zoom / 100
    return {
      x: (event.clientX - rect.left - rect.width / 2 - pan.x) / scale,
      y: (event.clientY - rect.top - rect.height / 2 - pan.y) / scale,
    }
  }

  const beginPan = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { type: 'pan', startClientX: event.clientX, startClientY: event.clientY, originX: pan.x, originY: pan.y }
    setCursor('grabbing')
  }

  const cropBox = selected ? {
    x: selected.x + selected.width * cropDraft.x,
    y: selected.y + selected.height * cropDraft.y,
    width: selected.width * cropDraft.width,
    height: selected.height * cropDraft.height,
  } : null

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.button === 1 || spacePressed) {
      event.preventDefault()
      beginPan(event)
      return
    }
    if (event.button !== 0) return
    const point = pointFromEvent(event)
    event.currentTarget.setPointerCapture(event.pointerId)

    if (cropMode && selected && selectedIds.length === 1 && cropBox) {
      const handle = hitHandle(point, cropBox, zoom)
      const normalizedX = clamp((point.x - selected.x) / selected.width, 0, 1)
      const normalizedY = clamp((point.y - selected.y) / selected.height, 0, 1)
      if (handle) {
        dragRef.current = { type: 'crop-resize', id: selected.id, handle, startX: normalizedX, startY: normalizedY, origin: cropDraft }
        setCursor(handleCursor[handle])
        return
      }
      if (isInside(point, cropBox)) {
        dragRef.current = { type: 'crop-move', id: selected.id, startX: normalizedX, startY: normalizedY, origin: cropDraft }
        setCursor('move')
        return
      }
      if (isInside(point, selected)) {
        setCropDraft({ x: normalizedX, y: normalizedY, width: 0, height: 0 })
        dragRef.current = { type: 'crop-create', id: selected.id, startX: normalizedX, startY: normalizedY }
        setCursor('crosshair')
        return
      }
    }

    if (selected && selectedIds.length === 1 && !cropMode) {
      const handle = hitHandle(point, selected, zoom)
      if (handle) {
        dragRef.current = { type: 'resize', id: selected.id, handle, startX: point.x, startY: point.y, origin: selected }
        setCursor(handleCursor[handle])
        return
      }
    }

    const hit = [...layers].reverse().find((layer) => isInside(point, layer))
    if (hit) {
      if (event.shiftKey || event.metaKey || event.ctrlKey) {
        setSelectedIds((ids) => ids.includes(hit.id) ? ids.filter((id) => id !== hit.id) : [...ids, hit.id])
        setCropMode(false)
        return
      }
      const moveIds = selectedIds.includes(hit.id) ? selectedIds : [hit.id]
      const origins = Object.fromEntries(layers.filter((layer) => moveIds.includes(layer.id)).map((layer) => [layer.id, { x: layer.x, y: layer.y }]))
      setSelectedIds(moveIds)
      setCropMode(false)
      dragRef.current = { type: 'move', ids: moveIds, primaryId: hit.id, startX: point.x, startY: point.y, origins }
      setCursor('move')
    } else {
      if (!event.shiftKey) setSelectedIds([])
      setCropMode(false)
      beginPan(event)
    }
  }

  const snapAxis = (position: number, size: number, targets: number[]) => {
    const threshold = 10 / (zoom / 100)
    const anchors = [position, position + size / 2, position + size]
    let bestDelta = 0
    let guide: number | null = null
    let distance = threshold
    for (const anchor of anchors) for (const target of [0, ...targets]) {
      const nextDistance = Math.abs(target - anchor)
      if (nextDistance < distance) { distance = nextDistance; bestDelta = target - anchor; guide = target }
    }
    return { position: position + bestDelta, guide }
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (!drag) {
      if (spacePressed) { setCursor('grab'); return }
      const point = pointFromEvent(event)
      if (cropMode && cropBox) {
        const handle = hitHandle(point, cropBox, zoom)
        if (handle) { setCursor(handleCursor[handle]); return }
        if (isInside(point, cropBox)) { setCursor('move'); return }
        setCursor(selected && isInside(point, selected) ? 'crosshair' : 'grab')
        return
      }
      if (selected && selectedIds.length === 1) {
        const handle = hitHandle(point, selected, zoom)
        if (handle) { setCursor(handleCursor[handle]); return }
      }
      setCursor([...layers].reverse().some((layer) => isInside(point, layer)) ? 'move' : 'grab')
      return
    }

    if (drag.type === 'pan') {
      setPan({ x: drag.originX + event.clientX - drag.startClientX, y: drag.originY + event.clientY - drag.startClientY })
      return
    }

    const point = pointFromEvent(event)
    if (drag.type === 'crop-create') {
      const layer = layers.find((item) => item.id === drag.id)
      if (!layer) return
      const currentX = clamp((point.x - layer.x) / layer.width, 0, 1)
      const currentY = clamp((point.y - layer.y) / layer.height, 0, 1)
      setCropDraft({ x: Math.min(drag.startX, currentX), y: Math.min(drag.startY, currentY), width: Math.abs(currentX - drag.startX), height: Math.abs(currentY - drag.startY) })
      return
    }

    if (drag.type === 'crop-move' || drag.type === 'crop-resize') {
      const layer = layers.find((item) => item.id === drag.id)
      if (!layer) return
      const currentX = (point.x - layer.x) / layer.width
      const currentY = (point.y - layer.y) / layer.height
      if (drag.type === 'crop-move') {
        setCropDraft({ ...drag.origin, x: clamp(drag.origin.x + currentX - drag.startX, 0, 1 - drag.origin.width), y: clamp(drag.origin.y + currentY - drag.startY, 0, 1 - drag.origin.height) })
      } else {
        setCropDraft(resizeCrop(drag.origin, drag.handle, currentX - drag.startX, currentY - drag.startY))
      }
      return
    }

    if (drag.type === 'resize') {
      const box = resizeBox(drag.origin, drag.handle, point.x - drag.startX, point.y - drag.startY)
      setLayers((items) => items.map((layer) => layer.id === drag.id ? { ...layer, ...box } : layer))
      return
    }

    const primary = layers.find((layer) => layer.id === drag.primaryId)
    const primaryOrigin = drag.origins[drag.primaryId]
    if (!primary || !primaryOrigin) return
    const rawX = primaryOrigin.x + point.x - drag.startX
    const rawY = primaryOrigin.y + point.y - drag.startY
    const others = layers.filter((layer) => !drag.ids.includes(layer.id))
    const xTargets = others.flatMap((layer) => [layer.x, layer.x + layer.width / 2, layer.x + layer.width])
    const yTargets = others.flatMap((layer) => [layer.y, layer.y + layer.height / 2, layer.y + layer.height])
    const snappedX = snapAxis(rawX, primary.width, xTargets)
    const snappedY = snapAxis(rawY, primary.height, yTargets)
    const deltaX = snappedX.position - primaryOrigin.x
    const deltaY = snappedY.position - primaryOrigin.y
    setGuides({ x: snappedX.guide, y: snappedY.guide })
    setLayers((items) => items.map((item) => {
      const origin = drag.origins[item.id]
      return origin ? { ...item, x: Math.round(origin.x + deltaX), y: Math.round(origin.y + deltaY) } : item
    }))
  }

  const endPointer = () => {
    dragRef.current = null
    setGuides({ x: null, y: null })
    setCursor(spacePressed ? 'grab' : 'default')
  }

  const updateSelected = (patch: Partial<ImageLayer>) => {
    if (!selectedId) return
    setLayers((items) => items.map((layer) => layer.id === selectedId ? { ...layer, ...patch } : layer))
  }

  const applyCrop = () => {
    if (!selected || cropDraft.width < .01 || cropDraft.height < .01) {
      setNotice('请在图片上拖出有效的裁剪区域')
      return
    }
    const nextCrop = {
      x: selected.crop.x + selected.crop.width * cropDraft.x,
      y: selected.crop.y + selected.crop.height * cropDraft.y,
      width: selected.crop.width * cropDraft.width,
      height: selected.crop.height * cropDraft.height,
    }
    updateSelected({
      x: selected.x + selected.width * cropDraft.x,
      y: selected.y + selected.height * cropDraft.y,
      width: selected.width * cropDraft.width,
      height: selected.height * cropDraft.height,
      crop: nextCrop,
    })
    setCropMode(false)
    setCropDraft({ x: 0, y: 0, width: 1, height: 1 })
    setNotice('裁剪完成，源图像素没有改变')
  }

  const readClipboard = async () => {
    try {
      const items = await navigator.clipboard.read()
      const files: File[] = []
      for (const item of items) for (const type of item.types.filter((value) => value.startsWith('image/'))) {
        const blob = await item.getType(type)
        files.push(new File([blob], `clipboard-${Date.now()}.png`, { type }))
      }
      await loadFiles(files)
    } catch {
      setNotice('浏览器没有剪贴板读取权限，请使用 ⌘V / Ctrl+V')
    }
  }

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) void loadFiles(event.target.files)
    event.target.value = ''
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragActive(false)
    void loadFiles(event.dataTransfer.files)
  }

  const reorder = (direction: 'front' | 'back') => {
    if (!selectedId) return
    setLayers((items) => {
      const layer = items.find((item) => item.id === selectedId)
      if (!layer) return items
      const rest = items.filter((item) => item.id !== selectedId)
      return direction === 'front' ? [...rest, layer] : [layer, ...rest]
    })
  }

  const onWheel = useCallback((event: WheelEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (event.ctrlKey || event.metaKey) {
      const viewport = viewportRef.current
      if (!viewport) return
      const rect = viewport.getBoundingClientRect()
      const pointerX = event.clientX - rect.left - rect.width / 2
      const pointerY = event.clientY - rect.top - rect.height / 2
      const currentScale = zoom / 100
      const nextZoom = clamp(zoom + (event.deltaY < 0 ? 8 : -8), 5, 800)
      const nextScale = nextZoom / 100
      setPan((current) => {
        const worldX = (pointerX - current.x) / currentScale
        const worldY = (pointerY - current.y) / currentScale
        return { x: pointerX - worldX * nextScale, y: pointerY - worldY * nextScale }
      })
      setZoom(nextZoom)
    } else {
      setPan((current) => ({ x: current.x - event.deltaX, y: current.y - event.deltaY }))
    }
  }, [zoom])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    viewport.addEventListener('wheel', onWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', onWheel)
  }, [onWheel])

  const selectLayer = (id: string, additive: boolean) => {
    setSelectedIds((ids) => additive ? (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]) : [id])
    setCropMode(false)
  }

  return (
    <div className={`image-studio ${dragActive ? 'is-dragging' : ''}`} onDragEnter={(event) => { event.preventDefault(); setDragActive(true) }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (event.currentTarget === event.target) setDragActive(false) }} onDrop={handleDrop}>
      <input ref={fileInputRef} className="visually-hidden" type="file" accept="image/*" multiple onChange={handleFiles} />
      <div className="image-toolbar">
        <div className="toolbar-group">
          <button className="primary-action" onClick={() => fileInputRef.current?.click()}><ImagePlus size={16} />添加图片</button>
          <button onClick={() => void readClipboard()}><ClipboardPaste size={16} />读取剪贴板</button>
          <button disabled={!layers.length} onClick={() => { const ids = layers.map((layer) => layer.id); setSelectedIds(ids); void copyPng(ids) }} title="全选并复制透明 PNG"><Copy size={16} />全选复制</button>
        </div>
        <div className="toolbar-group zoom-controls">
          <button aria-label="缩小画布" onClick={() => changeZoom((value) => value - 10)}><ZoomOut size={15} /></button>
          <input aria-label="画布缩放" type="range" min="5" max="800" value={zoom} onChange={(event) => changeZoom(Number(event.target.value))} />
          <button aria-label="放大画布" onClick={() => changeZoom((value) => value + 10)}><ZoomIn size={15} /></button>
          <button className="zoom-value" onClick={fitContent} title="适应所选内容（快捷键 0）">{zoom}%</button>
        </div>
        <button className="export-action" disabled={!layers.length} onClick={() => void exportPng()}><Download size={16} />{selectedIds.length ? `导出所选 ${selectedIds.length}` : '导出全部'}</button>
      </div>

      <div className="studio-body">
        <div
          ref={viewportRef}
          className={`canvas-viewport ${spacePressed ? 'is-hand-tool' : ''}`}
          style={{ backgroundPosition: `${pan.x}px ${pan.y}px`, backgroundSize: `${Math.max(8, 22 * zoom / 100)}px ${Math.max(8, 22 * zoom / 100)}px` }}
        >
          <canvas
            ref={canvasRef}
            width={Math.round(viewportSize.width * deviceScale)}
            height={Math.round(viewportSize.height * deviceScale)}
            style={{ cursor }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
            onDoubleClick={() => { if (selected && selectedIds.length === 1) { setCropMode(true); setCropDraft({ x: 0, y: 0, width: 1, height: 1 }) } }}
          />
          <div className="viewport-hint"><Hand size={13} />拖动空白处移动画布</div>
          {!layers.length && <button className="canvas-empty" onClick={() => fileInputRef.current?.click()}><Upload size={28} /><strong>把图片拖进来，也可以粘贴或选择文件</strong><span>按原始尺寸载入，可放在工作区任意位置</span></button>}
        </div>

        <aside className="image-inspector">
          <div className="inspector-heading"><Layers size={15} /><span>图层</span><small>{selectedIds.length ? `已选 ${selectedIds.length} / ${layers.length}` : layers.length}</small></div>
          <div className="layer-list">
            {[...layers].reverse().map((layer) => <button key={layer.id} className={selectedIds.includes(layer.id) ? 'active' : ''} onClick={(event) => selectLayer(layer.id, event.shiftKey || event.metaKey || event.ctrlKey)}><span className="layer-thumb"><img src={layer.image.src} alt="" /></span><span><strong>{layer.name}</strong><small>{Math.round(layer.width)} × {Math.round(layer.height)}</small></span></button>)}
            {!layers.length && <p>添加图片后会显示在这里</p>}
          </div>

          {selected && <div className="selection-controls">
            <div className="inspector-heading"><Move size={15} /><span>{selectedIds.length > 1 ? `已选 ${selectedIds.length} 张` : '所选图片'}</span></div>
            {selectedIds.length === 1 && <div className="property-grid">
              <label>X<input type="number" value={Math.round(selected.x)} onChange={(event) => updateSelected({ x: Number(event.target.value) })} /></label>
              <label>Y<input type="number" value={Math.round(selected.y)} onChange={(event) => updateSelected({ y: Number(event.target.value) })} /></label>
              <label>宽<input type="number" min="1" value={Math.round(selected.width)} onChange={(event) => updateSelected({ width: Math.max(1, Number(event.target.value)) })} /></label>
              <label>高<input type="number" min="1" value={Math.round(selected.height)} onChange={(event) => updateSelected({ height: Math.max(1, Number(event.target.value)) })} /></label>
            </div>}
            <div className="inspector-actions">
              {selectedIds.length === 1 && (!cropMode ? <button onClick={() => { setCropMode(true); setCropDraft({ x: .08, y: .08, width: .84, height: .84 }); setNotice('拖动裁剪框可移动，拖动边缘或角点可调整大小') }}><Crop size={15} />裁剪</button> : <><button className="confirm-crop" onClick={applyCrop}><Crop size={15} />应用裁剪</button><button onClick={() => { setCropMode(false); setCropDraft({ x: 0, y: 0, width: 1, height: 1 }) }}><RotateCcw size={15} />取消</button></>)}
              <button onClick={() => void copyPng(selectedIds)}><Copy size={15} />复制所选</button>
              {selectedIds.length === 1 && <><button onClick={() => reorder('front')}><Maximize2 size={15} />置于顶层</button><button onClick={() => reorder('back')}><Layers size={15} />置于底层</button></>}
              <button className="danger-action" onClick={() => { setLayers((items) => items.filter((layer) => !selectedIds.includes(layer.id))); setSelectedIds([]); setCropMode(false) }}><Trash2 size={15} />删除所选</button>
            </div>
          </div>}
        </aside>
      </div>

      <div className="studio-status"><span>{notice}</span><span>⌘A 全选 · ⌘C 复制 PNG · 空格拖拽 · + / − 缩放 · 0 适应所选</span></div>
      {dragActive && <div className="drop-overlay"><Upload size={34} /><strong>松开添加图片</strong></div>}
    </div>
  )
}
