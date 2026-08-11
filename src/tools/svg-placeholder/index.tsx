import { Download, Image as ImageIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CopyButton, EditorPanel } from '../shared/EditorPanel'

function escapeXml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min))
}

export default function SvgPlaceholderPage() {
  const [width, setWidth] = useState(640)
  const [height, setHeight] = useState(360)
  const [fontSize, setFontSize] = useState(28)
  const [text, setText] = useState('640 × 360')
  const [background, setBackground] = useState('#161a17')
  const [foreground, setForeground] = useState('#b8f35d')
  const [fontFamily, setFontFamily] = useState('ui-monospace, monospace')
  const svg = useMemo(() => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="${background}"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="${foreground}" font-family="${escapeXml(fontFamily)}" font-size="${fontSize}">${escapeXml(text)}</text>
</svg>`, [background, fontFamily, fontSize, foreground, height, text, width])
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

  const downloadPng = async () => {
    const image = new Image()
    image.src = dataUrl
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = width; canvas.height = height
    canvas.getContext('2d')?.drawImage(image, 0, 0)
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `placeholder-${width}x${height}.png`; anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 500)
    }, 'image/png')
  }

  return <div className="svg-placeholder-tool">
    <div className="form-grid svg-placeholder-controls">
      <label>宽度<input type="number" min="16" max="4096" value={width} onChange={(event) => setWidth(clamp(Number(event.target.value), 16, 4096))} /></label>
      <label>高度<input type="number" min="16" max="4096" value={height} onChange={(event) => setHeight(clamp(Number(event.target.value), 16, 4096))} /></label>
      <label>字号<input type="number" min="8" max="256" value={fontSize} onChange={(event) => setFontSize(clamp(Number(event.target.value), 8, 256))} /></label>
      <label>显示文本<input value={text} onChange={(event) => setText(event.target.value)} /></label>
      <label>背景色<span className="color-input"><input type="color" value={background} onChange={(event) => setBackground(event.target.value)} /><code>{background}</code></span></label>
      <label>文字色<span className="color-input"><input type="color" value={foreground} onChange={(event) => setForeground(event.target.value)} /><code>{foreground}</code></span></label>
      <label>字体<select value={fontFamily} onChange={(event) => setFontFamily(event.target.value)}><option value="ui-monospace, monospace">等宽字体</option><option value="system-ui, sans-serif">系统无衬线</option><option value="Georgia, serif">衬线字体</option></select></label>
    </div>
    <div className="svg-placeholder-preview"><img src={dataUrl} alt={`${width} × ${height} SVG 占位图预览`} /><span>{width} × {height}</span></div>
    <div className="workspace-toolbar svg-placeholder-actions"><CopyButton value={svg} /><a href={dataUrl} download={`placeholder-${width}x${height}.svg`}><Download size={15} />下载 SVG</a><button onClick={() => void downloadPng()}><ImageIcon size={15} />下载 PNG</button></div>
    <EditorPanel label="SVG 源码" value={svg} readOnly actions={<CopyButton value={svg} />} language="markup" wrapLongLines />
  </div>
}
