import { Dices, Minus, Pause, Play, Plus, RotateCcw } from 'lucide-react'
import { useMemo, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { ColorField, DownloadButton, NumberField, RangeField, ResultPanel, Segments, Toggle } from './shared'

type Point = { x: number; y: number }
const FREE_SHAPE: Point[] = [{ x: 8, y: 8 }, { x: 82, y: 4 }, { x: 96, y: 38 }, { x: 74, y: 88 }, { x: 24, y: 96 }, { x: 4, y: 60 }]

function radialPoints(count: number, radius: number, rotation: number) {
  return Array.from({ length: count }, (_, index) => {
    const angle = (rotation - 90 + index * 360 / count) * Math.PI / 180
    return { x: 50 + Math.cos(angle) * radius, y: 50 + Math.sin(angle) * radius }
  })
}

function polarPointExpression(point: Point, index: number, radial: boolean, rotation: number) {
  if (radial) {
    const step = index === 0 ? '0deg' : `calc(360deg / var(--count) * ${index})`
    const theta = `calc(var(--shape-a) + ${rotation - 90}deg + ${step})`
    return { x: `calc(50% + cos(${theta}) * var(--R))`, y: `calc(50% + sin(${theta}) * var(--R))` }
  }
  const dx = point.x - 50
  const dy = point.y - 50
  const distance = Math.hypot(dx, dy).toFixed(3)
  const angle = (Math.atan2(dy, dx) * 180 / Math.PI).toFixed(3)
  return { x: `calc(50% + cos(calc(var(--shape-a) + ${angle}deg)) * ${distance}%)`, y: `calc(50% + sin(calc(var(--shape-a) + ${angle}deg)) * ${distance}%)` }
}

function animatedShape(points: Point[], radial: boolean, rotation: number) {
  const expressions = points.map((point, index) => polarPointExpression(point, index, radial, rotation))
  const command = (point: { x: string; y: string }) => radial ? `arc to ${point.x} ${point.y} of var(--arc-r) large cw` : `line to ${point.x} ${point.y}`
  return `shape(\n  from ${expressions[0].x} ${expressions[0].y},\n${expressions.slice(1).map((point) => `  ${command(point)},`).join('\n')}\n  ${command(expressions[0])},\n  close\n)`
}

export function ShapeOutsidePage() {
  const [mode, setMode] = useState<'free' | 'radial'>('radial')
  const [freePoints, setFreePoints] = useState<Point[]>(FREE_SHAPE)
  const [count, setCount] = useState(9)
  const [radius, setRadius] = useState(44)
  const [rotation, setRotation] = useState(0)
  const [gap, setGap] = useState(18)
  const [side, setSide] = useState<'left' | 'right'>('left')
  const [animate, setAnimate] = useState(true)
  const [borderShape, setBorderShape] = useState(false)
  const [dragging, setDragging] = useState<number | null>(null)
  const points = mode === 'radial' ? radialPoints(count, radius, rotation) : freePoints
  const shape = animatedShape(points, mode === 'radial', rotation)
  const css = `@property --shape-a {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}

.shape {
  --count: ${points.length};
  --R: ${radius}%;
  --arc-r: calc(var(--R) * sin(180deg / var(--count)));
  --shape: ${shape.replace(/\n/g, '\n  ')};
  float: ${side};
  shape-outside: var(--shape);
  shape-margin: ${gap}px;
  clip-path: var(--shape);
  --point-count: ${points.length};
${borderShape ? '  border: 9px solid transparent;\n  border-shape: var(--shape);\n  background-clip: border-area;\n  background-origin: border-box;\n' : ''}${animate ? `  animation: shape-reflow ${Math.max(4, points.length * .8)}s ease-in-out infinite;\n` : ''}}
${animate ? '\n@keyframes shape-reflow {\n  to { --shape-a: 360deg; }\n}' : ''}`
  const movePoint = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (dragging === null || mode !== 'free') return
    const bounds = event.currentTarget.getBoundingClientRect()
    const point = { x: Math.max(0, Math.min(100, (event.clientX - bounds.left) / bounds.width * 100)), y: Math.max(0, Math.min(100, (event.clientY - bounds.top) / bounds.height * 100)) }
    setFreePoints((items) => items.map((item, index) => index === dragging ? point : item))
  }

  return <div className="web-tool shape-tool">
    <div className="web-inline-toolbar shape-toolbar">
      <Segments value={mode} options={[{ value: 'radial', label: '径向生成' }, { value: 'free', label: '自由节点' }]} onChange={setMode} />
      <Segments value={side} options={[{ value: 'left', label: '左浮动' }, { value: 'right', label: '右浮动' }]} onChange={setSide} />
      <Toggle label="真实 border-shape 边框" checked={borderShape} onChange={setBorderShape} />
      <button onClick={() => setAnimate((value) => !value)}>{animate ? <Pause size={14} /> : <Play size={14} />}{animate ? '暂停' : '动画'}</button>
      {mode === 'free' && <><button onClick={() => setFreePoints((items) => [...items, { x: 50, y: 50 }])}><Plus size={14} />节点</button><button disabled={freePoints.length <= 3} onClick={() => setFreePoints((items) => items.slice(0, -1))}><Minus size={14} />节点</button></>}
    </div>
    <div className="shape-grid shape-expanded-grid">
      <aside className="shape-settings">
        <div className="web-control-head"><span>{mode === 'radial' ? 'RADIAL PARAMETERS' : 'FREEFORM PARAMETERS'}</span><button onClick={() => { setFreePoints(FREE_SHAPE); setCount(9); setRadius(44); setRotation(0) }}><RotateCcw size={13} />重置</button></div>
        {mode === 'radial' && <><RangeField label="节点数量" value={count} min={3} max={20} onChange={setCount} /><RangeField label="半径" value={radius} min={20} max={49} unit="%" onChange={setRadius} /><RangeField label="旋转角" value={rotation} min={0} max={359} unit="°" onChange={setRotation} /></>}
        <RangeField label="文字间距" value={gap} min={0} max={60} unit="px" onChange={setGap} />
        <div className="shape-point-list">{points.map((point, index) => <div key={index}><span>{index + 1}</span><code>{point.x.toFixed(1)}%</code><code>{point.y.toFixed(1)}%</code></div>)}</div>
      </aside>
      <section className="shape-editor"><div className="web-preview-static"><span>{mode === 'free' ? 'DRAG POINTS' : 'GENERATED SHAPE'}</span><code>{points.length} nodes</code></div><svg viewBox="0 0 100 100" className={animate ? 'is-rotating' : ''} onPointerMove={movePoint} onPointerUp={() => setDragging(null)} onPointerLeave={() => setDragging(null)}><defs><pattern id="shape-grid-pattern" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth=".25" /></pattern></defs><rect width="100" height="100" fill="url(#shape-grid-pattern)" /><g className="shape-geometry"><polygon points={points.map(({ x, y }) => `${x},${y}`).join(' ')} /><polyline points={[...points, points[0]].map(({ x, y }) => `${x},${y}`).join(' ')} />{points.map((point, index) => <g key={index} onPointerDown={(event) => { if (mode === 'free') { event.currentTarget.setPointerCapture(event.pointerId); setDragging(index) } }}><circle cx={point.x} cy={point.y} r="2.8" /><text x={point.x + 3} y={point.y - 3}>{index + 1}</text></g>)}</g></svg></section>
      <section className="shape-copy"><div className="web-preview-static"><span>LIVE TEXT REFLOW</span><code>{borderShape ? 'border-shape + shape-outside' : 'shape-outside'}</code></div><article><div className={`shape-float shape-parametric ${animate ? 'is-reflowing' : ''} ${borderShape ? 'has-border-shape' : ''}`} style={{ '--shape-value': shape, '--count': points.length, '--R': `${radius}%`, '--arc-r': 'calc(var(--R) * sin(180deg / var(--count)))', float: side, clipPath: 'var(--shape-value)', shapeOutside: 'var(--shape-value)', shapeMargin: gap, borderShape: borderShape ? 'var(--shape-value)' : undefined } as CSSProperties} /><h3>文字边界正在参与动画。</h3><p>这里动画的是注册后的角度变量，而不是元素的 transform。形状每一帧都会重新计算，因此旁边的文字会像参考示例一样持续改变换行边界。</p><p>{borderShape ? '已应用真实 border-shape：透明边框沿 shape() 轮廓绘制，填充限制在 border-area。' : '打开 border-shape 后，轮廓会从实心形状切换为沿 shape() 绘制的边框。'}</p></article></section>
    </div>
    <ResultPanel title="完整 Shape CSS" value={css} note={`${mode === 'radial' ? '圆弧径向' : '自由折线'} · ${points.length} 节点 · 动态文字重排${borderShape ? ' · border-shape' : ''}`} />
  </div>
}

function seededRandom(seed: number) {
  let value = seed >>> 0
  return () => {
    value += 0x6D2B79F5
    let result = value
    result = Math.imul(result ^ result >>> 15, result | 1)
    result ^= result + Math.imul(result ^ result >>> 7, result | 61)
    return ((result ^ result >>> 14) >>> 0) / 4294967296
  }
}

type HudEdge = 'top' | 'right' | 'bottom' | 'left'
type HudFeature = { edge: HudEdge; mode: 'inset' | 'outset'; start: number; end: number; depth: number; points: Point[]; fill?: Point[] }

function hudPath(points: Point[], close = true) {
  return points.map((point, index) => `${index ? 'L' : 'M'} ${trimStroke(point.x)} ${trimStroke(point.y)}`).join(' ') + (close ? ' Z' : '')
}

function hudMarkup({ width, height, bevel, stroke, innerStroke, color, panelColor, glow, density, seed, fillOpacity, pad }: { width: number; height: number; bevel: number; stroke: number; innerStroke: number; color: string; panelColor: string; glow: number; density: number; seed: number; fillOpacity: number; pad: number }) {
  const random = seededRandom(seed)
  const integer = (min: number, max: number) => Math.floor(min + random() * (max - min + 1))
  const corner = () => random() < .25 ? 0 : integer(Math.max(10, Math.floor(bevel * .28)), bevel)
  const corners = { tl: corner(), tr: corner(), br: corner(), bl: corner() }
  const featureEdges = (['top', 'bottom', 'top', 'bottom', 'left', 'right'] as HudEdge[]).sort(() => random() - .5)
  const features: HudFeature[] = []
  const used = new Set<HudEdge>()
  for (const edge of featureEdges) {
    if (features.length >= density || used.has(edge)) continue
    used.add(edge)
    const horizontal = edge === 'top' || edge === 'bottom'
    const length = horizontal ? width : height
    const margins = edge === 'top' ? [corners.tl, corners.tr] : edge === 'bottom' ? [corners.bl, corners.br] : edge === 'left' ? [corners.tl, corners.bl] : [corners.tr, corners.br]
    const min = margins[0] + 18
    const max = length - margins[1] - 18
    const segmentLength = Math.max(44, Math.min(max - min, integer(Math.floor((max - min) * .34), Math.floor((max - min) * .76))))
    const start = integer(Math.floor(min), Math.max(Math.floor(min), Math.floor(max - segmentLength)))
    const end = start + segmentLength
    const depth = integer(6, Math.max(7, Math.min(18, Math.floor(segmentLength * .18))))
    const mode = random() < .58 ? 'inset' : 'outset'
    const direction = mode === 'inset' ? 1 : -1
    let points: Point[]
    if (edge === 'top') points = [{ x: start, y: 0 }, { x: start + depth, y: direction * depth }, { x: end - depth, y: direction * depth }, { x: end, y: 0 }]
    else if (edge === 'right') points = [{ x: width, y: start }, { x: width - direction * depth, y: start + depth }, { x: width - direction * depth, y: end - depth }, { x: width, y: end }]
    else if (edge === 'bottom') points = [{ x: end, y: height }, { x: end - depth, y: height - direction * depth }, { x: start + depth, y: height - direction * depth }, { x: start, y: height }]
    else points = [{ x: 0, y: end }, { x: direction * depth, y: end - depth }, { x: direction * depth, y: start + depth }, { x: 0, y: start }]
    const gap = 4
    const fill = mode === 'inset' && random() < .68 ? points.map((point, index) => ({ x: point.x + (edge === 'left' ? gap : edge === 'right' ? -gap : index < 2 ? gap : -gap), y: point.y + (edge === 'top' ? gap : edge === 'bottom' ? -gap : index < 2 ? -gap : gap) })) : undefined
    features.push({ edge, mode, start, end, depth, points, fill })
  }
  const feature = (edge: HudEdge) => features.find((item) => item.edge === edge)
  const outline: Point[] = [{ x: corners.tl, y: 0 }]
  const top = feature('top'); if (top) outline.push(...top.points); outline.push({ x: width - corners.tr, y: 0 }); if (corners.tr) outline.push({ x: width, y: corners.tr })
  const right = feature('right'); if (right) outline.push(...right.points); outline.push({ x: width, y: height - corners.br }); if (corners.br) outline.push({ x: width - corners.br, y: height })
  const bottom = feature('bottom'); if (bottom) outline.push(...bottom.points); outline.push({ x: corners.bl, y: height }); if (corners.bl) outline.push({ x: 0, y: height - corners.bl })
  const left = feature('left'); if (left) outline.push(...left.points); outline.push({ x: 0, y: corners.tl })
  const outlineD = hudPath(outline)
  const cornerTriangles = (Object.entries(corners) as Array<[keyof typeof corners, number]>).flatMap(([key, size]) => {
    if (random() > .55) return []
    const small = Math.max(10, size || integer(10, 20))
    const outer = size > 0
    const map: Record<keyof typeof corners, Point[]> = {
      tl: outer ? [{ x: -small, y: -4 }, { x: -4, y: -small }, { x: -small, y: -small }] : [{ x: 5, y: 5 + small }, { x: 5, y: 5 }, { x: 5 + small, y: 5 }],
      tr: outer ? [{ x: width + small, y: -4 }, { x: width + 4, y: -small }, { x: width + small, y: -small }] : [{ x: width - 5, y: 5 }, { x: width - 5 - small, y: 5 }, { x: width - 5, y: 5 + small }],
      br: outer ? [{ x: width + small, y: height + 4 }, { x: width + 4, y: height + small }, { x: width + small, y: height + small }] : [{ x: width - 5, y: height - 5 }, { x: width - 5, y: height - 5 - small }, { x: width - 5 - small, y: height - 5 }],
      bl: outer ? [{ x: -small, y: height + 4 }, { x: -4, y: height + small }, { x: -small, y: height + small }] : [{ x: 5, y: height - 5 }, { x: 5 + small, y: height - 5 }, { x: 5, y: height - 5 - small }],
    }
    return [`  <path d="${hudPath(map[key])}" fill="${random() < .58 ? color : 'transparent'}" fill-opacity=".72" stroke="${color}" stroke-opacity=".58" stroke-width="${stroke}" vector-effect="non-scaling-stroke"/>`]
  }).join('\n')
  const nested = features.filter((item) => item.fill).map((item) => `  <path d="${hudPath(item.fill!)}" fill="${color}" fill-opacity=".5" stroke="${color}" stroke-opacity=".78" stroke-width="${stroke}" vector-effect="non-scaling-stroke"/>`).join('\n')
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${width + pad * 2} ${height + pad * 2}" fill="none">
  <defs>
    <pattern id="hud-dots-${seed}" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="2.2" cy="2.2" r="1" fill="${color}" fill-opacity=".11"/></pattern>
    <filter id="hud-glow-${seed}" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="0" stdDeviation="${glow}" flood-color="${color}" flood-opacity=".72"/></filter>
  </defs>
  <path d="${outlineD}" fill="${panelColor}" fill-opacity="${fillOpacity}"/>
  <path d="${outlineD}" fill="url(#hud-dots-${seed})" opacity=".78"/>
${nested}
  <path d="${outlineD}" stroke="${color}" stroke-width="${stroke}" vector-effect="non-scaling-stroke" filter="url(#hud-glow-${seed})"/>
  <path d="${outlineD}" stroke="${color}" stroke-opacity=".3" stroke-width="${innerStroke}" vector-effect="non-scaling-stroke"/>
${cornerTriangles}
</svg>`, corners, features }
}

function trimStroke(value: number) {
  return Number(value.toFixed(2))
}

export function HudFramePage() {
  const [width, setWidth] = useState(768)
  const [height, setHeight] = useState(300)
  const [bevel, setBevel] = useState(72)
  const [stroke, setStroke] = useState(1.2)
  const [innerStroke, setInnerStroke] = useState(3)
  const [glow, setGlow] = useState(3.6)
  const [density, setDensity] = useState(2)
  const [pad, setPad] = useState(22)
  const [fillOpacity, setFillOpacity] = useState(.72)
  const [color, setColor] = useState('#7df9ff')
  const [panelColor, setPanelColor] = useState('#041622')
  const [seed, setSeed] = useState(898766)
  const frame = useMemo(() => hudMarkup({ width, height, bevel, stroke, innerStroke, color, panelColor, glow, density, seed, fillOpacity, pad }), [bevel, color, density, fillOpacity, glow, height, innerStroke, pad, panelColor, seed, stroke, width])
  const svg = frame.svg
  const applySeed = (nextSeed: number) => {
    setSeed(nextSeed)
  }
  const randomize = () => {
    const values = new Uint32Array(1)
    crypto.getRandomValues(values)
    applySeed(values[0] % 999999)
  }

  return <div className="web-tool hud-tool">
    <div className="hud-seedbar"><button className="primary-action" onClick={randomize}><Dices size={15} />随机生成</button><NumberField label="Seed" value={seed} min={0} max={999999} onChange={setSeed} /><button onClick={() => applySeed(seed)}>应用种子</button><span>同一种子会生成相同装饰细节</span></div>
    <div className="web-studio-grid web-natural-grid">
      <aside className="web-controls"><div className="web-control-head"><span>PROCEDURAL FRAME</span><small>参考原版几何算法</small></div><div className="web-field-pair"><NumberField label="宽度" value={width} min={240} max={1600} unit="px" onChange={setWidth} /><NumberField label="高度" value={height} min={120} max={1000} unit="px" onChange={setHeight} /></div><RangeField label="最大独立切角" value={bevel} min={10} max={Math.floor(Math.min(width, height) / 2)} unit="px" onChange={setBevel} /><div className="web-field-pair"><RangeField label="外描边" value={stroke} min={.5} max={5} step={.1} unit="px" onChange={setStroke} /><RangeField label="内描边" value={innerStroke} min={1} max={8} step={.5} unit="px" onChange={setInnerStroke} /></div><RangeField label="辉光" value={glow} min={0} max={12} step={.2} unit="px" onChange={setGlow} /><RangeField label="边缘梯形结构" value={density} min={1} max={4} onChange={setDensity} /><RangeField label="外部留白" value={pad} min={0} max={60} unit="px" onChange={setPad} /><RangeField label="面板透明度" value={fillOpacity} min={0} max={1} step={.01} onChange={setFillOpacity} /><div className="web-field-pair"><ColorField label="信号色" value={color} onChange={setColor} /><ColorField label="面板色" value={panelColor} onChange={setPanelColor} /></div></aside>
      <section className="web-preview hud-preview"><div className="hud-noise" /><div className="hud-svg" dangerouslySetInnerHTML={{ __html: svg }} /><div className="hud-content"><span>SECTOR 07 // {seed}</span><strong>AWAITING<br />SIGNAL</strong><small>{Object.values(frame.corners).filter(Boolean).length} CHAMFERS · {frame.features.length} EDGE FEATURES</small></div></section>
    </div>
    <ResultPanel title="完整 SVG 源码" value={svg} language="SVG" note={`seed ${seed} · 四角独立 · ${frame.features.length} 个梯形结构 · 双层描边`} actions={<DownloadButton filename={`hud-frame-${seed}.svg`} value={svg} label="下载 SVG" />} />
  </div>
}
