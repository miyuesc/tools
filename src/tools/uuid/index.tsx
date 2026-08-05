import { WandSparkles } from 'lucide-react'
import { useState } from 'react'
import { CopyButton } from '../shared/EditorPanel'

export default function UuidToolPage() {
  const [count, setCount] = useState(5)
  const [values, setValues] = useState(() => Array.from({ length: 5 }, () => crypto.randomUUID()))
  const generate = () => setValues(Array.from({ length: count }, () => crypto.randomUUID()))
  return <><div className="generator-controls"><label>生成数量 <input type="number" min="1" max="50" value={count} onChange={(event) => setCount(Math.max(1, Math.min(50, Number(event.target.value))))} /></label><button className="primary-action" onClick={generate}><WandSparkles size={16} />重新生成</button><CopyButton value={values.join('\n')} /></div><div className="result-lines">{values.map((value, index) => <div key={value}><span>{String(index + 1).padStart(2, '0')}</span><code>{value}</code><CopyButton value={value} /></div>)}</div></>
}
