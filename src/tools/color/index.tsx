import { useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { CopyButton } from '../shared/EditorPanel'

type Hsva = { h: number; s: number; v: number; a: number }
type Rgb = { r: number; g: number; b: number }

function hsvaToRgb({ h, s, v }: Hsva): Rgb {
  const chroma = v * s
  const x = chroma * (1 - Math.abs((h / 60) % 2 - 1))
  const match = v - chroma
  const [r, g, b] = h < 60 ? [chroma, x, 0] : h < 120 ? [x, chroma, 0] : h < 180 ? [0, chroma, x] : h < 240 ? [0, x, chroma] : h < 300 ? [x, 0, chroma] : [chroma, 0, x]
  return { r: Math.round((r + match) * 255), g: Math.round((g + match) * 255), b: Math.round((b + match) * 255) }
}

function rgbToHsva({ r, g, b }: Rgb, a = 1): Hsva {
  const red = r / 255; const green = g / 255; const blue = b / 255
  const max = Math.max(red, green, blue); const min = Math.min(red, green, blue); const delta = max - min
  let h = 0
  if (delta) h = max === red ? 60 * (((green - blue) / delta) % 6) : max === green ? 60 * ((blue - red) / delta + 2) : 60 * ((red - green) / delta + 4)
  if (h < 0) h += 360
  return { h, s: max === 0 ? 0 : delta / max, v: max, a }
}

function parseHex(value: string): { rgb: Rgb; a: number } | null {
  const clean = value.trim().replace(/^#/, '')
  const expanded = clean.length === 3 || clean.length === 4 ? clean.split('').map((char) => char + char).join('') : clean
  if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(expanded)) return null
  return { rgb: { r: parseInt(expanded.slice(0, 2), 16), g: parseInt(expanded.slice(2, 4), 16), b: parseInt(expanded.slice(4, 6), 16) }, a: expanded.length === 8 ? parseInt(expanded.slice(6, 8), 16) / 255 : 1 }
}

function toHex(rgb: Rgb, alpha: number) {
  const hex = [rgb.r, rgb.g, rgb.b].map((value) => value.toString(16).padStart(2, '0')).join('').toUpperCase()
  return alpha < 1 ? `#${hex}${Math.round(alpha * 255).toString(16).padStart(2, '0').toUpperCase()}` : `#${hex}`
}

function ColorToolPage() {
  const [color, setColor] = useState<Hsva>({ h: 80, s: 0.62, v: 0.95, a: 1 })
  const [hexInput, setHexInput] = useState('#B8F35D')
  const rgb = hsvaToRgb(color)
  const solid = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
  const rgba = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Number(color.a.toFixed(2))})`
  const hsl = (() => {
    const max = Math.max(rgb.r, rgb.g, rgb.b) / 255; const min = Math.min(rgb.r, rgb.g, rgb.b) / 255; const lightness = (max + min) / 2; const delta = max - min
    const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1))
    return { h: color.h, s: saturation, l: lightness }
  })()
  const values = [
    { label: 'HEX', value: toHex(rgb, color.a) },
    { label: 'RGB', value: color.a < 1 ? rgba : solid },
    { label: 'HSL', value: `${color.a < 1 ? 'hsla' : 'hsl'}(${Math.round(hsl.h)}, ${Math.round(hsl.s * 100)}%, ${Math.round(hsl.l * 100)}%${color.a < 1 ? `, ${Number(color.a.toFixed(2))}` : ''})` },
  ]
  const updateFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const s = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    const v = Math.max(0, Math.min(1, 1 - (event.clientY - rect.top) / rect.height))
    const next = { ...color, s, v }
    setColor(next); setHexInput(toHex(hsvaToRgb(next), next.a))
  }
  const startPicking = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    updateFromPointer(event)
  }
  const updateHue = (h: number) => { const next = { ...color, h }; setColor(next); setHexInput(toHex(hsvaToRgb(next), next.a)) }
  const updateAlpha = (a: number) => { const next = { ...color, a }; setColor(next); setHexInput(toHex(rgb, a)) }
  const updateHex = (value: string) => {
    setHexInput(value)
    const parsed = parseHex(value)
    if (parsed) setColor(rgbToHsva(parsed.rgb, parsed.a))
  }

  return <div className="color-layout">
    <div className="color-stage">
      <div className="color-picker">
        <div className="saturation-panel" style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${color.h} 100% 50%))` }} onPointerDown={startPicking} onPointerMove={(event) => event.currentTarget.hasPointerCapture(event.pointerId) && updateFromPointer(event)} aria-label="饱和度和明度色盘" role="slider" tabIndex={0} aria-valuetext={`色相 ${Math.round(color.h)}，饱和度 ${Math.round(color.s * 100)}%，明度 ${Math.round(color.v * 100)}%`}><i style={{ left: `${color.s * 100}%`, top: `${(1 - color.v) * 100}%` }} /></div>
        <label className="color-control hue-control"><span><span>色相</span><b>{Math.round(color.h)}°</b></span><input type="range" min="0" max="360" value={color.h} onChange={(event) => updateHue(Number(event.target.value))} /></label>
        <label className="color-control alpha-control" style={{ '--color-solid': solid } as CSSProperties}><span><span>透明度</span><b>{Math.round(color.a * 100)}%</b></span><input type="range" min="0" max="1" step="0.01" value={color.a} onChange={(event) => updateAlpha(Number(event.target.value))} /></label>
        <div className="color-swatch"><span style={{ background: rgba }} /></div>
      </div>
    </div>
    <div className="color-values">
      <label>颜色值<input value={hexInput} onChange={(event) => updateHex(event.target.value)} maxLength={9} spellCheck={false} aria-label="HEX 颜色值" /><small>支持 #RGB、#RGBA、#RRGGBB、#RRGGBBAA</small></label>
      {values.map((item) => <div key={item.label}><span>{item.label}</span><code>{item.value}</code><CopyButton value={item.value} /></div>)}
    </div>
  </div>
}

export default ColorToolPage
