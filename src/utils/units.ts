import type { Unit } from '@/types'

type Dimension = 'weight' | 'volume' | 'count'

const DIMENSION: Record<Unit, Dimension> = {
  g: 'weight',
  kg: 'weight',
  ml: 'volume',
  l: 'volume',
  pcs: 'count',
  shots: 'count',
}

const TO_BASE: Record<Unit, number> = {
  g: 1,
  kg: 1000,
  ml: 1,
  l: 1000,
  pcs: 1,
  shots: 1,
}

export function convert(value: number, from: Unit, to: Unit): number {
  if (from === to) return value
  if (DIMENSION[from] !== DIMENSION[to]) return value
  return (value * TO_BASE[from]) / TO_BASE[to]
}

export function areCompatible(a: Unit, b: Unit): boolean {
  return DIMENSION[a] === DIMENSION[b]
}

export function unitDimension(u: Unit): Dimension {
  return DIMENSION[u]
}
