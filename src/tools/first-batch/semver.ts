export type SemVer = {
  major: number
  minor: number
  patch: number
  prerelease: string[]
  build: string[]
}

const SEMVER_PATTERN = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/

export function parseSemVer(value: string): SemVer | null {
  const match = value.trim().match(SEMVER_PATTERN)
  if (!match) return null
  const prerelease = match[4]?.split('.') || []
  if (prerelease.some((part) => /^\d+$/.test(part) && part.length > 1 && part.startsWith('0'))) return null
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease,
    build: match[5]?.split('.') || [],
  }
}

export function stringifySemVer(version: SemVer) {
  const prerelease = version.prerelease.length ? `-${version.prerelease.join('.')}` : ''
  const build = version.build.length ? `+${version.build.join('.')}` : ''
  return `${version.major}.${version.minor}.${version.patch}${prerelease}${build}`
}

function compareIdentifier(left: string, right: string) {
  const leftNumber = /^\d+$/.test(left)
  const rightNumber = /^\d+$/.test(right)
  if (leftNumber && rightNumber) return Number(left) - Number(right)
  if (leftNumber !== rightNumber) return leftNumber ? -1 : 1
  return left.localeCompare(right)
}

export function compareSemVer(left: SemVer, right: SemVer) {
  for (const key of ['major', 'minor', 'patch'] as const) {
    const difference = left[key] - right[key]
    if (difference) return Math.sign(difference)
  }
  if (!left.prerelease.length && !right.prerelease.length) return 0
  if (!left.prerelease.length) return 1
  if (!right.prerelease.length) return -1
  const length = Math.max(left.prerelease.length, right.prerelease.length)
  for (let index = 0; index < length; index += 1) {
    if (left.prerelease[index] === undefined) return -1
    if (right.prerelease[index] === undefined) return 1
    const difference = compareIdentifier(left.prerelease[index], right.prerelease[index])
    if (difference) return Math.sign(difference)
  }
  return 0
}

function comparatorMatches(version: SemVer, operator: string, target: SemVer) {
  const comparison = compareSemVer(version, target)
  if (operator === '>') return comparison > 0
  if (operator === '>=') return comparison >= 0
  if (operator === '<') return comparison < 0
  if (operator === '<=') return comparison <= 0
  return comparison === 0
}

function expandPartial(raw: string): { lower: SemVer; upper?: SemVer } | null {
  const clean = raw.trim().replace(/^v/, '')
  const parts = clean.split('.')
  if (parts.length > 3 || parts.some((part) => !/^(?:\d+|x|X|\*)$/.test(part))) return null
  const wildcardIndex = parts.findIndex((part) => /^(?:x|X|\*)$/.test(part))
  const numeric = parts.slice(0, wildcardIndex < 0 ? parts.length : wildcardIndex).map(Number)
  if (!numeric.length) return { lower: { major: 0, minor: 0, patch: 0, prerelease: [], build: [] } }
  const lower: SemVer = { major: numeric[0] || 0, minor: numeric[1] || 0, patch: numeric[2] || 0, prerelease: [], build: [] }
  if (wildcardIndex < 0 && parts.length === 3) return { lower }
  if (numeric.length === 1) return { lower, upper: { major: lower.major + 1, minor: 0, patch: 0, prerelease: [], build: [] } }
  return { lower, upper: { major: lower.major, minor: lower.minor + 1, patch: 0, prerelease: [], build: [] } }
}

function tokenMatches(version: SemVer, token: string) {
  const trimmed = token.trim()
  if (!trimmed || trimmed === '*' || /^x$/i.test(trimmed)) return true
  const caret = trimmed.startsWith('^')
  const tilde = trimmed.startsWith('~')
  if (caret || tilde) {
    const target = parseSemVer(trimmed.slice(1))
    if (!target || compareSemVer(version, target) < 0) return false
    const upper = caret
      ? target.major > 0
        ? { ...target, major: target.major + 1, minor: 0, patch: 0, prerelease: [], build: [] }
        : target.minor > 0
          ? { ...target, minor: target.minor + 1, patch: 0, prerelease: [], build: [] }
          : { ...target, patch: target.patch + 1, prerelease: [], build: [] }
      : { ...target, minor: target.minor + 1, patch: 0, prerelease: [], build: [] }
    return compareSemVer(version, upper) < 0
  }
  const comparator = trimmed.match(/^(>=|<=|>|<|=)?\s*(.+)$/)
  if (!comparator) return false
  const operator = comparator[1] || '='
  const exact = parseSemVer(comparator[2])
  if (exact) return comparatorMatches(version, operator, exact)
  if (operator !== '=') return false
  const partial = expandPartial(comparator[2])
  if (!partial || compareSemVer(version, partial.lower) < 0) return false
  return !partial.upper || compareSemVer(version, partial.upper) < 0
}

function groupMatches(version: SemVer, group: string) {
  if (version.prerelease.length) {
    const prereleaseTargets = group.match(/v?\d+\.\d+\.\d+-[0-9A-Za-z.-]+/g)?.map((value) => parseSemVer(value)).filter((value): value is SemVer => Boolean(value)) || []
    const explicitlyIncluded = prereleaseTargets.some((target) => target.major === version.major && target.minor === version.minor && target.patch === version.patch)
    if (!explicitlyIncluded) return false
  }
  const hyphen = group.trim().match(/^(.+?)\s+-\s+(.+)$/)
  if (hyphen) {
    const lower = parseSemVer(hyphen[1])
    const upper = parseSemVer(hyphen[2])
    return Boolean(lower && upper && compareSemVer(version, lower) >= 0 && compareSemVer(version, upper) <= 0)
  }
  return group.trim().split(/\s+/).every((token) => tokenMatches(version, token))
}

export function satisfiesSemVer(versionValue: string, range: string) {
  const version = parseSemVer(versionValue)
  if (!version) return false
  return range.split('||').some((group) => groupMatches(version, group))
}

export function bumpSemVer(version: SemVer, release: 'major' | 'minor' | 'patch') {
  if (release === 'major') return { major: version.major + 1, minor: 0, patch: 0, prerelease: [], build: [] }
  if (release === 'minor') return { major: version.major, minor: version.minor + 1, patch: 0, prerelease: [], build: [] }
  return { major: version.major, minor: version.minor, patch: version.patch + 1, prerelease: [], build: [] }
}
