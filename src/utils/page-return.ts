export type ReturnItemKey = string | number

export interface PageReturnSnapshot {
  scrollTop: number
  itemKeys?: string[]
  anchorKey?: string
  nextKey?: string
  previousKey?: string
  anchorOffset: number | null
}

export type PageReturnTarget =
  | { type: 'pixel'; scrollTop: number }
  | { type: 'anchor'; key: string; offset: number; source: 'anchor' | 'next' | 'previous' }
  | { type: 'top'; scrollTop: 0 }

function normalizeKey(key: ReturnItemKey): string {
  return String(key)
}

function sameKeys(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((key, index) => key === right[index])
}

export function createPageReturnSnapshot(
  scrollTop: number,
  itemKeys?: ReturnItemKey[],
  anchorKey?: ReturnItemKey,
  anchorOffset: number | null = null,
): PageReturnSnapshot {
  const normalizedKeys = itemKeys?.map(normalizeKey)
  const normalizedAnchor = anchorKey == null ? undefined : normalizeKey(anchorKey)
  const anchorIndex =
    normalizedAnchor == null || normalizedKeys == null
      ? -1
      : normalizedKeys.indexOf(normalizedAnchor)

  return {
    scrollTop: Math.max(0, scrollTop),
    itemKeys: normalizedKeys,
    anchorKey: normalizedAnchor,
    nextKey: anchorIndex >= 0 ? normalizedKeys?.[anchorIndex + 1] : undefined,
    previousKey: anchorIndex > 0 ? normalizedKeys?.[anchorIndex - 1] : undefined,
    anchorOffset,
  }
}

export function resolvePageReturnTarget(
  snapshot: PageReturnSnapshot,
  currentItemKeys?: ReturnItemKey[],
): PageReturnTarget {
  if (snapshot.itemKeys == null || currentItemKeys == null) {
    return { type: 'pixel', scrollTop: snapshot.scrollTop }
  }

  const normalizedCurrent = currentItemKeys.map(normalizeKey)
  if (normalizedCurrent.length === 0) {
    return { type: 'top', scrollTop: 0 }
  }

  if (sameKeys(snapshot.itemKeys, normalizedCurrent)) {
    return { type: 'pixel', scrollTop: snapshot.scrollTop }
  }

  if (snapshot.anchorOffset == null) {
    return { type: 'pixel', scrollTop: snapshot.scrollTop }
  }

  const candidates: Array<{
    key: string | undefined
    source: 'anchor' | 'next' | 'previous'
  }> = [
    { key: snapshot.anchorKey, source: 'anchor' },
    { key: snapshot.nextKey, source: 'next' },
    { key: snapshot.previousKey, source: 'previous' },
  ]

  const matched = candidates.find(
    (candidate) => candidate.key != null && normalizedCurrent.includes(candidate.key),
  )
  if (matched?.key != null) {
    return {
      type: 'anchor',
      key: matched.key,
      offset: snapshot.anchorOffset,
      source: matched.source,
    }
  }

  return { type: 'top', scrollTop: 0 }
}
