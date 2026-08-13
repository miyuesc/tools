export type Ipv4Range = { start: number; end: number }

export function ipv4Parts(value: string) {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value.trim())) return null
  const parts = value.trim().split('.').map(Number)
  return parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255) ? parts : null
}

export function ipv4Int(parts: number[]) {
  return (((parts[0] * 256 + parts[1]) * 256 + parts[2]) * 256 + parts[3]) >>> 0
}

export function intIpv4(value: number) {
  const normalized = value >>> 0
  return [normalized >>> 24, (normalized >>> 16) & 255, (normalized >>> 8) & 255, normalized & 255].join('.')
}

export function parseIpv4Cidr(value: string): Ipv4Range & { prefix: number; cidr: string } {
  const [address, prefixText, extra] = value.trim().split('/')
  if (extra !== undefined) throw new Error(`${value} 包含多余的 /`)
  const parts = ipv4Parts(address)
  if (!parts) throw new Error(`${address || '空地址'} 不是有效 IPv4 地址`)
  const prefix = prefixText === undefined || prefixText === '' ? 32 : Number(prefixText)
  if (!/^\d{1,2}$/.test(prefixText ?? '32') || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) throw new Error(`${prefixText || '空前缀'} 不是 0–32 的前缀长度`)
  const valueInt = ipv4Int(parts)
  const blockSize = 2 ** (32 - prefix)
  const start = Math.floor(valueInt / blockSize) * blockSize
  const end = start + blockSize - 1
  return { start, end, prefix, cidr: `${intIpv4(start)}/${prefix}` }
}

export function parseIpv4List(value: string) {
  const items = value.split(/[\s,;]+/).map((item) => item.trim()).filter(Boolean)
  if (!items.length) throw new Error('请输入至少一个 IPv4 地址或 CIDR')
  if (items.length > 4096) throw new Error(`一次最多处理 4,096 个地址或网段；当前为 ${items.length.toLocaleString()} 个`)
  return items.map(parseIpv4Cidr)
}

export function mergeRanges(ranges: Ipv4Range[]) {
  const sorted = ranges.map((item) => ({ ...item })).sort((left, right) => left.start - right.start || left.end - right.end)
  const merged: Ipv4Range[] = []
  for (const range of sorted) {
    const last = merged.at(-1)
    if (last && range.start <= last.end + 1) last.end = Math.max(last.end, range.end)
    else merged.push(range)
  }
  return merged
}

export function rangeToCidrs(range: Ipv4Range) {
  const result: string[] = []
  let cursor = range.start
  while (cursor <= range.end) {
    let blockSize = cursor === 0 ? 2 ** 32 : 1
    if (cursor !== 0) while (blockSize < 2 ** 32 && cursor % (blockSize * 2) === 0) blockSize *= 2
    const remaining = range.end - cursor + 1
    while (blockSize > remaining) blockSize /= 2
    const prefix = 32 - Math.log2(blockSize)
    result.push(`${intIpv4(cursor)}/${prefix}`)
    cursor += blockSize
  }
  return result
}

export function mergeCidrs(value: string) {
  return mergeRanges(parseIpv4List(value)).flatMap(rangeToCidrs)
}

export function splitCidr(value: string, targetPrefix: number, limit = 4096) {
  const source = parseIpv4Cidr(value)
  if (!Number.isInteger(targetPrefix) || targetPrefix < source.prefix || targetPrefix > 32) throw new Error(`拆分前缀必须在 ${source.prefix}–32 之间`)
  const count = 2 ** (targetPrefix - source.prefix)
  if (count > limit) throw new Error(`该拆分会生成 ${count.toLocaleString()} 个网段，超过 ${limit.toLocaleString()} 个安全上限`)
  const blockSize = 2 ** (32 - targetPrefix)
  return Array.from({ length: count }, (_, index) => `${intIpv4(source.start + index * blockSize)}/${targetPrefix}`)
}

export function excludeCidrs(baseValue: string, exclusionValue: string) {
  const bases = mergeRanges(parseIpv4List(baseValue))
  const exclusions = mergeRanges(parseIpv4List(exclusionValue))
  const remaining: Ipv4Range[] = []
  for (const base of bases) {
    let fragments: Ipv4Range[] = [base]
    for (const exclusion of exclusions) {
      fragments = fragments.flatMap((fragment) => {
        if (exclusion.end < fragment.start || exclusion.start > fragment.end) return [fragment]
        const next: Ipv4Range[] = []
        if (exclusion.start > fragment.start) next.push({ start: fragment.start, end: exclusion.start - 1 })
        if (exclusion.end < fragment.end) next.push({ start: exclusion.end + 1, end: fragment.end })
        return next
      })
      if (!fragments.length) break
    }
    remaining.push(...fragments)
  }
  const result = mergeRanges(remaining).flatMap(rangeToCidrs)
  if (result.length > 4096) throw new Error(`排除结果会生成 ${result.length.toLocaleString()} 个网段，超过 4,096 个安全上限`)
  return result
}
