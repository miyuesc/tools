import { Check, LoaderCircle, Minus, Play, Plus, RotateCcw, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ColorField, NumberField, RangeField, ResultPanel, Segments, SelectField, TextField, Toggle, rgba } from './shared'

type ButtonFlowState = string
type ButtonState = { label: string; icon: 'none' | 'arrow' | 'dots' | 'spinner' | 'check' | 'cross'; background: string; gradient: string; foreground: string; border: string; scale: number }
const BUTTON_STATES: Record<string, ButtonState> = {
  idle: { label: 'Launch project', icon: 'arrow', background: '#b8f35d', gradient: '#8ed93d', foreground: '#111411', border: '#b8f35d', scale: 1 },
  loading: { label: 'Launching…', icon: 'spinner', background: '#d9e7cc', gradient: '#b9cfa6', foreground: '#23301f', border: '#d9e7cc', scale: .98 },
  success: { label: 'Project ready', icon: 'check', background: '#61df8a', gradient: '#30bd69', foreground: '#092513', border: '#61df8a', scale: 1.02 },
  error: { label: 'Try again', icon: 'cross', background: '#ff8585', gradient: '#ed5d73', foreground: '#350b12', border: '#ff8585', scale: 1 },
  disabled: { label: 'Unavailable', icon: 'none', background: '#303530', gradient: '#303530', foreground: '#777e78', border: '#303530', scale: 1 },
}
const BUTTON_PRESETS: Record<string, Record<string, ButtonState>> = {
  Deploy: BUTTON_STATES,
  Checkout: {
    idle: { ...BUTTON_STATES.idle, label: 'Pay $129', background: '#6d5dfc', gradient: '#9f7aea', foreground: '#ffffff', border: '#6d5dfc' },
    loading: { ...BUTTON_STATES.loading, label: 'Authorizing…', icon: 'dots', background: '#7c6dec', gradient: '#5f52ce', foreground: '#ffffff' },
    success: { ...BUTTON_STATES.success, label: 'Payment complete', background: '#22c55e', gradient: '#16a34a' },
    error: { ...BUTTON_STATES.error, label: 'Payment declined' },
    disabled: { ...BUTTON_STATES.disabled, label: 'Checkout unavailable' },
  },
  AI: {
    idle: { ...BUTTON_STATES.idle, label: 'Generate', background: '#111827', gradient: '#6d28d9', foreground: '#ffffff', border: '#8b5cf6' },
    loading: { ...BUTTON_STATES.loading, label: 'Thinking…', icon: 'dots', background: '#312e81', gradient: '#6d28d9', foreground: '#ffffff' },
    success: { ...BUTTON_STATES.success, label: 'Draft ready', background: '#a7f3d0', gradient: '#67e8f9' },
    error: { ...BUTTON_STATES.error, label: 'Regenerate' },
    disabled: { ...BUTTON_STATES.disabled, label: 'Model offline' },
  },
  Destructive: {
    idle: { ...BUTTON_STATES.idle, label: 'Delete account', icon: 'cross', background: '#ef4444', gradient: '#b91c1c', foreground: '#ffffff', border: '#ef4444' },
    loading: { ...BUTTON_STATES.loading, label: 'Deleting…', background: '#991b1b', gradient: '#7f1d1d', foreground: '#ffffff' },
    success: { ...BUTTON_STATES.success, label: 'Account deleted' },
    error: { ...BUTTON_STATES.error, label: 'Deletion failed' },
    disabled: { ...BUTTON_STATES.disabled, label: 'Already deleted' },
  },
  Matchmaking: {
    idle: { ...BUTTON_STATES.idle, label: 'Find match', background: '#f97316', gradient: '#ec4899', foreground: '#ffffff' },
    loading: { ...BUTTON_STATES.loading, label: 'Searching…', icon: 'dots', background: '#7c3aed', gradient: '#db2777', foreground: '#ffffff' },
    success: { ...BUTTON_STATES.success, label: 'Match found!', background: '#22c55e', gradient: '#14b8a6' },
    error: { ...BUTTON_STATES.error, label: 'Search again' },
    disabled: { ...BUTTON_STATES.disabled, label: 'Queue closed' },
  },
}

function buttonIcon(name: ButtonState['icon']) {
  if (name === 'spinner') return <LoaderCircle size={16} className="button-spinner" />
  if (name === 'dots') return <span className="button-dots" aria-hidden><i /><i /><i /></span>
  if (name === 'check') return <Check size={16} />
  if (name === 'cross') return <X size={16} />
  if (name === 'arrow') return <span aria-hidden>↗</span>
  return null
}

export function ButtonStatePage() {
  const [states, setStates] = useState<Record<string, ButtonState>>(BUTTON_STATES)
  const [stateOrder, setStateOrder] = useState(Object.keys(BUTTON_STATES))
  const [editing, setEditing] = useState<ButtonFlowState>('idle')
  const [preview, setPreview] = useState<ButtonFlowState>('idle')
  const [gradient, setGradient] = useState(true)
  const [radius, setRadius] = useState(12)
  const [height, setHeight] = useState(54)
  const [padding, setPadding] = useState(26)
  const [fontSize, setFontSize] = useState(15)
  const [borderWidth, setBorderWidth] = useState(1)
  const [delay, setDelay] = useState(1200)
  const [outcome, setOutcome] = useState<'success' | 'error'>('success')
  const [widthMode, setWidthMode] = useState<'auto' | 'full' | 'pill' | 'circle'>('auto')
  const [clickAnimation, setClickAnimation] = useState<'none' | 'shimmer' | 'ripple' | 'bounce' | 'scale' | 'glow'>('shimmer')
  const [hoverEffect, setHoverEffect] = useState<'none' | 'scale' | 'lift' | 'ring' | 'bright'>('scale')
  const [easing, setEasing] = useState<'spring' | 'ease' | 'linear' | 'bounce' | 'snap' | 'gentle'>('spring')
  const [speed, setSpeed] = useState<'quick' | 'normal' | 'slow'>('normal')
  const [fontWeight, setFontWeight] = useState(600)
  const [letterSpacing, setLetterSpacing] = useState(0)
  const [shadowStyle, setShadowStyle] = useState<'none' | 'sm' | 'md' | 'lg' | 'glow'>('md')
  const [ringStyle, setRingStyle] = useState<'none' | 'ring' | 'outline'>('none')
  const [motionKey, setMotionKey] = useState(0)
  const timers = useRef(new Set<number>())
  const clearTimers = () => {
    timers.current.forEach((timer) => window.clearTimeout(timer))
    timers.current.clear()
  }
  const schedule = (callback: () => void, timeout: number) => {
    const timer = window.setTimeout(() => {
      timers.current.delete(timer)
      callback()
    }, timeout)
    timers.current.add(timer)
  }
  useEffect(() => () => {
    timers.current.forEach((timer) => window.clearTimeout(timer))
    timers.current.clear()
  }, [])
  const current = states[editing]
  const shown = states[preview]
  const update = <K extends keyof ButtonState>(key: K, value: ButtonState[K]) => setStates((items) => ({ ...items, [editing]: { ...items[editing], [key]: value } }))
  const background = (state: ButtonState) => gradient ? `linear-gradient(135deg, ${state.background}, ${state.gradient})` : state.background
  const simulate = () => {
    if (preview === 'disabled' || preview === 'loading') return
    clearTimers()
    setPreview('loading')
    setMotionKey((value) => value + 1)
    schedule(() => setPreview(outcome), delay)
  }
  const playAll = () => {
    clearTimers()
    stateOrder.forEach((name, index) => schedule(() => setPreview(name), index * Math.max(300, delay / 2)))
  }
  const addState = () => {
    const id = `state${stateOrder.length + 1}`
    const nextId = states[id] ? `${id}-${Date.now().toString(36).slice(-3)}` : id
    setStates((items) => ({ ...items, [nextId]: { ...current, label: `${current.label} copy` } }))
    setStateOrder((items) => [...items, nextId])
    setEditing(nextId)
    setPreview(nextId)
  }
  const removeState = () => {
    if (stateOrder.length <= 2) return
    const index = stateOrder.indexOf(editing)
    const fallback = stateOrder[Math.max(0, index - 1)]
    setStates((items) => Object.fromEntries(Object.entries(items).filter(([name]) => name !== editing)))
    setStateOrder((items) => items.filter((name) => name !== editing))
    setEditing(fallback)
    setPreview(fallback)
  }
  const easingValue = { spring: 'cubic-bezier(.34,1.56,.64,1)', ease: 'ease', linear: 'linear', bounce: 'cubic-bezier(.68,-.6,.32,1.6)', snap: 'cubic-bezier(.2,.9,.2,1)', gentle: 'cubic-bezier(.25,.1,.25,1)' }[easing]
  const durationValue = { quick: 160, normal: 360, slow: 620 }[speed]
  const widthValue = widthMode === 'full' ? '100%' : widthMode === 'circle' ? `${height}px` : 'auto'
  const radiusValue = widthMode === 'pill' || widthMode === 'circle' ? 999 : radius
  const shadowValueButton = { none: 'none', sm: '0 4px 10px rgb(0 0 0 / .14)', md: '0 10px 28px rgb(0 0 0 / .22)', lg: '0 18px 50px rgb(0 0 0 / .3)', glow: `0 0 28px ${shown.background}88` }[shadowStyle]
  const idleIconText = { none: '', arrow: '↗', dots: '•••', spinner: '↻', check: '✓', cross: '×' }[states.idle.icon]
  const stateRule = (name: string) => {
    const state = states[name]
    return `.state-${name} {
  --button-bg: ${background(state)};
  --button-color: ${state.foreground};
  --button-border: ${state.border};
  --button-scale: ${state.scale};
}`
  }
  const html = `<button class="state-button state-idle motion-${clickAnimation} hover-${hoverEffect} ring-${ringStyle}" type="button">
  <span class="button-icon" aria-hidden="true">${idleIconText}</span>
  <span class="button-label">${states.idle.label}</span>
</button>`
  const flowJson = JSON.stringify(Object.fromEntries(stateOrder.map((name) => [name, states[name]])), null, 2)
  const css = `.state-button {
  position: relative;
  overflow: hidden;
  height: ${height}px;
  padding-inline: ${padding}px;
  border: ${borderWidth}px solid var(--button-border);
  border-radius: ${radius}px;
  background: var(--button-bg);
  color: var(--button-color);
  font-size: ${fontSize}px;
  transform: scale(var(--button-scale));
  transition: 180ms cubic-bezier(.2,.8,.2,1);
  font-weight: ${fontWeight};
  letter-spacing: ${letterSpacing}px;
  width: ${widthValue};
  box-shadow: ${shadowValueButton};
  transition: ${durationValue}ms ${easingValue};
}

${stateOrder.map(stateRule).join('\n\n')}

.state-loading .button-icon { animation: spin .8s linear infinite; }
.motion-shimmer::after { content: ''; position: absolute; inset: 0; translate: -120% 0; background: linear-gradient(100deg, transparent, rgb(255 255 255 / .42), transparent); animation: shimmer 1.2s infinite; }
.motion-ripple:active::after { content: ''; position: absolute; inset: 15%; border-radius: inherit; background: rgb(255 255 255 / .45); animation: ripple .55s ease-out; }
.motion-bounce { animation: button-bounce .46s ${easingValue}; }
.motion-scale:active { transform: scale(.94); }
.motion-glow { animation: button-glow 1.2s ease-in-out infinite alternate; }
.hover-scale:hover { transform: scale(1.05); }.hover-lift:hover { transform: translateY(-4px); }.hover-ring:hover { outline: 4px solid color-mix(in srgb, var(--button-border) 30%, transparent); }.hover-bright:hover { filter: brightness(1.14); }
.ring-ring { outline: 4px solid color-mix(in srgb, var(--button-border) 28%, transparent); }.ring-outline { border-width: ${Math.max(2, borderWidth)}px; }
@keyframes shimmer { to { translate: 120% 0; } } @keyframes ripple { to { scale: 2; opacity: 0; } } @keyframes button-bounce { 50% { scale: 1.1; } } @keyframes button-glow { to { filter: drop-shadow(0 0 14px var(--button-border)); } }
@keyframes spin { to { rotate: 1turn; } }`
  const js = `const button = document.querySelector('.state-button');
const flow = ${flowJson};
const iconMap = { none: '', arrow: '↗', dots: '•••', spinner: '↻', check: '✓', cross: '×' };
const stateNames = Object.keys(flow);

button.addEventListener('click', async () => {
  setButtonState('loading');
  try {
    await runAction();
    setButtonState('${outcome}');
  } catch {
    setButtonState('error');
  }
});

function setButtonState(name) {
  button.classList.remove(...stateNames.map(state => \`state-\${state}\`));
  button.classList.add(\`state-\${name}\`);
  button.querySelector('.button-label').textContent = flow[name].label;
  button.querySelector('.button-icon').textContent = iconMap[flow[name].icon];
  button.disabled = name === 'disabled';
}`
  const bundle = `<!-- HTML -->
${html}

<style>
${css}
</style>

<script>
${js}
</script>`

  return <div className="web-tool button-flow-tool">
    <div className="preset-toolbar"><span>FLOW PRESETS</span>{Object.entries(BUTTON_PRESETS).map(([name, preset]) => <button key={name} onClick={() => { setStates(preset); setStateOrder(Object.keys(preset)); setEditing('idle'); setPreview('idle') }}>{name}</button>)}</div>
    <div className="button-state-tabs">{stateOrder.map((name) => <button key={name} className={editing === name ? 'active' : ''} onClick={() => { setEditing(name); setPreview(name) }}><i />{name}</button>)}<button className="state-add" onClick={addState}><Plus size={12} />Add</button><button className="state-remove" disabled={stateOrder.length <= 2} onClick={removeState}><Minus size={12} />Delete</button></div>
    <div className="web-studio-grid web-natural-grid button-builder-layout">
      <aside className="web-controls">
        <div className="web-control-head"><span>{editing.toUpperCase()} STATE</span><small>文字 / 图标 / 颜色</small></div>
        <TextField label="状态文字" value={current.label} onChange={(value) => update('label', value)} />
        <SelectField label="状态内容" value={current.icon} onChange={(value) => update('icon', value as ButtonState['icon'])}><option value="none">仅文字 / 无图标</option><option value="arrow">文字 + 箭头</option><option value="dots">动态圆点</option><option value="spinner">加载旋转</option><option value="check">成功勾选</option><option value="cross">错误叉号</option></SelectField>
        <div className="web-field-pair"><ColorField label="背景起点" value={current.background} onChange={(value) => update('background', value)} /><ColorField label="背景终点" value={current.gradient} onChange={(value) => update('gradient', value)} /></div>
        <div className="web-field-pair"><ColorField label="文字" value={current.foreground} onChange={(value) => update('foreground', value)} /><ColorField label="边框" value={current.border} onChange={(value) => update('border', value)} /></div>
        <Toggle label="使用渐变背景" checked={gradient} onChange={setGradient} />
        <RangeField label="状态缩放" value={current.scale} min={.88} max={1.12} step={.01} onChange={(value) => update('scale', value)} />
        <div className="control-divider"><span>COMMON GEOMETRY</span></div>
        <div className="web-field-pair"><NumberField label="高度" value={height} min={32} max={100} unit="px" onChange={setHeight} /><NumberField label="水平留白" value={padding} min={8} max={80} unit="px" onChange={setPadding} /></div>
        <div className="web-field-pair"><NumberField label="字号" value={fontSize} min={10} max={30} unit="px" onChange={setFontSize} /><NumberField label="边框" value={borderWidth} min={0} max={8} unit="px" onChange={setBorderWidth} /></div>
        <RangeField label="圆角" value={radius} min={0} max={50} unit="px" onChange={setRadius} />
        <div className="control-divider"><span>BEHAVIOUR & MOTION</span></div>
        <SelectField label="宽度形态" value={widthMode} onChange={(value) => setWidthMode(value as typeof widthMode)}>{['auto', 'full', 'pill', 'circle'].map((value) => <option key={value}>{value}</option>)}</SelectField>
        <SelectField label="点击动画" value={clickAnimation} onChange={(value) => setClickAnimation(value as typeof clickAnimation)}>{['none', 'shimmer', 'ripple', 'bounce', 'scale', 'glow'].map((value) => <option key={value}>{value}</option>)}</SelectField>
        <SelectField label="Hover 效果" value={hoverEffect} onChange={(value) => setHoverEffect(value as typeof hoverEffect)}>{['none', 'scale', 'lift', 'ring', 'bright'].map((value) => <option key={value}>{value}</option>)}</SelectField>
        <div className="web-field-pair"><SelectField label="过渡曲线" value={easing} onChange={(value) => setEasing(value as typeof easing)}>{['spring', 'ease', 'linear', 'bounce', 'snap', 'gentle'].map((value) => <option key={value}>{value}</option>)}</SelectField><SelectField label="速度" value={speed} onChange={(value) => setSpeed(value as typeof speed)}>{['quick', 'normal', 'slow'].map((value) => <option key={value}>{value}</option>)}</SelectField></div>
        <div className="web-field-pair"><SelectField label="字重" value={String(fontWeight)} onChange={(value) => setFontWeight(Number(value))}>{[400, 500, 600, 700].map((value) => <option key={value}>{value}</option>)}</SelectField><NumberField label="字距" value={letterSpacing} min={-2} max={8} step={.1} unit="px" onChange={setLetterSpacing} /></div>
        <div className="web-field-pair"><SelectField label="阴影" value={shadowStyle} onChange={(value) => setShadowStyle(value as typeof shadowStyle)}>{['none', 'sm', 'md', 'lg', 'glow'].map((value) => <option key={value}>{value}</option>)}</SelectField><SelectField label="边框 / Ring" value={ringStyle} onChange={(value) => setRingStyle(value as typeof ringStyle)}>{['none', 'ring', 'outline'].map((value) => <option key={value}>{value}</option>)}</SelectField></div>
      </aside>
      <section className="web-preview button-preview button-flow-preview">
        <div className="web-preview-static"><span>INTERACTIVE FLOW</span><code>{preview}</code></div>
        <button key={motionKey} className={`motion-${clickAnimation} hover-${hoverEffect} ring-${ringStyle}`} disabled={preview === 'disabled'} onClick={simulate} style={{ position: 'relative', overflow: 'hidden', width: widthValue, maxWidth: '100%', minWidth: widthMode === 'circle' ? height : 0, height, paddingInline: widthMode === 'circle' ? 0 : padding, borderRadius: radiusValue, fontSize, fontWeight, letterSpacing, borderWidth: ringStyle === 'outline' ? Math.max(2, borderWidth) : borderWidth, outline: ringStyle === 'ring' ? `4px solid ${shown.border}44` : undefined, boxShadow: shadowValueButton, transition: `${durationValue}ms ${easingValue}`, background: background(shown), color: shown.foreground, borderColor: shown.border, transform: `scale(${shown.scale})` }}>{buttonIcon(shown.icon)}{widthMode !== 'circle' && <span>{shown.label}</span>}</button>
        <div className="button-flow-controls"><Segments value={outcome} options={[{ value: 'success', label: '完成 → success' }, { value: 'error', label: '完成 → error' }]} onChange={setOutcome} /><NumberField label="状态耗时" value={delay} min={200} max={5000} step={100} unit="ms" onChange={setDelay} /><div className="button-flow-actions"><button onClick={playAll}><Play size={13} />播放全部</button><button onClick={() => setPreview('idle')}><RotateCcw size={14} />重置</button></div></div>
        <p>点击按钮运行 idle → loading → {outcome}，也可从顶部强制预览任一状态。</p>
      </section>
    </div>
    <ResultPanel title="HTML + CSS + JavaScript" value={bundle} language="WEB" note="可直接保存为 HTML 运行" />
  </div>
}

type ShadowLayer = { x: number; y: number; blur: number; spread: number; color: string; opacity: number; inset: boolean; active: boolean }
const shadowLayer = (x: number, y: number, blur: number, spread: number, color: string, opacity = 1, inset = false): ShadowLayer => ({ x, y, blur, spread, color, opacity, inset, active: true })
const DEFAULT_BOX: ShadowLayer[] = [shadowLayer(0, 10, 15, -3, '#000000', .1)]
const BOX_PRESETS: Record<string, ShadowLayer[]> = {
  Hover: [shadowLayer(0, 10, 13, -7, '#000000')],
  Sides: [shadowLayer(-10, 0, 13, -7, '#000000'), shadowLayer(10, 0, 13, -7, '#000000')],
  Button: [shadowLayer(-1, 3, 8, 5, '#1f87ff', 1, true), shadowLayer(2, 5, 16, 0, '#0b325e')],
  Mirrors: [shadowLayer(2, 2, 2, 2, '#1c6ea4', 1, true), shadowLayer(11, 11, 2, 0, '#2285c7', 1, true), shadowLayer(20, 20, 2, 1, '#289dea', 1, true), shadowLayer(29, 29, 2, 1, '#57bbea', 1, true)],
  'In&Out': [shadowLayer(5, 5, 5, 0, '#000000'), shadowLayer(4, 4, 15, 0, '#000000', 1, true)],
  Gradient: [shadowLayer(0, 0, 0, 5, '#a0a0a0'), shadowLayer(0, 10, 27, -8, '#141414', 1, true), shadowLayer(0, -10, 27, -8, '#a31925', 1, true)],
  Pile: [5, 10, 15, 20, 25].map((value, index) => shadowLayer(value, value, 0, 0, ['#289fed', '#5fb8ff', '#a1d8ff', '#cae6ff', '#e1eeff'][index])),
  Checker: Array.from({ length: 16 }, (_, index) => { const column = index % 4; const row = Math.floor(index / 4); return shadowLayer(column * 10, row * 10, 0, 0, (column + row) % 2 ? '#000000' : '#f0f0f0') }),
  Borders: [shadowLayer(8, 0, 0, 0, '#dcd0c0'), shadowLayer(0, 8, 0, 0, '#b1938b'), shadowLayer(-8, 0, 0, 0, '#4e4e56'), shadowLayer(0, 0, 0, 8, '#da635d')],
  Rainbow: [[7, -5, '#4b0082'], [11, -9, '#0000ff'], [16, -14, '#00ff00'], [20, -17, '#ffff00'], [24, -19, '#ff7f00'], [27, -23, '#ff0000']].map(([x, y, color]) => shadowLayer(Number(x), Number(y), 10, 0, String(color))),
  Candy: [[5, 5, 15, 5, '#ff8080'], [-9, 5, 15, 5, '#ffe488'], [-7, -5, 15, 5, '#8cff85'], [12, -5, 15, 5, '#80c7ff'], [12, 10, 15, 7, '#e488ff'], [-10, 10, 15, 7, '#ff616b'], [-10, -7, 27, 1, '#8e5cff']].map(([x, y, blur, spread, color]) => shadowLayer(Number(x), Number(y), Number(blur), Number(spread), String(color))),
  Flames: [[4, -4, 15, '#ff1f1f'], [12, -11, 7, '#ff9376'], [20, -5, 7, '#ffe264'], [20, 6, 7, '#f6ff33'], [13, 12, 17, '#ff9527'], [2, 17, 17, '#ff0000'], [-9, 21, 18, '#fff212'], [-9, 6, 11, '#ff0808'], [-11, -9, 11, '#fffa17']].map(([x, y, blur, color]) => shadowLayer(Number(x), Number(y), Number(blur), 0, String(color))),
  Candle: [shadowLayer(0, -1, 4, 0, '#ffffff'), shadowLayer(0, -2, 10, 0, '#ffff00'), shadowLayer(0, -10, 20, 0, '#ff8000'), shadowLayer(0, -18, 40, 0, '#ff0000')],
  Well: [shadowLayer(0, 0, 0, 8, '#000000'), shadowLayer(0, 0, 0, 16, '#4b4c4b'), shadowLayer(0, 0, 0, 24, '#828482'), shadowLayer(0, 0, 0, 31, '#b2b5b2'), shadowLayer(0, 0, 0, 39, '#daddda')],
  Pyramid: Array.from({ length: 10 }, (_, index) => shadowLayer(0, (index + 1) * 3, 0, (index + 1) * 2, '#000000', .1)),
  Target: [shadowLayer(0, 20, 0, -10, '#ffffff'), shadowLayer(0, -20, 0, -10, '#ffffff'), shadowLayer(20, 0, 0, -10, '#ffffff'), shadowLayer(-20, 0, 0, -10, '#ffffff'), shadowLayer(0, 0, 0, 10, '#ff0000')],
  Soft: [shadowLayer(0, 24, 60, -18, '#000000', .28)],
  Neon: [shadowLayer(0, 0, 12, 2, '#7df9ff', .65), shadowLayer(0, 0, 42, 4, '#6c5cff', .45)],
}
const TEXT_PRESETS: Record<string, { layers: ShadowLayer[]; foreground: string; background: string }> = {
  Neon: { layers: [{ x: 0, y: 0, blur: 8, spread: 0, color: '#ffffff', opacity: .9, inset: false, active: true }, { x: 0, y: 0, blur: 24, spread: 0, color: '#7df9ff', opacity: .9, inset: false, active: true }], foreground: '#f4ffff', background: '#090d16' },
  Retro: { layers: [{ x: 3, y: 3, blur: 0, spread: 0, color: '#ff6fae', opacity: 1, inset: false, active: true }, { x: 6, y: 6, blur: 0, spread: 0, color: '#7df9ff', opacity: 1, inset: false, active: true }], foreground: '#fff2a8', background: '#25154a' },
  Outline: { layers: [-1, 1].flatMap((x) => [-1, 1].map((y) => ({ x, y, blur: 0, spread: 0, color: '#111111', opacity: 1, inset: false, active: true }))), foreground: '#ffffff', background: '#b8f35d' },
  Floating: { layers: [{ x: 0, y: 16, blur: 18, spread: 0, color: '#000000', opacity: .3, inset: false, active: true }], foreground: '#ffffff', background: '#7c5cff' },
  Emboss: { layers: [{ x: -2, y: -2, blur: 2, spread: 0, color: '#ffffff', opacity: .65, inset: false, active: true }, { x: 2, y: 2, blur: 2, spread: 0, color: '#000000', opacity: .45, inset: false, active: true }], foreground: '#9ca5a0', background: '#9ca5a0' },
  Deep: { layers: Array.from({ length: 8 }, (_, index) => ({ x: index + 1, y: index + 1, blur: 0, spread: 0, color: '#18231b', opacity: 1, inset: false, active: true })), foreground: '#b8f35d', background: '#101411' },
  Candy: { layers: [{ x: 2, y: 2, blur: 0, spread: 0, color: '#ff5fa2', opacity: 1, inset: false, active: true }, { x: 4, y: 4, blur: 0, spread: 0, color: '#6ae4ff', opacity: 1, inset: false, active: true }, { x: 6, y: 6, blur: 0, spread: 0, color: '#fff28a', opacity: 1, inset: false, active: true }], foreground: '#ffffff', background: '#6b42d8' },
  Cartoon: { layers: [{ x: 2, y: 2, blur: 0, spread: 0, color: '#151515', opacity: 1, inset: false, active: true }, { x: 4, y: 4, blur: 0, spread: 0, color: '#151515', opacity: 1, inset: false, active: true }, { x: 6, y: 6, blur: 0, spread: 0, color: '#151515', opacity: 1, inset: false, active: true }], foreground: '#ffd84d', background: '#ff6f61' },
  Glowing: { layers: [{ x: 0, y: 0, blur: 5, spread: 0, color: '#ffffff', opacity: 1, inset: false, active: true }, { x: 0, y: 0, blur: 18, spread: 0, color: '#ff3ea5', opacity: .95, inset: false, active: true }, { x: 0, y: 0, blur: 42, spread: 0, color: '#7a38ff', opacity: .8, inset: false, active: true }], foreground: '#ffffff', background: '#140b25' },
  Pressed: { layers: [{ x: 1, y: 1, blur: 1, spread: 0, color: '#ffffff', opacity: .55, inset: false, active: true }, { x: -1, y: -1, blur: 1, spread: 0, color: '#000000', opacity: .5, inset: false, active: true }], foreground: '#5b6470', background: '#87919d' },
  Blurry: { layers: [{ x: 0, y: 8, blur: 3, spread: 0, color: '#000000', opacity: .18, inset: false, active: true }, { x: 0, y: 20, blur: 22, spread: 0, color: '#000000', opacity: .42, inset: false, active: true }], foreground: '#f8fafc', background: '#526273' },
  Comic: { layers: [{ x: 3, y: 3, blur: 0, spread: 0, color: '#111111', opacity: 1, inset: false, active: true }, { x: 7, y: 7, blur: 0, spread: 0, color: '#e42929', opacity: 1, inset: false, active: true }], foreground: '#fff044', background: '#2a77d4' },
  Flaming: { layers: [shadowLayer(0, -1, 4, 0, '#ffffff'), shadowLayer(0, -2, 10, 0, '#ffff00'), shadowLayer(0, -10, 20, 0, '#ff8000'), shadowLayer(0, -18, 40, 0, '#ff0000')], foreground: '#ffffff', background: '#333333' },
  Tactile: { layers: [shadowLayer(-1, -1, 1, 0, '#ffffff', .1), shadowLayer(1, 1, 1, 0, '#000000', .5)], foreground: '#d9d9d9', background: '#e8e8e8' },
  News: { layers: [shadowLayer(2, 2, 0, 0, '#ffffff'), shadowLayer(5, 4, 0, 0, '#000000', .15)], foreground: '#333333', background: '#ffffff' },
  Eighties: { layers: [shadowLayer(2, 2, 0, 0, '#bcbcbc'), shadowLayer(4, 4, 0, 0, '#9c9c9c')], foreground: '#000000', background: '#ffffff' },
  Distant: { layers: [shadowLayer(1, 3, 0, 0, '#969696'), shadowLayer(1, 13, 5, 0, '#aba8a8')], foreground: '#ffffff', background: '#ffffff' },
  Blocks: { layers: [0, 1, 2, 3, 4, 5].map((index) => shadowLayer(0, index + 1, index === 5 ? 1 : 0, 0, ['#cccccc', '#c9c9c9', '#bbbbbb', '#b9b9b9', '#aaaaaa', '#000000'][index], index === 5 ? .1 : 1)), foreground: '#ffffff', background: '#0e8dbc' },
  Grave: { layers: Array.from({ length: 8 }, (_, index) => shadowLayer(-index, index + 1, 0, 0, index % 2 ? '#cdd2d5' : '#808d93')), foreground: '#202c2d', background: '#ffffff' },
  Solid: { layers: [shadowLayer(3, 5, 2, 0, '#474747')], foreground: '#ffffff', background: '#996d6d' },
  Vegas: { layers: [shadowLayer(0, 0, 5, 0, '#ffffff'), shadowLayer(0, 0, 10, 0, '#ffffff'), shadowLayer(0, 0, 20, 0, '#ff2d95'), shadowLayer(0, 0, 40, 0, '#ff2d95'), shadowLayer(0, 0, 75, 0, '#ff2d95')], foreground: '#ffffff', background: '#333333' },
  Mummy: { layers: [shadowLayer(-4, 3, 0, 0, '#3a50d9'), shadowLayer(-14, 7, 0, 0, '#0a0e27')], foreground: '#e0eff2', background: '#3a50d9' },
  Hero: { layers: [shadowLayer(-5, 5, 0, 0, '#00e6e6'), shadowLayer(-10, 10, 0, 0, '#01cccc'), shadowLayer(-15, 15, 0, 0, '#00bdbd')], foreground: '#ffffff', background: '#005dff' },
  Carve: { layers: [shadowLayer(0, 3, 3, 0, '#ffffff', .5)], foreground: '#666666', background: '#666666' },
  Ghost: { layers: Array.from({ length: 10 }, (_, index) => shadowLayer(index - 4, 4 - index, 0, 0, index < 4 ? '#b3b3b3' : '#4d4d4d', .2 + index * .08)), foreground: '#ffffff', background: '#666666' },
}

function shadowValue(layer: ShadowLayer, text = false) {
  return `${text || !layer.inset ? '' : 'inset '}${layer.x}px ${layer.y}px ${layer.blur}px${text ? '' : ` ${layer.spread}px`} ${rgba(layer.color, layer.opacity)}`
}

function ShadowControls({ layers, setLayers, text = false }: { layers: ShadowLayer[]; setLayers: (layers: ShadowLayer[]) => void; text?: boolean }) {
  const [selected, setSelected] = useState(0)
  const currentIndex = Math.min(selected, layers.length - 1)
  const layer = layers[currentIndex]
  const update = <K extends keyof ShadowLayer>(key: K, value: ShadowLayer[K]) => setLayers(layers.map((item, index) => index === currentIndex ? { ...item, [key]: value } : item))
  const add = () => { setLayers([...layers, { x: 0, y: text ? 4 : 18, blur: text ? 8 : 32, spread: 0, color: '#000000', opacity: .4, inset: false, active: true }]); setSelected(layers.length) }
  const remove = () => { if (layers.length === 1) return; setLayers(layers.filter((_, index) => index !== currentIndex)); setSelected(Math.max(0, currentIndex - 1)) }
  return <aside className="web-controls shadow-controls"><div className="web-control-head"><span>SHADOW LAYERS</span><div><button onClick={add}><Plus size={13} /></button><button disabled={layers.length === 1} onClick={remove}><Minus size={13} /></button></div></div><div className="shadow-layer-tabs">{layers.map((item, index) => <button key={index} className={currentIndex === index ? 'active' : ''} onClick={() => setSelected(index)}><i style={{ opacity: item.active ? 1 : .3, boxShadow: text ? undefined : shadowValue(item), textShadow: text ? shadowValue(item, true) : undefined }}>{text ? 'Aa' : ''}</i><span>Layer {index + 1}</span></button>)}</div><Toggle label="启用当前阴影" checked={layer.active} onChange={(value) => update('active', value)} /><RangeField label="水平偏移" value={layer.x} min={-80} max={80} unit="px" onChange={(value) => update('x', value)} /><RangeField label="垂直偏移" value={layer.y} min={-80} max={80} unit="px" onChange={(value) => update('y', value)} /><RangeField label="模糊" value={layer.blur} min={0} max={120} unit="px" onChange={(value) => update('blur', value)} />{!text && <RangeField label="扩散" value={layer.spread} min={-60} max={80} unit="px" onChange={(value) => update('spread', value)} />}<RangeField label="不透明度" value={layer.opacity} min={0} max={1} step={.01} onChange={(value) => update('opacity', value)} /><ColorField label="颜色" value={layer.color} onChange={(value) => update('color', value)} />{!text && <Toggle label="内阴影 inset" checked={layer.inset} onChange={(value) => update('inset', value)} />}</aside>
}

export function BoxShadowPage() {
  const [layers, setLayers] = useState(DEFAULT_BOX)
  const [canvas, setCanvas] = useState('#e6e9e4')
  const [surface, setSurface] = useState('#ffffff')
  const [border, setBorder] = useState('#d5dbd3')
  const [radius, setRadius] = useState(32)
  const [width, setWidth] = useState(320)
  const [height, setHeight] = useState(240)
  const activeLayers = layers.filter((layer) => layer.active)
  const shadow = activeLayers.length ? activeLayers.map((layer) => shadowValue(layer)).join(',\n  ') : 'none'
  const css = `.shadow-box {
  width: ${width}px;
  height: ${height}px;
  background: ${surface};
  border: 1px solid ${border};
  border-radius: ${radius}px;
  box-shadow:
  ${shadow};
}`
  return <div className="web-tool shadow-tool"><div className="preset-toolbar"><span>PRESETS</span>{Object.entries(BOX_PRESETS).map(([name, value]) => <button key={name} onClick={() => setLayers(value)}>{name}</button>)}</div><div className="web-studio-grid web-natural-grid"><ShadowControls layers={layers} setLayers={setLayers} /><section className="shadow-workspace"><div className="shadow-box-properties"><div className="web-field-pair"><ColorField label="画布" value={canvas} onChange={setCanvas} /><ColorField label="元素背景" value={surface} onChange={setSurface} /></div><ColorField label="边框" value={border} onChange={setBorder} /><div className="web-field-pair"><NumberField label="宽度" value={width} min={80} max={720} unit="px" onChange={setWidth} /><NumberField label="高度" value={height} min={80} max={520} unit="px" onChange={setHeight} /></div><RangeField label="圆角" value={radius} min={0} max={120} unit="px" onChange={setRadius} /></div><div className="shadow-stage" style={{ backgroundColor: canvas }}><div style={{ width: `min(${width}px, 82%)`, height, maxHeight: 420, background: surface, borderColor: border, borderRadius: radius, boxShadow: activeLayers.map((layer) => shadowValue(layer)).join(', ') }}><span>BOX SHADOW</span><strong>Visible<br />depth</strong><small>{activeLayers.length} active / {layers.length} total</small></div></div></section></div><ResultPanel title="格式化 Box Shadow CSS" value={css} note={`${activeLayers.length} 个启用图层 · ${width}×${height}px`} /></div>
}

export function TextShadowPage() {
  const [layers, setLayers] = useState(TEXT_PRESETS.Neon.layers)
  const [text, setText] = useState('LUMEN')
  const [foreground, setForeground] = useState(TEXT_PRESETS.Neon.foreground)
  const [background, setBackground] = useState(TEXT_PRESETS.Neon.background)
  const [size, setSize] = useState(112)
  const activeLayers = layers.filter((layer) => layer.active)
  const shadow = activeLayers.length ? activeLayers.map((layer) => shadowValue(layer, true)).join(',\n  ') : 'none'
  const css = `.shadow-text {
  color: ${foreground};
  font-size: ${size}px;
  text-shadow:
  ${shadow};
}`
  const applyPreset = (name: string) => { const preset = TEXT_PRESETS[name]; setLayers(preset.layers); setForeground(preset.foreground); setBackground(preset.background) }
  return <div className="web-tool text-shadow-tool"><div className="preset-toolbar text-effect-gallery"><span>EFFECT GALLERY</span>{Object.keys(TEXT_PRESETS).map((name) => <button key={name} onClick={() => applyPreset(name)}>{name}</button>)}</div><div className="web-studio-grid web-natural-grid"><ShadowControls layers={layers} setLayers={setLayers} text /><section className="text-shadow-workspace"><div className="text-shadow-properties"><TextField label="预览文字" value={text} onChange={setText} /><div className="web-field-pair"><ColorField label="文字" value={foreground} onChange={setForeground} /><ColorField label="背景" value={background} onChange={setBackground} /></div><RangeField label="字号" value={size} min={28} max={180} unit="px" onChange={setSize} /></div><div className="text-shadow-stage" style={{ background }}><span style={{ color: foreground, fontSize: `min(${size}px, 18vw)`, textShadow: activeLayers.map((layer) => shadowValue(layer, true)).join(', ') }}>{text || 'LUMEN'}</span></div></section></div><ResultPanel title="格式化 Text Shadow CSS" value={css} note={`${activeLayers.length} 个启用图层 · ${size}px`} /></div>
}

type RadiusValues = [number, number, number, number, number, number, number, number]
const RADIUS_PRESETS: Record<string, RadiusValues> = { Uniform: [24, 24, 24, 24, 24, 24, 24, 24], Organic: [32, 68, 42, 58, 62, 38, 72, 28], Capsule: [50, 50, 50, 50, 50, 50, 50, 50], Leaf: [100, 0, 100, 0, 100, 0, 100, 0] }

export function BorderRadiusPage() {
  const [values, setValues] = useState<RadiusValues>(RADIUS_PRESETS.Organic)
  const [linked, setLinked] = useState(false)
  const [unit, setUnit] = useState<'%' | 'px'>('%')
  const [width, setWidth] = useState(430)
  const [height, setHeight] = useState(360)
  const [color, setColor] = useState('#b8f35d')
  const [border, setBorder] = useState('#85bd32')
  const [borderWidth, setBorderWidth] = useState(2)
  const max = unit === '%' ? 100 : 240
  const horizontal = values.slice(0, 4).map((value) => `${value}${unit}`).join(' ')
  const vertical = values.slice(4).map((value) => `${value}${unit}`).join(' ')
  const sameAxes = values.slice(0, 4).every((value, index) => value === values[index + 4])
  const radius = sameAxes ? horizontal : `${horizontal} / ${vertical}`
  const css = `.rounded-shape {
  width: ${width}px;
  height: ${height}px;
  background: ${color};
  border: ${borderWidth}px solid ${border};
  border-radius: ${radius};
}`
  const update = (index: number, value: number) => setValues((items) => { const next = [...items] as RadiusValues; next[index] = value; if (linked) next[(index + 4) % 8] = value; return next })
  const switchUnit = (next: '%' | 'px') => { if (next === unit) return; setValues((items) => items.map((value) => Math.round(next === 'px' ? value / 100 * Math.min(width, height) : value / Math.min(width, height) * 100)) as RadiusValues); setUnit(next) }
  const corners = [{ label: '左上角', x: 0, y: 4 }, { label: '右上角', x: 1, y: 5 }, { label: '右下角', x: 2, y: 6 }, { label: '左下角', x: 3, y: 7 }]
  return <div className="web-tool radius-tool"><div className="preset-toolbar"><span>SHAPES</span>{Object.entries(RADIUS_PRESETS).map(([name, preset]) => <button key={name} onClick={() => setValues(preset)}>{name}</button>)}</div><div className="radius-layout radius-expanded-layout"><section className="radius-preview"><div className="web-preview-static"><span>LIVE SHAPE</span><code>默认画布 {width} × {height}px</code></div><div className="radius-dimension-frame" style={{ width: `min(${width}px, 82%)`, height, maxHeight: 460 }}><span className="dimension-width">{width}px</span><span className="dimension-height">{height}px</span><div className="radius-object" style={{ width: '100%', height: '100%', borderRadius: radius, background: color, borderColor: border, borderWidth }}><span>8 AXIS · {unit}</span><strong>Elliptical<br />corners</strong></div></div></section><aside className="radius-controls"><div className="web-control-head"><span>CORNER AXES</span><small>{radius}</small></div><div className="web-field-pair"><Segments value={unit} options={[{ value: '%', label: '百分比' }, { value: 'px', label: '像素' }]} onChange={switchUnit} /><Toggle label="同步每角 X / Y" checked={linked} onChange={setLinked} /></div><div className="web-field-pair"><NumberField label="宽度" value={width} min={80} max={900} unit="px" onChange={setWidth} /><NumberField label="高度" value={height} min={80} max={700} unit="px" onChange={setHeight} /></div><div className="web-field-pair"><ColorField label="填充" value={color} onChange={setColor} /><ColorField label="边框" value={border} onChange={setBorder} /></div><RangeField label="边框宽度" value={borderWidth} min={0} max={20} unit="px" onChange={setBorderWidth} /><div className="radius-corner-grid">{corners.map((corner) => <section key={corner.label}><header><span>{corner.label}</span><code>{values[corner.x]} × {values[corner.y]}{unit}</code></header><RangeField label="X 横向" value={values[corner.x]} min={0} max={max} unit={unit} onChange={(next) => update(corner.x, next)} /><RangeField label="Y 纵向" value={values[corner.y]} min={0} max={max} unit={unit} onChange={(next) => update(corner.y, next)} /></section>)}</div></aside></div><ResultPanel title="格式化 Border Radius CSS" value={css} note={`四角 X/Y 成组 · ${unit} · ${width}×${height}px`} /></div>
}
