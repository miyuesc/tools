import { ImagePlus, Minus, Plus, RotateCcw } from 'lucide-react'
import { useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { ColorField, NumberField, RangeField, ResultPanel, Segments, SelectField, hexChannels, rgba } from './shared'

const TYPE_RATIOS = [
  { label: 'Minor third', value: 1.2 },
  { label: 'Major third', value: 1.25 },
  { label: 'Perfect fourth', value: 1.333 },
  { label: 'Augmented fourth', value: 1.414 },
  { label: 'Golden ratio', value: 1.618 },
]
const TYPE_STEPS = [
  { name: '--text-xs', exp: -2, sample: 'caption / label' },
  { name: '--text-sm', exp: -1, sample: 'small body text' },
  { name: '--text-base', exp: 0, sample: 'body text' },
  { name: '--text-lg', exp: 1, sample: 'large body' },
  { name: '--text-xl', exp: 2, sample: 'subheading' },
  { name: '--text-2xl', exp: 3, sample: 'heading' },
  { name: '--text-3xl', exp: 4, sample: 'display' },
  { name: '--text-4xl', exp: 5, sample: 'hero' },
]

function trim(value: number, precision = 4) {
  return Number(value.toFixed(precision)).toString()
}

export function FluidTypePage() {
  const [ratio, setRatio] = useState(1.25)
  const [minBase, setMinBase] = useState(16)
  const [maxBase, setMaxBase] = useState(20)
  const [fromWidth, setFromWidth] = useState(320)
  const [toWidth, setToWidth] = useState(960)
  const [measure, setMeasure] = useState(760)
  const [output, setOutput] = useState<'baked' | 'pow'>('baked')
  const [mode, setMode] = useState<'viewport' | 'container'>('viewport')
  const slope = (maxBase - minBase) / Math.max(1, toWidth - fromWidth)
  const intercept = minBase - slope * fromWidth
  const unit = mode === 'viewport' ? 'vw' : 'cqi'
  const fluidBase = `clamp(${trim(minBase / 16)}rem, ${trim(intercept / 16)}rem + ${trim(slope * 100)}${unit}, ${trim(maxBase / 16)}rem)`
  const previewBase = Math.min(maxBase, Math.max(minBase, intercept + slope * measure))
  const rows = TYPE_STEPS.map((step) => {
    const multiplier = ratio ** step.exp
    return { ...step, multiplier, min: minBase * multiplier, max: maxBase * multiplier, current: previewBase * multiplier }
  })
  const stepValue = (exp: number, multiplier: number) => exp === 0 ? 'var(--fluid-base)' : output === 'pow' ? `calc(var(--fluid-base) * pow(${trim(ratio, 3)}, ${exp}))` : `calc(var(--fluid-base) * ${trim(multiplier)})`
  const css = `${mode === 'container' ? '.type-container {\n  container-type: inline-size;\n}\n\n' : ''}:root {
  --ratio-reference: ${trim(ratio, 3)};
  --fluid-base: ${fluidBase};
${rows.map((row) => `  ${row.name.padEnd(12)}: ${stepValue(row.exp, row.multiplier)}; /* ${row.min.toFixed(1)}–${row.max.toFixed(1)}px */`).join('\n')}
}`

  return <div className="web-tool fluid-type-tool">
    <div className="web-studio-grid web-natural-grid">
      <aside className="web-controls">
        <div className="web-control-head"><span>MODULAR SCALE</span><button onClick={() => { setRatio(1.25); setMinBase(16); setMaxBase(20); setFromWidth(320); setToWidth(960) }}><RotateCcw size={13} />重置</button></div>
        <div className="ratio-presets">{TYPE_RATIOS.map((item) => <button key={item.value} className={ratio === item.value ? 'active' : ''} onClick={() => setRatio(item.value)}><strong>{item.value}</strong><span>{item.label}</span></button>)}</div>
        <NumberField label="自定义比例" value={ratio} min={1.01} max={4} step={0.001} onChange={setRatio} />
        <Segments value={output} options={[{ value: 'baked', label: 'Baked 兼容' }, { value: 'pow', label: 'pow()' }]} onChange={setOutput} />
        <div className="web-field-pair"><NumberField label="窄屏基准" value={minBase} min={8} max={80} unit="px" onChange={(value) => setMinBase(Math.min(value, maxBase))} /><NumberField label="宽屏基准" value={maxBase} min={8} max={100} unit="px" onChange={(value) => setMaxBase(Math.max(value, minBase))} /></div>
        <div className="web-field-pair"><NumberField label="起始宽度" value={fromWidth} min={240} max={1800} unit="px" onChange={(value) => setFromWidth(Math.min(value, toWidth - 1))} /><NumberField label="结束宽度" value={toWidth} min={320} max={2600} unit="px" onChange={(value) => setToWidth(Math.max(value, fromWidth + 1))} /></div>
        <Segments value={mode} options={[{ value: 'viewport', label: 'Viewport · vw' }, { value: 'container', label: 'Container · cqi' }]} onChange={setMode} />
      </aside>
      <section className="type-scale-preview">
        <div className="web-preview-static"><span>TYPE SCALE</span><code>{measure}px · base {previewBase.toFixed(1)}px</code></div>
        <RangeField label="预览宽度" value={measure} min={fromWidth} max={toWidth} unit="px" onChange={setMeasure} />
        <div className="type-scale-list">{rows.map((row) => <div key={row.name}><span><code>{row.name}</code><small>{row.min.toFixed(1)}–{row.max.toFixed(1)}px · {row.sample}</small></span><strong style={{ fontSize: `${Math.min(row.current, 76)}px` }}>Ag</strong><em>{row.current.toFixed(1)}px</em></div>)}</div>
      </section>
    </div>
    <ResultPanel title="完整 CSS 比例尺" value={css} note={`8 个字号 · ${mode === 'viewport' ? '视口流体' : '容器流体'} · ${output}`} />
  </div>
}

type EaseName = 'linear' | 'ease-in-quad' | 'ease-out-quad' | 'ease-in-cubic' | 'ease-out-cubic' | 'ease-in-out-cubic' | 'ease-in-sine' | 'ease-out-sine' | 'ease-in-out-sine' | 'ease-in-quint' | 'ease-out-quint' | 'ease-in-expo' | 'ease-out-expo'
type ColorSpace = 'srgb' | 'oklch' | 'hsl' | 'lab' | 'lch'
type GradientKind = 'linear' | 'radial' | 'conic'
type GradientStop = { id: number; color: string; alpha: number; position: number }
const EASING: Record<EaseName, (value: number) => number> = {
  linear: (t) => t,
  'ease-in-quad': (t) => t * t,
  'ease-out-quad': (t) => 1 - (1 - t) ** 2,
  'ease-in-cubic': (t) => t ** 3,
  'ease-out-cubic': (t) => 1 - (1 - t) ** 3,
  'ease-in-out-cubic': (t) => t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2,
  'ease-in-sine': (t) => 1 - Math.cos(t * Math.PI / 2),
  'ease-out-sine': (t) => Math.sin(t * Math.PI / 2),
  'ease-in-out-sine': (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  'ease-in-quint': (t) => t ** 5,
  'ease-out-quint': (t) => 1 - (1 - t) ** 5,
  'ease-in-expo': (t) => t === 0 ? 0 : 2 ** (10 * t - 10),
  'ease-out-expo': (t) => t === 1 ? 1 : 1 - 2 ** (-10 * t),
}
const DIRECTIONS = [{ label: '↑', angle: 0 }, { label: '↗', angle: 45 }, { label: '→', angle: 90 }, { label: '↘', angle: 135 }, { label: '↓', angle: 180 }, { label: '↙', angle: 225 }, { label: '←', angle: 270 }, { label: '↖', angle: 315 }]

function mixedRgb(from: string, to: string, fromAlpha: number, toAlpha: number, amount: number) {
  const a = hexChannels(from)
  const b = hexChannels(to)
  const channels = a.map((channel, index) => Math.round(channel + (b[index] - channel) * amount))
  return `rgb(${channels.join(' ')} / ${trim(fromAlpha + (toAlpha - fromAlpha) * amount, 3)})`
}

export function EasedGradientPage() {
  const [kind, setKind] = useState<GradientKind>('linear')
  const [stops, setStops] = useState<GradientStop[]>([
    { id: 1, color: '#ff4d8d', alpha: 1, position: 0 },
    { id: 2, color: '#ffb347', alpha: .95, position: 46 },
    { id: 3, color: '#6c5cff', alpha: 1, position: 100 },
  ])
  const [selectedId, setSelectedId] = useState(2)
  const [angle, setAngle] = useState(135)
  const [steps, setSteps] = useState(5)
  const [ease, setEase] = useState<EaseName>('ease-in-out-cubic')
  const [space, setSpace] = useState<ColorSpace>('oklch')
  const [radialShape, setRadialShape] = useState<'circle' | 'ellipse'>('ellipse')
  const [radialSize, setRadialSize] = useState('farthest-corner')
  const [origin, setOrigin] = useState<[number, number]>([50, 50])
  const [image, setImage] = useState<string | null>(null)
  const [knots, setKnots] = useState([{ x: 20, y: 25 }, { x: 82, y: 74 }])
  const [dragging, setDragging] = useState<number | null>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const nextId = useRef(4)
  const sortedStops = useMemo(() => [...stops].sort((a, b) => a.position - b.position), [stops])
  const selected = stops.find((stop) => stop.id === selectedId) || stops[0]
  const interpolation = space === 'srgb' || space === 'lab' ? space : `${space} shorter hue`
  const stopData = useMemo(() => sortedStops.flatMap((from, segmentIndex) => {
    const to = sortedStops[segmentIndex + 1]
    if (!to) return []
    return Array.from({ length: steps }, (_, index) => {
      if (segmentIndex > 0 && index === 0) return null
      const progress = index / (steps - 1)
      const amount = EASING[ease](progress)
      const fromCss = rgba(from.color, from.alpha)
      const toCss = rgba(to.color, to.alpha)
      const color = space === 'srgb' ? mixedRgb(from.color, to.color, from.alpha, to.alpha, amount) : `color-mix(in ${interpolation}, ${fromCss} ${trim((1 - amount) * 100, 2)}%, ${toCss} ${trim(amount * 100, 2)}%)`
      return { color, position: trim(from.position + (to.position - from.position) * progress, 2), manual: index === 0 || index === steps - 1 }
    }).filter(Boolean)
  }) as Array<{ color: string; position: string; manual: boolean }>, [ease, interpolation, sortedStops, space, steps])
  const gradientHead = kind === 'linear'
    ? `${angle}deg in ${interpolation}`
    : kind === 'radial'
      ? `${radialShape} ${radialSize} at ${origin[0]}% ${origin[1]}% in ${interpolation}`
      : `from ${angle}deg at ${origin[0]}% ${origin[1]}% in ${interpolation}`
  const gradient = `${kind}-gradient(${gradientHead},\n    ${stopData.map((stop) => `${stop.color} ${stop.position}%`).join(',\n    ')})`
  const css = `:root {
${sortedStops.map((stop, index) => `  --gradient-stop-${index + 1}: ${rgba(stop.color, stop.alpha)};`).join('\n')}
  --eased-gradient: ${gradient};
}

.gradient {
  background: var(--eased-gradient);
}`
  const updateStop = <K extends keyof GradientStop>(key: K, value: GradientStop[K]) => setStops((items) => items.map((stop) => stop.id === selected.id ? { ...stop, [key]: value } : stop))
  const addStop = () => {
    const index = sortedStops.findIndex((stop) => stop.id === selected.id)
    const left = index === sortedStops.length - 1 ? sortedStops[index - 1] : sortedStops[index]
    const right = index === sortedStops.length - 1 ? sortedStops[index] : sortedStops[index + 1]
    const position = Number(((left.position + right.position) / 2).toFixed(1))
    const id = nextId.current++
    const color = left.color
    setStops((items) => [...items, { id, color, alpha: (left.alpha + right.alpha) / 2, position }])
    setSelectedId(id)
  }
  const removeStop = (id = selected.id) => {
    if (stops.length <= 2) return
    const index = sortedStops.findIndex((stop) => stop.id === id)
    const fallback = sortedStops[Math.max(0, index - 1)]
    setStops((items) => items.filter((stop) => stop.id !== id))
    if (selectedId === id) setSelectedId(fallback.id)
  }
  const sampleImage = (index: number, x: number, y: number) => {
    const img = imageRef.current
    if (!img?.naturalWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const context = canvas.getContext('2d', { willReadFrequently: true })
    context?.drawImage(img, 0, 0)
    const pixel = context?.getImageData(Math.min(canvas.width - 1, Math.round(x / 100 * canvas.width)), Math.min(canvas.height - 1, Math.round(y / 100 * canvas.height)), 1, 1).data
    if (!pixel) return
    const hex = `#${[pixel[0], pixel[1], pixel[2]].map((value) => value.toString(16).padStart(2, '0')).join('')}`
    const target = index === 0 ? sortedStops[0] : sortedStops.at(-1)!
    setStops((items) => items.map((stop) => stop.id === target.id ? { ...stop, color: hex, alpha: Number((pixel[3] / 255).toFixed(2)) } : stop))
  }
  const moveKnot = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragging === null) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const point = { x: Math.max(0, Math.min(100, (event.clientX - bounds.left) / bounds.width * 100)), y: Math.max(0, Math.min(100, (event.clientY - bounds.top) / bounds.height * 100)) }
    setKnots((items) => items.map((item, index) => index === dragging ? point : item))
    sampleImage(dragging, point.x, point.y)
  }
  const loadImage = (file?: File) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImage(String(reader.result))
    reader.readAsDataURL(file)
  }

  return <div className="web-tool gradient-tool">
    <div className="web-studio-grid web-natural-grid">
      <aside className="web-controls">
        <div className="web-control-head"><span>GRADIENT GEOMETRY</span><small>{sortedStops.length} colors</small></div>
        <Segments value={kind} options={[{ value: 'linear', label: '线性' }, { value: 'radial', label: '径向' }, { value: 'conic', label: '锥形' }]} onChange={setKind} />
        <SelectField label="颜色空间" value={space} onChange={(value) => setSpace(value as ColorSpace)}>{['srgb', 'oklch', 'hsl', 'lab', 'lch'].map((value) => <option key={value}>{value}</option>)}</SelectField>
        <SelectField label="缓动函数" value={ease} onChange={(value) => setEase(value as EaseName)}>{Object.keys(EASING).map((value) => <option key={value}>{value}</option>)}</SelectField>
        <RangeField label="每段缓动色阶" value={steps} min={2} max={12} onChange={setSteps} />
        {kind === 'linear' && <div className="gradient-directions">{DIRECTIONS.map((item) => <button key={item.angle} className={angle === item.angle ? 'active' : ''} onClick={() => setAngle(item.angle)}>{item.label}<small>{item.angle}°</small></button>)}</div>}
        {kind !== 'radial' && <NumberField label={kind === 'linear' ? '任意角度' : '起始角度'} value={angle} min={0} max={360} unit="°" onChange={setAngle} />}
        {kind === 'radial' && <><Segments value={radialShape} options={[{ value: 'ellipse', label: '椭圆' }, { value: 'circle', label: '圆形' }]} onChange={setRadialShape} /><SelectField label="径向范围" value={radialSize} onChange={setRadialSize}>{['closest-side', 'closest-corner', 'farthest-side', 'farthest-corner'].map((value) => <option key={value}>{value}</option>)}</SelectField></>}
        {kind !== 'linear' && <div className="web-field-pair"><RangeField label="中心 X" value={origin[0]} min={0} max={100} unit="%" onChange={(value) => setOrigin([value, origin[1]])} /><RangeField label="中心 Y" value={origin[1]} min={0} max={100} unit="%" onChange={(value) => setOrigin([origin[0], value])} /></div>}
        <div className="control-divider"><span>SELECTED COLOR STOP</span></div>
        <ColorField label="颜色" value={selected.color} onChange={(value) => updateStop('color', value)} />
        <RangeField label="位置" value={selected.position} min={0} max={100} step={.5} unit="%" onChange={(value) => updateStop('position', value)} />
        <RangeField label="Alpha" value={selected.alpha} min={0} max={1} step={.01} onChange={(value) => updateStop('alpha', value)} />
        <div className="gradient-stop-actions"><button onClick={addStop}><Plus size={13} />插入中间色</button><button disabled={stops.length <= 2} onClick={() => removeStop()}><Minus size={13} />删除</button></div>
        <label className="gradient-upload"><ImagePlus size={15} /><span>{image ? '更换取色图片' : '从图片提取端点颜色'}</span><input type="file" accept="image/*" onChange={(event) => loadImage(event.target.files?.[0])} /></label>
      </aside>
      <section className="gradient-workspace">
        <div className="gradient-preview enhanced" style={{ backgroundImage: gradient }}><div className="web-preview-static"><span>LIVE {kind.toUpperCase()} GRADIENT</span><code>{space} · {ease}</code></div><div className="gradient-caption"><span>{stopData.length} GENERATED STOPS</span><strong>Multiple colours,<br />one continuous ramp.</strong></div></div>
        <div className="gradient-manual-stops"><header><span>COLOR STOPS</span><small>选择后可插入、移动或删除</small></header><div className="gradient-stop-track" style={{ backgroundImage: `${kind}-gradient(${kind === 'linear' ? '90deg' : kind === 'radial' ? 'circle at center' : 'from 0deg'}, ${sortedStops.map((stop) => `${rgba(stop.color, stop.alpha)} ${stop.position}%`).join(', ')})` }}>{sortedStops.map((stop, index) => <button key={stop.id} className={selected.id === stop.id ? 'active' : ''} style={{ left: `${stop.position}%`, '--stop-color': stop.color } as CSSProperties} onClick={() => setSelectedId(stop.id)} aria-label={`选择色标 ${index + 1}`} />)}</div><div className="gradient-stop-cards">{sortedStops.map((stop, index) => <button key={stop.id} className={selected.id === stop.id ? 'active' : ''} onClick={() => setSelectedId(stop.id)}><i style={{ background: rgba(stop.color, stop.alpha) }} /><span>Color {index + 1}</span><code>{stop.position}%</code>{stops.length > 2 && <b onClick={(event) => { event.stopPropagation(); removeStop(stop.id) }}><Minus size={11} /></b>}</button>)}</div></div>
        {image && <div className="gradient-image-sampler" onPointerMove={moveKnot} onPointerUp={() => setDragging(null)} onPointerLeave={() => setDragging(null)}><img ref={imageRef} src={image} alt="取色参考" onLoad={() => { sampleImage(0, knots[0].x, knots[0].y); sampleImage(1, knots[1].x, knots[1].y) }} />{knots.map((point, index) => <button key={index} style={{ left: `${point.x}%`, top: `${point.y}%`, background: index === 0 ? sortedStops[0].color : sortedStops.at(-1)?.color }} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setDragging(index) }}>{index + 1}</button>)}</div>}
        <div className="gradient-stop-table">{stopData.map((stop, index) => <div key={index}><i style={{ background: stop.color }} /><span>{stop.manual ? 'Key' : 'Mix'} {String(index + 1).padStart(2, '0')}</span><code>{stop.position}%</code><small>{stop.manual ? 'manual color' : ease}</small></div>)}</div>
      </section>
    </div>
    <ResultPanel title="格式化 CSS 变量" value={css} note={`${kind} · ${sortedStops.length} 个颜色 · ${space} · ${ease}`} />
  </div>
}
