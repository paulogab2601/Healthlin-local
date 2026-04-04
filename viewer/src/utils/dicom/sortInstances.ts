import type { Instance } from '@/types/orthanc'

const VECTOR_EPSILON = 1e-6
const POSITION_EPSILON = 1e-4

interface SortCandidate {
  instance: Instance
  originalIndex: number
  projectedPosition: number | null
  instanceNumber: number | null
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null

  const normalized = value.trim()
  if (!normalized) return null

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function toNumericList(value: unknown, minLength: number): number[] | null {
  if (Array.isArray(value)) {
    if (value.length < minLength) return null
    const parsed = value
      .map((item) => toFiniteNumber(item))
      .filter((item): item is number => item !== null)
    return parsed.length === value.length ? parsed : null
  }

  if (typeof value === 'string' && value.includes('\\')) {
    const rawItems = value.split('\\').map((item) => item.trim())
    if (rawItems.length < minLength) return null
    const parsed = rawItems
      .map((item) => toFiniteNumber(item))
      .filter((item): item is number => item !== null)
    return parsed.length === rawItems.length ? parsed : null
  }

  return null
}

function dot(a: number[], b: number[]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function cross(a: number[], b: number[]): number[] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}

function normalize(vector: number[]): number[] | null {
  const magnitude = Math.hypot(vector[0], vector[1], vector[2])
  if (magnitude <= VECTOR_EPSILON) return null
  return [vector[0] / magnitude, vector[1] / magnitude, vector[2] / magnitude]
}

function getPosition(instance: Instance): number[] | null {
  const tags = instance.MainDicomTags as Record<string, unknown> | undefined
  const list = toNumericList(tags?.ImagePositionPatient, 3)
  return list ? [list[0], list[1], list[2]] : null
}

function getOrientation(instance: Instance): number[] | null {
  const tags = instance.MainDicomTags as Record<string, unknown> | undefined
  const list = toNumericList(tags?.ImageOrientationPatient, 6)
  if (!list) return null

  const row = normalize([list[0], list[1], list[2]])
  const column = normalize([list[3], list[4], list[5]])
  if (!row || !column) return null

  return normalize(cross(row, column))
}

function getInstanceNumber(instance: Instance): number | null {
  const raw = instance.MainDicomTags?.InstanceNumber
  return toFiniteNumber(raw)
}

function getDominantAxis(positions: number[][]): 0 | 1 | 2 | null {
  if (positions.length < 2) return null

  const ranges = [0, 0, 0]
    .map((_, axis) => {
      let min = Number.POSITIVE_INFINITY
      let max = Number.NEGATIVE_INFINITY

      positions.forEach((position) => {
        const value = position[axis]
        if (value < min) min = value
        if (value > max) max = value
      })

      return max - min
    })

  const axis = ranges.reduce((bestAxis, value, currentAxis, array) => (
    value > array[bestAxis] ? currentAxis : bestAxis
  ), 0)

  if (ranges[axis] <= POSITION_EPSILON) return null
  return axis as 0 | 1 | 2
}

export function sortDicomInstances(instances: Instance[]): Instance[] {
  if (instances.length <= 1) return [...instances]

  const positions = instances.map((instance) => getPosition(instance))
  const orientations = instances.map((instance) => getOrientation(instance))
  const normal = orientations.find((item): item is number[] => item !== null) ?? null
  const allPositions = positions.filter((item): item is number[] => item !== null)
  const fallbackAxis = normal ? null : getDominantAxis(allPositions)

  const candidates: SortCandidate[] = instances.map((instance, index) => {
    const position = positions[index]

    let projectedPosition: number | null = null
    if (position && normal) {
      projectedPosition = dot(position, normal)
    } else if (position && fallbackAxis !== null) {
      projectedPosition = position[fallbackAxis]
    }

    return {
      instance,
      originalIndex: index,
      projectedPosition,
      instanceNumber: getInstanceNumber(instance),
    }
  })

  candidates.sort((a, b) => {
    if (a.projectedPosition !== null && b.projectedPosition !== null) {
      const diff = a.projectedPosition - b.projectedPosition
      if (Math.abs(diff) > POSITION_EPSILON) return diff
    } else if (a.projectedPosition !== null || b.projectedPosition !== null) {
      return a.projectedPosition !== null ? -1 : 1
    }

    if (a.instanceNumber !== null && b.instanceNumber !== null) {
      const diff = a.instanceNumber - b.instanceNumber
      if (diff !== 0) return diff
    } else if (a.instanceNumber !== null || b.instanceNumber !== null) {
      return a.instanceNumber !== null ? -1 : 1
    }

    if (a.originalIndex !== b.originalIndex) {
      return a.originalIndex - b.originalIndex
    }

    return a.instance.ID.localeCompare(b.instance.ID)
  })

  return candidates.map((candidate) => candidate.instance)
}
