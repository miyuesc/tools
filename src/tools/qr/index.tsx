import QRCode from 'qrcode'
import { Check, Copy, Download, ImagePlus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type LogoMode = 'none' | 'default' | 'upload'

const defaultLogo = `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="24" fill="#111412"/><circle cx="50" cy="50" r="28" fill="none" stroke="#b8f35d" stroke-width="8"/><circle cx="50" cy="50" r="8" fill="#b8f35d"/></svg>')}`

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('中心图片无法读取'))
    image.src = source
  })
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, size: number, radius: number) {
  context.beginPath()
  context.roundRect(x, y, size, size, radius)
}

export default function QrCodePage() {
  const [text, setText] = useState('https://lumen.tools')
  const [size, setSize] = useState(360)
  const [margin, setMargin] = useState(3)
  const [foreground, setForeground] = useState('#111412')
  const [background, setBackground] = useState('#ffffff')
  const [logoMode, setLogoMode] = useState<LogoMode>('default')
  const [uploadedLogo, setUploadedLogo] = useState('')
  const [logoMask, setLogoMask] = useState(true)
  const [logoBorder, setLogoBorder] = useState(true)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let cancelled = false
    const render = async () => {
      const canvas = canvasRef.current
      if (!canvas || !text.trim()) { setReady(false); return }
      try {
        await QRCode.toCanvas(canvas, text, { width: size, margin, errorCorrectionLevel: 'H', color: { dark: foreground, light: background } })
        const source = logoMode === 'default' ? defaultLogo : logoMode === 'upload' ? uploadedLogo : ''
        if (source) {
          const image = await loadImage(source)
          if (cancelled) return
          const context = canvas.getContext('2d')
          if (!context) throw new Error('浏览器无法绘制二维码')
          const logoSize = Math.round(size * .22)
          const padding = logoMask ? Math.round(size * .025) : 0
          const boxSize = logoSize + padding * 2
          const x = Math.round((size - boxSize) / 2)
          const y = x
          if (logoMask) { roundedRect(context, x, y, boxSize, Math.round(boxSize * .18)); context.fillStyle = background; context.fill() }
          if (logoBorder) { roundedRect(context, x, y, boxSize, Math.round(boxSize * .18)); context.strokeStyle = foreground; context.lineWidth = Math.max(2, Math.round(size * .008)); context.stroke() }
          context.save(); roundedRect(context, x + padding, y + padding, logoSize, Math.round(logoSize * .16)); context.clip(); context.drawImage(image, x + padding, y + padding, logoSize, logoSize); context.restore()
        }
        if (!cancelled) { setReady(true); setError('') }
      } catch (cause) {
        if (!cancelled) { setReady(false); setError(cause instanceof Error ? cause.message : '二维码生成失败') }
      }
    }
    const timer = window.setTimeout(() => void render(), 120)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [background, foreground, logoBorder, logoMask, logoMode, margin, size, text, uploadedLogo])

  const handleLogo = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) { setError('请选择 5 MB 以内的图片文件'); return }
    const reader = new FileReader()
    reader.onload = () => { setUploadedLogo(String(reader.result)); setLogoMode('upload') }
    reader.readAsDataURL(file)
  }
  const download = () => {
    const anchor = document.createElement('a'); anchor.href = canvasRef.current?.toDataURL('image/png') || ''; anchor.download = `qrcode-${size}.png`; anchor.click()
  }
  const copy = async () => {
    const blob = await new Promise<Blob | null>((resolve) => canvasRef.current?.toBlob(resolve, 'image/png'))
    if (!blob || !navigator.clipboard?.write) throw new Error('当前浏览器不支持复制图片')
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
  }

  return <div className="qr-tool">
    <div className="qr-controls">
      <label className="qr-content">二维码内容<textarea value={text} onChange={(event) => setText(event.target.value)} /></label>
      <label>尺寸<input type="number" min="160" max="1024" value={size} onChange={(event) => setSize(Math.max(160, Math.min(1024, Number(event.target.value))))} /></label>
      <label>留白<input type="range" min="0" max="8" value={margin} onChange={(event) => setMargin(Number(event.target.value))} /><code>{margin}</code></label>
      <label>色块颜色<span className="color-input"><input type="color" value={foreground} onChange={(event) => setForeground(event.target.value)} /><code>{foreground}</code></span></label>
      <label>背景颜色<span className="color-input"><input type="color" value={background} onChange={(event) => setBackground(event.target.value)} /><code>{background}</code></span></label>
      <label>中心图片<select value={logoMode} onChange={(event) => setLogoMode(event.target.value as LogoMode)}><option value="none">不使用</option><option value="default">默认图标</option><option value="upload" disabled={!uploadedLogo}>上传图片</option></select></label>
      <label className="qr-upload"><ImagePlus size={15} />上传图片<input type="file" accept="image/*" onChange={(event) => handleLogo(event.target.files?.[0])} /></label>
      <label className="toolbar-check"><input type="checkbox" checked={logoMask} onChange={(event) => setLogoMask(event.target.checked)} />图片色块遮罩</label>
      <label className="toolbar-check"><input type="checkbox" checked={logoBorder} onChange={(event) => setLogoBorder(event.target.checked)} />图片边框</label>
    </div>
    <div className="qr-preview"><canvas ref={canvasRef} aria-label="二维码预览" /><span>{size} × {size} PNG</span></div>
    <div className="workspace-toolbar qr-actions"><button className="primary-action" disabled={!ready} onClick={download}><Download size={15} />下载 PNG</button><button disabled={!ready} onClick={() => void copy().catch((cause) => setError(cause instanceof Error ? cause.message : '复制失败'))}><Copy size={15} />复制图片</button><span className="toolbar-hint">高容错级别 H · 所有处理均在浏览器完成</span></div>
    <div className={`status-line ${error ? 'error' : ''}`}>{error || <><Check size={15} />调整内容、颜色和中心图片后自动刷新</>}</div>
  </div>
}
