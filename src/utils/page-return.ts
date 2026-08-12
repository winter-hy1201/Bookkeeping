export interface PageReturnSnapshot {
  scrollTop: number
}

export type PageReturnTarget =
  | { type: 'pixel'; scrollTop: number }
  | { type: 'top'; scrollTop: 0 }

export function createPageReturnSnapshot(scrollTop: number): PageReturnSnapshot {
  return {
    scrollTop: Math.max(0, scrollTop),
  }
}

export function resolvePageReturnTarget(
  snapshot: PageReturnSnapshot,
  hasContent = true,
): PageReturnTarget {
  if (!hasContent) {
    return { type: 'top', scrollTop: 0 }
  }

  return { type: 'pixel', scrollTop: snapshot.scrollTop }
}
