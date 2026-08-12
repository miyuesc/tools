import { Check, Download, Plus, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { ColorField, DownloadButton, RangeField, ResultPanel, Segments, SelectField, TextField, Toggle, downloadText, hexChannels } from '../web-design/shared'

function cssBlock(selector: string, lines: string[]) {
  return `${selector} {\n${lines.map((line) => `  ${line}`).join('\n')}\n}`
}

const sampleItems = ['Header', 'Navigation', 'Main content', 'Inspector', 'Status']

export function CssLayoutPage() {
  const [mode, setMode] = useState<'grid' | 'flex'>('grid')
  const [columns, setColumns] = useState('minmax(180px, 1fr) 2fr minmax(160px, .8fr)')
  const [rows, setRows] = useState('auto minmax(180px, 1fr) auto')
  const [gap, setGap] = useState(16)
  const [justify, setJustify] = useState('stretch')
  const [align, setAlign] = useState('stretch')
  const [direction, setDirection] = useState('row')
  const [wrap, setWrap] = useState('wrap')
  const [grow, setGrow] = useState(1)
  const gridStyle = { display: 'grid', gridTemplateColumns: columns, gridTemplateRows: rows, gap, justifyItems: justify, alignItems: align }
  const flexStyle = { display: 'flex', flexDirection: direction as 'row' | 'column' | 'row-reverse' | 'column-reverse', flexWrap: wrap as 'wrap' | 'nowrap' | 'wrap-reverse', gap, justifyContent: justify, alignItems: align }
  const css = mode === 'grid' ? cssBlock('.layout', [`display: grid;`, `grid-template-columns: ${columns};`, `grid-template-rows: ${rows};`, `gap: ${gap}px;`, `justify-items: ${justify};`, `align-items: ${align};`]) : cssBlock('.layout', [`display: flex;`, `flex-direction: ${direction};`, `flex-wrap: ${wrap};`, `gap: ${gap}px;`, `justify-content: ${justify};`, `align-items: ${align};`])
  return <div className="web-tool layout-builder-tool">
    <div className="web-inline-toolbar layout-modebar"><Segments value={mode} options={[{ value: 'grid', label: 'CSS Grid' }, { value: 'flex', label: 'Flexbox' }]} onChange={setMode} /><span>可视化调整布局，并复制完整容器 CSS</span></div>
    <div className="layout-builder-grid"><aside className="web-controls"><div className="web-control-head"><span>{mode.toUpperCase()} CONTAINER</span><small>LOCAL PREVIEW</small></div>{mode === 'grid' ? <><TextField label="列模板" value={columns} onChange={setColumns} /><TextField label="行模板" value={rows} onChange={setRows} /><SelectField label="水平对齐" value={justify} onChange={setJustify}><option value="stretch">stretch</option><option value="start">start</option><option value="center">center</option><option value="end">end</option></SelectField><SelectField label="垂直对齐" value={align} onChange={setAlign}><option value="stretch">stretch</option><option value="start">start</option><option value="center">center</option><option value="end">end</option></SelectField></> : <><SelectField label="主轴方向" value={direction} onChange={setDirection}><option value="row">row</option><option value="column">column</option><option value="row-reverse">row-reverse</option><option value="column-reverse">column-reverse</option></SelectField><SelectField label="换行" value={wrap} onChange={setWrap}><option value="wrap">wrap</option><option value="nowrap">nowrap</option><option value="wrap-reverse">wrap-reverse</option></SelectField><SelectField label="主轴分布" value={justify} onChange={setJustify}><option value="flex-start">flex-start</option><option value="center">center</option><option value="space-between">space-between</option><option value="space-around">space-around</option><option value="flex-end">flex-end</option></SelectField><SelectField label="交叉轴对齐" value={align} onChange={setAlign}><option value="stretch">stretch</option><option value="flex-start">flex-start</option><option value="center">center</option><option value="flex-end">flex-end</option></SelectField><RangeField label="子项 grow" value={grow} min={0} max={4} unit="" onChange={setGrow} /></>}<RangeField label="间距" value={gap} min={0} max={64} unit="px" onChange={setGap} /></aside><section className="layout-preview"><div className="web-preview-static"><span>{mode === 'grid' ? 'GRID TRACKS' : 'FLEX FLOW'}</span><code>{mode === 'grid' ? columns : `${direction} / ${wrap}`}</code></div><div className={`layout-canvas ${mode}`} style={mode === 'grid' ? gridStyle : flexStyle}>{sampleItems.map((item, index) => <article style={mode === 'flex' ? { flexGrow: grow, flexBasis: index === 2 ? 220 : 120 } : index === 0 ? { gridColumn: '1 / -1' } : index === 4 ? { gridColumn: '1 / -1' } : undefined} key={item}><span>0{index + 1}</span><strong>{item}</strong><small>{mode === 'grid' ? 'grid item' : `grow ${grow}`}</small></article>)}</div></section></div>
    <ResultPanel title={`${mode === 'grid' ? 'Grid' : 'Flexbox'} 容器 CSS`} value={css} note={`${sampleItems.length} 个示例元素 · gap ${gap}px`} />
  </div>
}

export function CssTransformFilterPage() {
  const [rotate, setRotate] = useState(14)
  const [scale, setScale] = useState(1.08)
  const [translateX, setTranslateX] = useState(0)
  const [translateY, setTranslateY] = useState(-8)
  const [skewX, setSkewX] = useState(0)
  const [perspective, setPerspective] = useState(900)
  const [rotateX, setRotateX] = useState(0)
  const [rotateY, setRotateY] = useState(-12)
  const [blur, setBlur] = useState(0)
  const [brightness, setBrightness] = useState(105)
  const [contrast, setContrast] = useState(112)
  const [saturate, setSaturate] = useState(118)
  const [hue, setHue] = useState(0)
  const [backdrop, setBackdrop] = useState(true)
  const transform = `perspective(${perspective}px) translate(${translateX}px, ${translateY}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotate(${rotate}deg) skewX(${skewX}deg) scale(${scale})`
  const filter = `blur(${blur}px) brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) hue-rotate(${hue}deg)`
  const css = cssBlock('.element', [`transform: ${transform};`, `filter: ${filter};`, ...(backdrop ? ['backdrop-filter: blur(14px) saturate(125%);'] : []), `transform-origin: center;`])
  return <div className="web-tool transform-filter-tool"><div className="transform-filter-grid"><aside className="web-controls"><div className="web-control-head"><span>TRANSFORM 2D / 3D</span><small>COMPOSITE</small></div><RangeField label="旋转" value={rotate} min={-180} max={180} unit="°" onChange={setRotate} /><RangeField label="缩放" value={scale} min={.25} max={2} step={.01} unit="×" onChange={setScale} /><div className="web-field-pair"><RangeField label="位移 X" value={translateX} min={-160} max={160} unit="px" onChange={setTranslateX} /><RangeField label="位移 Y" value={translateY} min={-160} max={160} unit="px" onChange={setTranslateY} /></div><RangeField label="倾斜 X" value={skewX} min={-45} max={45} unit="°" onChange={setSkewX} /><RangeField label="透视" value={perspective} min={200} max={1800} unit="px" onChange={setPerspective} /><div className="web-field-pair"><RangeField label="旋转 X" value={rotateX} min={-75} max={75} unit="°" onChange={setRotateX} /><RangeField label="旋转 Y" value={rotateY} min={-75} max={75} unit="°" onChange={setRotateY} /></div></aside><aside className="web-controls filter-controls"><div className="web-control-head"><span>FILTER STACK</span><small>{[blur, brightness, contrast, saturate, hue].filter((value, index) => value !== [0, 100, 100, 100, 0][index]).length} ACTIVE</small></div><RangeField label="模糊" value={blur} min={0} max={24} unit="px" onChange={setBlur} /><RangeField label="亮度" value={brightness} min={0} max={200} unit="%" onChange={setBrightness} /><RangeField label="对比度" value={contrast} min={0} max={200} unit="%" onChange={setContrast} /><RangeField label="饱和度" value={saturate} min={0} max={250} unit="%" onChange={setSaturate} /><RangeField label="色相旋转" value={hue} min={-180} max={180} unit="°" onChange={setHue} /><Toggle label="添加 backdrop-filter" checked={backdrop} onChange={setBackdrop} /></aside><section className="transform-stage"><div className="web-preview-static"><span>COMPOSITING PREVIEW</span><code>GPU-friendly transform</code></div><div className="transform-scene"><div className="transform-orbit" /><article style={{ transform, filter, backdropFilter: backdrop ? 'blur(14px) saturate(125%)' : undefined }}><span>CSS / 03</span><strong>Depth<br />without noise.</strong><small>transform + filter</small></article></div></section></div><ResultPanel title="Transform 与 Filter CSS" value={css} note="按 CSS 声明顺序组合" /></div>
}

type Keyframe = { id: number; position: number; x: number; y: number; scale: number; rotate: number; opacity: number }

function cubicBezierPoint(t: number, p1: number, p2: number) {
  const inverse = 1 - t
  return 3 * inverse * inverse * t * p1 + 3 * inverse * t * t * p2 + t * t * t
}

export function KeyframesBezierPage() {
  const [duration, setDuration] = useState(1200)
  const [iterations, setIterations] = useState('infinite')
  const [play, setPlay] = useState(true)
  const [bezier, setBezier] = useState<[number, number, number, number]>([.22, 1, .36, 1])
  const [frames, setFrames] = useState<Keyframe[]>([{ id: 1, position: 0, x: -120, y: 30, scale: .75, rotate: -10, opacity: 0 }, { id: 2, position: 60, x: 12, y: -8, scale: 1.05, rotate: 3, opacity: 1 }, { id: 3, position: 100, x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }])
  const curve = `cubic-bezier(${bezier.join(', ')})`
  const updateFrame = (id: number, key: keyof Keyframe, value: number) => setFrames((items) => items.map((frame) => frame.id === id ? { ...frame, [key]: value } : frame))
  const addFrame = () => setFrames((items) => [...items, { id: Date.now(), position: 50, x: 0, y: -24, scale: 1, rotate: 0, opacity: 1 }].sort((left, right) => left.position - right.position))
  const keyframeLines = [...frames].sort((left, right) => left.position - right.position).map((frame) => `  ${frame.position}% { transform: translate(${frame.x}px, ${frame.y}px) scale(${frame.scale}) rotate(${frame.rotate}deg); opacity: ${frame.opacity}; }`).join('\n')
  const css = `@keyframes lumen-motion {\n${keyframeLines}\n}\n\n.animated {\n  animation: lumen-motion ${duration}ms ${curve} ${iterations};\n}`
  const path = Array.from({ length: 41 }, (_, index) => { const t = index / 40; return `${index ? 'L' : 'M'} ${10 + cubicBezierPoint(t, bezier[0], bezier[2]) * 180} ${190 - cubicBezierPoint(t, bezier[1], bezier[3]) * 180}` }).join(' ')
  return <div className="web-tool keyframe-tool"><div className="keyframe-toolbar"><label>时长<input type="number" value={duration} min={100} max={10000} onChange={(event) => setDuration(Number(event.target.value))} /><span>ms</span></label><select value={iterations} onChange={(event) => setIterations(event.target.value)}><option value="1">播放一次</option><option value="2">播放两次</option><option value="infinite">无限循环</option></select><button onClick={() => setPlay(false)}>停止</button><button className="primary-action" onClick={() => { setPlay(false); requestAnimationFrame(() => setPlay(true)) }}>重新播放</button></div><div className="keyframe-grid"><aside className="keyframe-list"><header><div><span>KEYFRAMES</span><small>{frames.length} 个节点</small></div><button onClick={addFrame}><Plus size={14} />添加</button></header>{frames.map((frame) => <article key={frame.id}><div><strong>{frame.position}%</strong><button disabled={frames.length <= 2} onClick={() => setFrames((items) => items.filter((item) => item.id !== frame.id))}><Trash2 size={13} /></button></div><label>时间<input type="range" min={0} max={100} value={frame.position} onChange={(event) => updateFrame(frame.id, 'position', Number(event.target.value))} /></label><div>{(['x', 'y', 'scale', 'rotate', 'opacity'] as const).map((key) => <label key={key}><span>{key}</span><input type="number" step={key === 'scale' || key === 'opacity' ? .05 : 1} value={frame[key]} onChange={(event) => updateFrame(frame.id, key, Number(event.target.value))} /></label>)}</div></article>)}</aside><section className="keyframe-preview"><div className="web-preview-static"><span>ANIMATION STAGE</span><code>{duration}ms · {curve}</code></div><div className="keyframe-stage"><div className="motion-trail" />{play && <article key={`${duration}-${curve}-${frames.map((frame) => Object.values(frame).join(':')).join('|')}`} style={{ animation: `lumen-motion-live ${duration}ms ${curve} ${iterations}` }}><span>MOTION</span><strong>Ease into<br />the moment.</strong></article>}<style>{`@keyframes lumen-motion-live {${keyframeLines}}`}</style></div></section><aside className="bezier-panel"><header><span>CUBIC BÉZIER</span><code>{curve}</code></header><svg viewBox="0 0 200 200"><path d="M 10 190 L 190 10" className="bezier-guide" /><path d={path} className="bezier-curve" /><circle cx={10 + bezier[0] * 180} cy={190 - bezier[1] * 180} r="5" /><circle cx={10 + bezier[2] * 180} cy={190 - bezier[3] * 180} r="5" /></svg><div>{bezier.map((value, index) => <label key={index}><span>{['x1', 'y1', 'x2', 'y2'][index]}</span><input type="number" min={index % 2 === 0 ? 0 : -2} max={index % 2 === 0 ? 1 : 3} step=".01" value={value} onChange={(event) => setBezier((current) => current.map((item, itemIndex) => itemIndex === index ? Number(event.target.value) : item) as typeof current)} /></label>)}</div></aside></div><ResultPanel title="Keyframes 与 Timing Function" value={css} note={`${frames.length} 帧 · ${duration}ms`} /></div>
}

function relativeLuminance(hex: string) {
  const channels = hexChannels(hex).map((value) => { const normalized = value / 255; return normalized <= .04045 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4 })
  return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2]
}

function contrastRatio(left: string, right: string) {
  const values = [relativeLuminance(left), relativeLuminance(right)].sort((a, b) => b - a)
  return (values[0] + .05) / (values[1] + .05)
}

export function WcagContrastPage() {
  const [foreground, setForeground] = useState('#172019')
  const [background, setBackground] = useState('#b8f35d')
  const [fontSize, setFontSize] = useState(18)
  const [bold, setBold] = useState(false)
  const ratio = contrastRatio(foreground, background)
  const isLarge = fontSize >= 24 || (bold && fontSize >= 18.66)
  const checks = [{ label: 'AA 正文', target: 4.5 }, { label: 'AA 大字', target: 3 }, { label: 'AAA 正文', target: 7 }, { label: 'AAA 大字', target: 4.5 }, { label: '非文本 UI', target: 3 }]
  const css = `color: ${foreground};\nbackground-color: ${background};\n/* Contrast ${ratio.toFixed(2)}:1 · ${isLarge ? 'large text' : 'normal text'} */`
  return <div className="web-tool contrast-tool"><div className="contrast-grid"><aside className="web-controls"><div className="web-control-head"><span>COLOR PAIR</span><small>WCAG 2.2</small></div><ColorField label="前景文字" value={foreground} onChange={setForeground} /><ColorField label="背景颜色" value={background} onChange={setBackground} /><button className="contrast-swap" onClick={() => { setForeground(background); setBackground(foreground) }}>交换前景与背景</button><RangeField label="字号" value={fontSize} min={10} max={72} unit="px" onChange={setFontSize} /><Toggle label="粗体文本" checked={bold} onChange={setBold} /></aside><section className="contrast-preview" style={{ color: foreground, backgroundColor: background }}><div className="web-preview-static"><span>READABILITY PREVIEW</span><code>{isLarge ? 'LARGE TEXT' : 'NORMAL TEXT'}</code></div><div><span>ACCESSIBLE COLOR</span><strong style={{ fontSize, fontWeight: bold ? 750 : 400 }}>Clear text carries<br />the interface.</strong><p style={{ fontSize: Math.max(12, fontSize * .72), fontWeight: bold ? 700 : 400 }}>这段文字使用当前前景色与背景色，用于检查真实阅读感受。</p></div></section><aside className="contrast-score"><header><span>CONTRAST RATIO</span><strong>{ratio.toFixed(2)}<small>: 1</small></strong><p>{ratio >= 7 ? 'AAA 级高对比' : ratio >= 4.5 ? 'AA 正文通过' : ratio >= 3 ? '仅适合大字或 UI' : '对比度不足'}</p></header><div>{checks.map((check) => <article className={ratio >= check.target ? 'pass' : 'fail'} key={check.label}><span>{ratio >= check.target ? <Check size={14} /> : '×'}</span><strong>{check.label}</strong><code>≥ {check.target}:1</code></article>)}</div></aside></div><ResultPanel title="颜色与对比度 CSS" value={css} note={`${checks.filter((check) => ratio >= check.target).length}/${checks.length} 项通过`} /></div>
}

type SpriteIcon = { id: number; name: string; viewBox: string; content: string }

function safeIconName(value: string, fallback: string) {
  const normalized = value.replace(/\.svg$/i, '').trim().replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase()
  return normalized || fallback
}

function parseSvg(value: string, name: string, id: number): SpriteIcon {
  const documentNode = new DOMParser().parseFromString(value, 'image/svg+xml')
  const parserError = documentNode.querySelector('parsererror')
  const root = documentNode.documentElement
  if (parserError || root.tagName.toLowerCase() !== 'svg') throw new Error(`${name} 不是有效 SVG`)
  root.querySelectorAll('script, foreignObject, style').forEach((node) => node.remove())
  root.querySelectorAll('*').forEach((node) => {
    for (const attribute of [...node.attributes]) {
      const externalReference = /^(?:href|xlink:href)$/i.test(attribute.name) && !/^(?:#|data:)/i.test(attribute.value)
      const externalCssUrl = /url\(\s*['"]?(?:https?:|\/\/)/i.test(attribute.value)
      if (/^on/i.test(attribute.name) || externalReference || externalCssUrl) node.removeAttribute(attribute.name)
    }
  })
  return { id, name: safeIconName(name, `icon-${id}`), viewBox: root.getAttribute('viewBox') || `0 0 ${root.getAttribute('width') || 24} ${root.getAttribute('height') || 24}`, content: root.innerHTML.trim() }
}

function namespaceSvgIds(content: string, namespace: string) {
  const documentNode = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${content}</svg>`, 'image/svg+xml')
  const root = documentNode.documentElement
  const ids = new Map<string, string>()
  root.querySelectorAll('[id]').forEach((node) => {
    const current = node.getAttribute('id')!
    const next = `${namespace}-${safeIconName(current, 'part')}`
    ids.set(current, next)
    node.setAttribute('id', next)
  })
  root.querySelectorAll('*').forEach((node) => {
    for (const attribute of [...node.attributes]) {
      let value = attribute.value
      for (const [current, next] of ids) value = value.replaceAll(`url(#${current})`, `url(#${next})`).replaceAll(`#${current}`, `#${next}`)
      node.setAttribute(attribute.name, value)
    }
  })
  return root.innerHTML.trim()
}

const DEFAULT_ICONS: SpriteIcon[] = [
  { id: 1, name: 'spark', viewBox: '0 0 24 24', content: '<path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z" fill="currentColor"/>' },
  { id: 2, name: 'arrow-up-right', viewBox: '0 0 24 24', content: '<path d="M7 17 17 7M8 7h9v9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' },
  { id: 3, name: 'check', viewBox: '0 0 24 24', content: '<path d="m5 12 4 4L19 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' },
]

export function SvgSpritePage() {
  const [icons, setIcons] = useState<SpriteIcon[]>(DEFAULT_ICONS)
  const [prefix, setPrefix] = useState('icon')
  const [selected, setSelected] = useState<number>(1)
  const [notice, setNotice] = useState('所有文件只在浏览器本地解析')
  const fileRef = useRef<HTMLInputElement>(null)
  const symbols = icons.map((icon) => {
    const symbolId = `${prefix}-${icon.name}`
    const content = namespaceSvgIds(icon.content, symbolId)
    return `<symbol id="${symbolId}" viewBox="${icon.viewBox}">\n${content.split('\n').map((line) => `    ${line}`).join('\n')}\n  </symbol>`
  }).join('\n  ')
  const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n  ${symbols}\n</svg>`
  const usage = icons.map((icon) => `<svg aria-hidden="true"><use href="#${prefix}-${icon.name}" /></svg>`).join('\n')
  const addFiles = async (files: FileList | null) => {
    if (!files) return
    const start = Date.now()
    const added: SpriteIcon[] = []
    const usedNames = new Set(icons.map((icon) => icon.name))
    let rejected = 0
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]
      try {
        const parsed = parseSvg(await file.text(), file.name, start + index)
        const baseName = parsed.name
        let name = baseName
        let suffix = 2
        while (usedNames.has(name)) { name = `${baseName}-${suffix}`; suffix += 1 }
        usedNames.add(name)
        added.push({ ...parsed, name })
      } catch { rejected += 1 }
    }
    if (added.length) { setIcons((current) => [...current, ...added]); setSelected(added[0].id) }
    setNotice(`已导入 ${added.length} 个 SVG${rejected ? ` · 跳过 ${rejected} 个无效文件` : ''}`)
  }
  const current = icons.find((icon) => icon.id === selected)
  return <div className="web-tool sprite-tool"><div className="sprite-toolbar"><label className="sprite-upload"><Upload size={15} />导入 SVG<input ref={fileRef} type="file" accept="image/svg+xml,.svg" multiple onChange={(event) => void addFiles(event.target.files)} /></label><label>Symbol 前缀<input value={prefix} onChange={(event) => setPrefix(safeIconName(event.target.value, 'icon'))} /></label><span>{notice} · {icons.length} symbols</span><DownloadButton filename="sprite.svg" value={sprite} label="下载 Sprite" /></div><div className="sprite-grid"><aside className="sprite-library"><header><span>ICON LIBRARY</span><small>选择图标预览</small></header>{icons.map((icon) => <article role="button" tabIndex={0} className={selected === icon.id ? 'active' : ''} key={icon.id} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelected(icon.id) }} onClick={() => setSelected(icon.id)}><svg viewBox={icon.viewBox} dangerouslySetInnerHTML={{ __html: icon.content }} /><span>{icon.name}</span><code>#{prefix}-{icon.name}</code><button aria-label={`删除 ${icon.name}`} onClick={(event) => { event.stopPropagation(); setIcons((items) => items.filter((item) => item.id !== icon.id)) }}><Trash2 size={12} /></button></article>)}</aside><section className="sprite-preview"><div className="web-preview-static"><span>SYMBOL PREVIEW</span><code>{current ? `#${prefix}-${current.name}` : 'NO SELECTION'}</code></div><div>{current ? <><svg viewBox={current.viewBox} dangerouslySetInnerHTML={{ __html: current.content }} /><strong>{current.name}</strong><span>{current.viewBox}</span></> : <p>导入 SVG 后在这里预览</p>}</div></section><aside className="sprite-inspector"><header><span>USAGE</span><small>内联 Sprite 引用</small></header><pre>{current ? `<svg aria-hidden="true">\n  <use href="#${prefix}-${current.name}" />\n</svg>` : ''}</pre><div><button onClick={() => downloadText('sprite-usage.html', usage, 'text/html')}><Download size={14} />下载用法</button></div></aside></div><ResultPanel title="SVG Symbol Sprite" value={sprite} language="SVG" note={`${icons.length} 个图标 · ${new Blob([sprite]).size} bytes`} actions={<DownloadButton filename="sprite.svg" value={sprite} label="下载" />} /></div>
}
