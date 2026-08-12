import { BringToFront, CopyPlus, FlipHorizontal2, Grid3X3, Lock, LockOpen, Plus, Redo2, RotateCw, Scaling, Trash2, Undo2, Upload } from 'lucide-react'
import { useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ColorField, DownloadButton, NumberField, RangeField, ResultPanel, Toggle } from './shared'

type Segment = { cmd: string; values: number[] }
const PARAMS: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 }
const PARAM_LABELS: Record<string, string[]> = { M: ['x', 'y'], L: ['x', 'y'], H: ['x'], V: ['y'], C: ['x1', 'y1', 'x2', 'y2', 'x', 'y'], S: ['x2', 'y2', 'x', 'y'], Q: ['x1', 'y1', 'x', 'y'], T: ['x', 'y'], A: ['rx', 'ry', 'angle', 'large', 'sweep', 'x', 'y'], Z: [] }
const PATH_SAMPLES = [
  { name: '波形', path: 'M 20 100 C 45 20 80 20 105 100 S 165 180 200 100' },
  { name: '心形', path: 'M 110 180 C 20 120 20 45 70 45 C 100 45 110 70 110 70 C 110 70 120 45 150 45 C 200 45 200 120 110 180 Z' },
  { name: '星形', path: 'M 110 18 L 132 78 L 196 80 L 145 118 L 162 180 L 110 144 L 58 180 L 75 118 L 24 80 L 88 78 Z' },
]

function parsePath(path: string): Segment[] {
  const tokens = path.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/gi) || []
  const result: Segment[] = []
  let index = 0
  let command = ''
  while (index < tokens.length) {
    if (/^[a-z]$/i.test(tokens[index])) command = tokens[index++]
    if (!command || PARAMS[command.toUpperCase()] === undefined) throw new Error(`不支持的命令 ${command || tokens[index]}`)
    const count = PARAMS[command.toUpperCase()]
    if (count === 0) { result.push({ cmd: command, values: [] }); command = ''; continue }
    let group = 0
    while (index < tokens.length && !/^[a-z]$/i.test(tokens[index])) {
      if (index + count > tokens.length) throw new Error(`${command} 命令参数不足`)
      const values = tokens.slice(index, index + count).map(Number)
      if (values.some((value) => !Number.isFinite(value))) throw new Error('路径包含无效数字')
      const cmd = command.toUpperCase() === 'M' && group > 0 ? (command === 'M' ? 'L' : 'l') : command
      result.push({ cmd, values })
      index += count
      group += 1
    }
  }
  if (!result.length || result[0].cmd.toUpperCase() !== 'M') throw new Error('路径必须从 M 命令开始')
  return result
}

function absoluteSegments(segments: Segment[]) {
  let x = 0; let y = 0; let startX = 0; let startY = 0
  return segments.map((segment) => {
    const command = segment.cmd.toUpperCase()
    const relative = segment.cmd === segment.cmd.toLowerCase()
    const values = [...segment.values]
    const pair = (offset: number) => { if (relative) { values[offset] += x; values[offset + 1] += y } }
    if (command === 'M' || command === 'L' || command === 'T') { pair(0); x = values[0]; y = values[1]; if (command === 'M') { startX = x; startY = y } }
    else if (command === 'H') { x = relative ? x + values[0] : values[0]; values.splice(0, 1, x, y); return { cmd: 'L', values } }
    else if (command === 'V') { y = relative ? y + values[0] : values[0]; values.splice(0, 1, x, y); return { cmd: 'L', values } }
    else if (command === 'C') { pair(0); pair(2); pair(4); x = values[4]; y = values[5] }
    else if (command === 'S' || command === 'Q') { pair(0); pair(2); x = values[2]; y = values[3] }
    else if (command === 'A') { if (relative) { values[5] += x; values[6] += y } x = values[5]; y = values[6] }
    else if (command === 'Z') { x = startX; y = startY }
    return { cmd: command, values }
  })
}

function relativeSegments(segments: Segment[]) {
  const absolute = absoluteSegments(segments)
  let x = 0; let y = 0; let startX = 0; let startY = 0
  return absolute.map((segment, index) => {
    const command = segment.cmd.toUpperCase()
    const values = [...segment.values]
    const subtract = (offset: number) => { values[offset] -= x; values[offset + 1] -= y }
    if (command === 'M' || command === 'L' || command === 'T') { const nextX = values[0]; const nextY = values[1]; if (index > 0) subtract(0); x = nextX; y = nextY; if (command === 'M') { startX = x; startY = y } }
    else if (command === 'C') { const nextX = values[4]; const nextY = values[5]; subtract(0); subtract(2); subtract(4); x = nextX; y = nextY }
    else if (command === 'S' || command === 'Q') { const nextX = values[2]; const nextY = values[3]; subtract(0); subtract(2); x = nextX; y = nextY }
    else if (command === 'A') { const nextX = values[5]; const nextY = values[6]; values[5] -= x; values[6] -= y; x = nextX; y = nextY }
    else if (command === 'Z') { x = startX; y = startY }
    return { cmd: index === 0 ? command : command.toLowerCase(), values }
  })
}

function serialize(segments: Segment[], precision: number, minify: boolean) {
  const number = (value: number) => {
    const rounded = Number(value.toFixed(precision))
    const text = Object.is(rounded, -0) ? '0' : rounded.toString()
    return minify ? text.replace(/^(-?)0\./, '$1.') : text
  }
  return segments.map((segment) => segment.cmd + (segment.values.length ? `${minify ? '' : ' '}${segment.values.map(number).join(minify ? ' ' : ' ')}` : '')).join(minify ? ' ' : ' ')
}

function endpoint(segment: Segment) {
  const command = segment.cmd.toUpperCase()
  if (command === 'M' || command === 'L' || command === 'T') return [0, 1]
  if (command === 'C') return [4, 5]
  if (command === 'S' || command === 'Q') return [2, 3]
  if (command === 'A') return [5, 6]
  return null
}

function transformSegments(segments: Segment[], transform: (x: number, y: number) => [number, number], scale?: [number, number], rotation = 0) {
  return absoluteSegments(segments).map((segment) => {
    const values = [...segment.values]
    const command = segment.cmd.toUpperCase()
    const pairs = command === 'C' ? [0, 2, 4] : command === 'S' || command === 'Q' ? [0, 2] : command === 'M' || command === 'L' || command === 'T' ? [0] : command === 'A' ? [5] : []
    pairs.forEach((offset) => { [values[offset], values[offset + 1]] = transform(values[offset], values[offset + 1]) })
    if (command === 'A') { if (scale) { values[0] *= Math.abs(scale[0]); values[1] *= Math.abs(scale[1]) } values[2] += rotation }
    return { cmd: command, values }
  })
}

function optimizeSegments(segments: Segment[]) {
  const absolute = absoluteSegments(segments)
  let x = Number.NaN; let y = Number.NaN
  return absolute.filter((segment) => {
    const end = endpoint(segment)
    if (!end) return true
    const nextX = segment.values[end[0]]; const nextY = segment.values[end[1]]
    const duplicate = segment.cmd === 'L' && nextX === x && nextY === y
    x = nextX; y = nextY
    return !duplicate
  })
}

function reverseSegments(segments: Segment[]) {
  const absolute = absoluteSegments(segments)
  if (absolute.some((segment) => ['S', 'T'].includes(segment.cmd))) throw new Error('含 S/T 的路径请先优化为显式曲线后再反转')
  const closed = absolute.at(-1)?.cmd === 'Z'
  const drawable = absolute.slice(1, closed ? -1 : undefined)
  const starts: Array<[number, number]> = []
  let current: [number, number] = [absolute[0].values[0], absolute[0].values[1]]
  drawable.forEach((segment) => { starts.push(current); const end = endpoint(segment); if (end) current = [segment.values[end[0]], segment.values[end[1]]] })
  const result: Segment[] = [{ cmd: 'M', values: [...current] }]
  drawable.map((segment, index) => ({ segment, start: starts[index] })).reverse().forEach(({ segment, start }) => {
    if (segment.cmd === 'C') result.push({ cmd: 'C', values: [segment.values[2], segment.values[3], segment.values[0], segment.values[1], ...start] })
    else if (segment.cmd === 'Q') result.push({ cmd: 'Q', values: [segment.values[0], segment.values[1], ...start] })
    else if (segment.cmd === 'A') result.push({ cmd: 'A', values: [segment.values[0], segment.values[1], segment.values[2], segment.values[3], segment.values[4] ? 0 : 1, ...start] })
    else result.push({ cmd: 'L', values: [...start] })
  })
  if (closed) result.push({ cmd: 'Z', values: [] })
  return result
}

export function SvgPathEditorPage() {
  const [path, setPath] = useState(PATH_SAMPLES[1].path)
  const [viewBox, setViewBox] = useState<[number, number, number, number]>([0, 0, 220, 220])
  const [stroke, setStroke] = useState('#b8f35d')
  const [fill, setFill] = useState('#b8f35d')
  const [fillEnabled, setFillEnabled] = useState(true)
  const [preview, setPreview] = useState(false)
  const [ticks, setTicks] = useState(true)
  const [snap, setSnap] = useState(true)
  const [gridSize, setGridSize] = useState(5)
  const [minify, setMinify] = useState(false)
  const [precision, setPrecision] = useState(2)
  const [fillOpacity, setFillOpacity] = useState(.16)
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [viewBoxLocked, setViewBoxLocked] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [scale, setScale] = useState<[number, number]>([1, 1])
  const [translate, setTranslate] = useState<[number, number]>([0, 0])
  const [origin, setOrigin] = useState<[number, number]>([110, 110])
  const [angle, setAngle] = useState(0)
  const [dragging, setDragging] = useState<{ segment: number; offset: number } | null>(null)
  const [operationError, setOperationError] = useState('')
  const [metrics, setMetrics] = useState({ length: 0, bounds: '—', box: { x: 0, y: 0, width: 0, height: 0 } })
  const pathRef = useRef<SVGPathElement>(null)
  const history = useRef<string[]>([])
  const future = useRef<string[]>([])
  const parsed = useMemo(() => { try { return { segments: parsePath(path), error: '' } } catch (cause) { return { segments: [] as Segment[], error: cause instanceof Error ? cause.message : '路径语法无效' } } }, [path])
  const absolute = useMemo(() => parsed.error ? [] : absoluteSegments(parsed.segments), [parsed])
  const displayViewBox = useMemo<[number, number, number, number]>(() => {
    const width = viewBox[2] / zoom
    const height = viewBox[3] / zoom
    return [viewBox[0] + (viewBox[2] - width) / 2, viewBox[1] + (viewBox[3] - height) / 2, width, height]
  }, [viewBox, zoom])
  useLayoutEffect(() => {
    try {
      const node = pathRef.current
      if (!node || parsed.error) return
      const box = node.getBBox()
      setMetrics({ length: node.getTotalLength(), bounds: `${box.width.toFixed(1)} × ${box.height.toFixed(1)}`, box: { x: box.x, y: box.y, width: box.width, height: box.height } })
    } catch { /* invalid SVG path is reported by the parser */ }
  }, [path, parsed.error])
  const commit = (value: string) => { if (value === path) return; history.current.push(path); future.current = []; setPath(value); setOperationError('') }
  const commitSegments = (segments: Segment[]) => commit(serialize(segments, precision, minify))
  const undo = () => { const previous = history.current.pop(); if (previous === undefined) return; future.current.push(path); setPath(previous) }
  const redo = () => { const next = future.current.pop(); if (next === undefined) return; history.current.push(path); setPath(next) }
  const applyTransform = (kind: 'scale' | 'translate' | 'rotate') => {
    if (parsed.error) return
    if (kind === 'scale') commitSegments(transformSegments(parsed.segments, (x, y) => [origin[0] + (x - origin[0]) * scale[0], origin[1] + (y - origin[1]) * scale[1]], scale))
    if (kind === 'translate') commitSegments(transformSegments(parsed.segments, (x, y) => [x + translate[0], y + translate[1]]))
    if (kind === 'rotate') { const radians = angle * Math.PI / 180; commitSegments(transformSegments(parsed.segments, (x, y) => { const dx = x - origin[0]; const dy = y - origin[1]; return [origin[0] + dx * Math.cos(radians) - dy * Math.sin(radians), origin[1] + dx * Math.sin(radians) + dy * Math.cos(radians)] }, undefined, angle)) }
  }
  const runOperation = (operation: () => Segment[]) => { try { commitSegments(operation()); setOperationError('') } catch (cause) { setOperationError(cause instanceof Error ? cause.message : '操作失败') } }
  const fitViewBox = () => { const pad = Math.max(8, strokeWidth * 3); setViewBox([Math.floor(metrics.box.x - pad), Math.floor(metrics.box.y - pad), Math.ceil(metrics.box.width + pad * 2), Math.ceil(metrics.box.height + pad * 2)]); setZoom(1) }
  const updateViewBox = (index: number, value: number) => setViewBox((items) => {
    const next = [...items] as [number, number, number, number]
    if (viewBoxLocked && index === 2) next[3] = Math.max(.1, value / items[2] * items[3])
    if (viewBoxLocked && index === 3) next[2] = Math.max(.1, value / items[3] * items[2])
    next[index] = value
    return next
  })
  const moveAnchor = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (dragging === null || !absolute.length) return
    const bounds = event.currentTarget.getBoundingClientRect()
    let x = displayViewBox[0] + (event.clientX - bounds.left) / bounds.width * displayViewBox[2]
    let y = displayViewBox[1] + (event.clientY - bounds.top) / bounds.height * displayViewBox[3]
    if (snap) { x = Math.round(x / gridSize) * gridSize; y = Math.round(y / gridSize) * gridSize }
    const next = absolute.map((segment) => ({ ...segment, values: [...segment.values] }))
    next[dragging.segment].values[dragging.offset] = x; next[dragging.segment].values[dragging.offset + 1] = y
    setPath(serialize(next, precision, minify))
  }
  const updateCommandValue = (segmentIndex: number, valueIndex: number, value: number) => {
    const next = parsed.segments.map((segment) => ({ ...segment, values: [...segment.values] }))
    next[segmentIndex].values[valueIndex] = value
    commitSegments(next)
  }
  const removeCommand = (index: number) => {
    if (index === 0 || parsed.segments.length <= 1) return
    commitSegments(parsed.segments.filter((_, itemIndex) => itemIndex !== index))
  }
  const duplicateCommand = (index: number) => {
    const next = parsed.segments.flatMap((segment, itemIndex) => itemIndex === index ? [segment, { ...segment, values: [...segment.values] }] : [segment])
    commitSegments(next)
  }
  const addLineCommand = () => {
    const last = absolute.at(-1)
    const end = last && endpoint(last)
    const x = end ? last.values[end[0]] : viewBox[0] + viewBox[2] / 2
    const y = end ? last.values[end[1]] : viewBox[1] + viewBox[3] / 2
    commitSegments([...parsed.segments, { cmd: 'L', values: [x + gridSize * 2, y + gridSize * 2] }])
  }
  const loadSvg = (file?: File) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const documentNode = new DOMParser().parseFromString(String(reader.result), 'image/svg+xml')
      const nextPath = documentNode.querySelector('path')?.getAttribute('d')
      const sourceViewBox = documentNode.documentElement.getAttribute('viewBox')?.trim().split(/[ ,]+/).map(Number)
      if (nextPath) commit(nextPath)
      if (sourceViewBox?.length === 4 && sourceViewBox.every(Number.isFinite)) setViewBox(sourceViewBox as [number, number, number, number])
    }
    reader.readAsText(file)
  }
  const markup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox.join(' ')}">
  <path
    d="${serialize(parsed.error ? [] : parsed.segments, precision, minify)}"
    fill="${fillEnabled ? fill : 'none'}"
    fill-opacity="${fillOpacity}"
    stroke="${stroke}"
    stroke-width="${strokeWidth}"
  />
</svg>`

  return <div className="web-tool path-tool">
    <div className="path-toolbar web-inline-toolbar"><div className="path-presets">{PATH_SAMPLES.map((sample) => <button key={sample.name} onClick={() => commit(sample.path)}>{sample.name}</button>)}</div><label className="path-upload"><Upload size={13} />导入 SVG<input type="file" accept="image/svg+xml,.svg" onChange={(event) => loadSvg(event.target.files?.[0])} /></label><button onClick={addLineCommand}><Plus size={13} />添加 L</button><span className={parsed.error || operationError ? 'path-error' : ''}>{parsed.error || operationError || `长度 ${metrics.length.toFixed(1)} · 边界 ${metrics.bounds} · ${parsed.segments.length} 命令`}</span><button disabled={!history.current.length} onClick={undo}><Undo2 size={14} />撤销</button><button disabled={!future.current.length} onClick={redo}><Redo2 size={14} />重做</button></div>
    <div className="path-main-grid">
      <section className="path-canvas-column"><div className="path-preview"><div className="web-preview-static"><span>VECTOR CANVAS · 拖动端点与曲线控制点</span><code>{Math.round(zoom * 100)}% · viewBox {viewBox.join(' ')}</code></div><svg viewBox={displayViewBox.join(' ')} onPointerMove={moveAnchor} onPointerUp={() => setDragging(null)} onPointerLeave={() => setDragging(null)}><defs><pattern id="path-editor-grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse"><path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="currentColor" strokeWidth=".25" /></pattern></defs><rect x={displayViewBox[0]} y={displayViewBox[1]} width={displayViewBox[2]} height={displayViewBox[3]} fill={ticks ? 'url(#path-editor-grid)' : 'transparent'} /><path ref={pathRef} d={path} fill={fillEnabled ? fill : 'none'} fillOpacity={fillOpacity} stroke={stroke} strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke" />{!preview && absolute.flatMap((segment, segmentIndex) => { const command = segment.cmd.toUpperCase(); const offsets = command === 'C' ? [0, 2, 4] : command === 'S' || command === 'Q' ? [0, 2] : command === 'M' || command === 'L' || command === 'T' ? [0] : command === 'A' ? [5] : []; const end = endpoint(segment); return offsets.map((offset) => { const x = segment.values[offset]; const y = segment.values[offset + 1]; const isControl = Boolean(end && offset !== end[0]); const endX = end ? segment.values[end[0]] : x; const endY = end ? segment.values[end[1]] : y; return <g key={`${segmentIndex}-${offset}`} className={isControl ? 'path-control-point' : 'path-anchor'} onPointerDown={(event) => { history.current.push(path); future.current = []; event.currentTarget.setPointerCapture(event.pointerId); setDragging({ segment: segmentIndex, offset }) }}>{isControl && <line x1={x} y1={y} x2={endX} y2={endY} vectorEffect="non-scaling-stroke" />}<circle cx={x} cy={y} r={isControl ? 2.7 : 3.4} vectorEffect="non-scaling-stroke" /><text x={x + 5} y={y - 5}>{isControl ? 'ctrl' : segment.cmd}{segmentIndex}</text></g> }) })}</svg><div className="path-zoom"><RangeField label="画布缩放" value={zoom} min={.25} max={4} step={.05} unit="×" onChange={setZoom} /></div></div><label className="web-textarea path-source"><span>Path data (d)</span><textarea value={path} rows={6} spellCheck={false} onChange={(event) => setPath(event.target.value)} onBlur={() => { if (!parsed.error) commit(serialize(parsed.segments, precision, minify)) }} /></label></section>
      <aside className="path-inspector">
        <section><div className="web-control-head"><span>CONFIGURATION</span><div><button onClick={() => setViewBoxLocked((value) => !value)}>{viewBoxLocked ? <Lock size={13} /> : <LockOpen size={13} />}{viewBoxLocked ? '比例已锁' : '比例解锁'}</button><button onClick={fitViewBox}><BringToFront size={13} />适配路径</button></div></div><div className="path-viewbox">{['X', 'Y', 'Width', 'Height'].map((label, index) => <NumberField key={label} label={label} value={viewBox[index]} min={index > 1 ? 1 : -2000} max={4000} step={.1} onChange={(value) => updateViewBox(index, value)} />)}</div><div className="path-option-grid"><Toggle label="吸附网格" checked={snap} onChange={setSnap} /><Toggle label="显示网格" checked={ticks} onChange={setTicks} /><Toggle label="填充" checked={fillEnabled} onChange={setFillEnabled} /><Toggle label="纯预览" checked={preview} onChange={setPreview} /><Toggle label="压缩输出" checked={minify} onChange={setMinify} /></div><div className="web-field-pair"><NumberField label="网格间隔" value={gridSize} min={1} max={50} onChange={setGridSize} /><NumberField label="小数精度" value={precision} min={0} max={6} onChange={setPrecision} /></div><div className="web-field-pair"><ColorField label="描边" value={stroke} onChange={setStroke} /><ColorField label="填充" value={fill} onChange={setFill} /></div><RangeField label="描边宽度" value={strokeWidth} min={.5} max={16} step={.5} unit="px" onChange={setStrokeWidth} /><RangeField label="填充透明度" value={fillOpacity} min={0} max={1} step={.01} onChange={setFillOpacity} /></section>
        <section><div className="web-control-head"><span>PATH OPERATIONS</span><small>无损坐标变换</small></div><div className="path-operation-row"><Scaling size={15} /><NumberField label="Scale X" value={scale[0]} min={-10} max={10} step={.1} onChange={(value) => setScale([value, scale[1]])} /><NumberField label="Scale Y" value={scale[1]} min={-10} max={10} step={.1} onChange={(value) => setScale([scale[0], value])} /><button onClick={() => applyTransform('scale')}>缩放</button></div><div className="path-operation-row"><Grid3X3 size={15} /><NumberField label="Translate X" value={translate[0]} min={-2000} max={2000} onChange={(value) => setTranslate([value, translate[1]])} /><NumberField label="Translate Y" value={translate[1]} min={-2000} max={2000} onChange={(value) => setTranslate([translate[0], value])} /><button onClick={() => applyTransform('translate')}>移动</button></div><div className="path-operation-row"><RotateCw size={15} /><NumberField label="Origin X" value={origin[0]} min={-2000} max={2000} onChange={(value) => setOrigin([value, origin[1]])} /><NumberField label="Origin Y" value={origin[1]} min={-2000} max={2000} onChange={(value) => setOrigin([origin[0], value])} /><NumberField label="Angle" value={angle} min={-360} max={360} unit="°" onChange={setAngle} /><button onClick={() => applyTransform('rotate')}>旋转</button></div><div className="path-action-grid"><button onClick={() => commitSegments(parsed.segments)}>按精度取整</button><button onClick={() => commitSegments(relativeSegments(parsed.segments))}>转相对坐标</button><button onClick={() => commitSegments(absoluteSegments(parsed.segments))}>转绝对坐标</button><button onClick={() => runOperation(() => reverseSegments(parsed.segments))}><FlipHorizontal2 size={13} />反转</button><button onClick={() => commitSegments(optimizeSegments(parsed.segments))}>优化路径</button></div></section>
      </aside>
    </div>
    <section className="path-commands"><header><span>COMMANDS</span><small>直接编辑、复制和删除命令；A 命令标志使用开关</small></header>{parsed.segments.map((segment, segmentIndex) => <div key={`${segmentIndex}-${segment.cmd}`}><strong>{segment.cmd}</strong><span>#{segmentIndex + 1}</span>{segment.values.map((value, valueIndex) => <label key={valueIndex}><small>{PARAM_LABELS[segment.cmd.toUpperCase()]?.[valueIndex] || valueIndex + 1}</small>{segment.cmd.toUpperCase() === 'A' && (valueIndex === 3 || valueIndex === 4) ? <input type="checkbox" checked={Boolean(value)} onChange={(event) => updateCommandValue(segmentIndex, valueIndex, event.target.checked ? 1 : 0)} /> : <input type="number" step="any" value={value} onChange={(event) => updateCommandValue(segmentIndex, valueIndex, Number(event.target.value))} />}</label>)}<div className="path-command-actions"><button onClick={() => duplicateCommand(segmentIndex)} title="复制命令"><CopyPlus size={13} /></button><button disabled={segmentIndex === 0} onClick={() => removeCommand(segmentIndex)} title="删除命令"><Trash2 size={13} /></button></div></div>)}</section>
    <ResultPanel title="完整 SVG 与格式化路径" value={markup} language="SVG" note={`${parsed.segments.length} 个命令 · ${precision} 位精度${minify ? ' · 已压缩' : ''}`} actions={<DownloadButton filename="lumen-path.svg" value={markup} label="下载 SVG" />} />
  </div>
}
