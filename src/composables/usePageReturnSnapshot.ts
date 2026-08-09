import { getCurrentInstance, nextTick, ref, type Ref } from 'vue'
import { onPageScroll } from '@dcloudio/uni-app'
import {
  createPageReturnSnapshot,
  resolvePageReturnTarget,
  type PageReturnSnapshot,
  type PageReturnTarget,
  type ReturnItemKey,
} from '../utils/page-return'

interface BaseOptions {
  itemIdPrefix: string
  getItemKeys?: () => ReturnItemKey[]
  beforeRestore?: () => void | Promise<void>
}

interface ScrollViewOptions extends BaseOptions {
  mode: 'scroll-view'
  containerSelector: string
  scrollTop?: Ref<number>
}

interface PageScrollOptions extends BaseOptions {
  mode: 'page'
}

type PageReturnOptions = ScrollViewOptions | PageScrollOptions

export interface ReturnScrollEvent {
  detail: {
    scrollTop: number
  }
}

export interface NavigateWithSnapshotOptions {
  anchorKey?: ReturnItemKey
}

function asRect(value: UniNamespace.NodeInfo | UniNamespace.NodeInfo[]): UniNamespace.NodeInfo | null {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function waitForLayout(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 16))
}

export function usePageReturnSnapshot(options: PageReturnOptions): {
  isReturning: Ref<boolean>
  isReturningValue: boolean
  scrollTop: Ref<number>
  scrollTopValue: number
  itemId: (key: ReturnItemKey) => string
  onScroll: (event: ReturnScrollEvent) => void
  navigateTo: (
    navigation: UniNamespace.NavigateToOptions,
    snapshotOptions?: NavigateWithSnapshotOptions,
  ) => Promise<void>
  restoreOnShow: (refresh?: () => Promise<void>) => Promise<void>
} {
  const instance = getCurrentInstance()
  const scrollTop = options.mode === 'scroll-view' && options.scrollTop ? options.scrollTop : ref(0)
  const isReturning = ref(false)
  const itemIds = new Map<string, string>()
  let nextItemId = 0
  let pendingSnapshot: PageReturnSnapshot | null = null
  let navigationPreparing = false

  if (options.mode === 'page') {
    onPageScroll((event) => {
      scrollTop.value = Math.max(0, Number(event.scrollTop) || 0)
    })
  }

  function itemId(key: ReturnItemKey): string {
    const normalized = String(key)
    const existing = itemIds.get(normalized)
    if (existing) return existing

    nextItemId += 1
    const id = `${options.itemIdPrefix}-${nextItemId}`
    itemIds.set(normalized, id)
    return id
  }

  function scopedQuery(): UniNamespace.SelectorQuery {
    const query = uni.createSelectorQuery()
    return instance?.proxy ? query.in(instance.proxy) : query
  }

  async function queryAnchorOffset(key: ReturnItemKey): Promise<number | null> {
    const selector = `#${itemId(key)}`

    return new Promise((resolve) => {
      let itemRect: UniNamespace.NodeInfo | null = null
      let containerRect: UniNamespace.NodeInfo | null = null
      const query = scopedQuery()

      query.select(selector).boundingClientRect((value) => {
        itemRect = asRect(value)
      })
      if (options.mode === 'scroll-view') {
        query.select(options.containerSelector).boundingClientRect((value) => {
          containerRect = asRect(value)
        })
      }
      query.exec(() => {
        if (itemRect?.top == null) {
          resolve(null)
          return
        }

        const containerTop = options.mode === 'scroll-view' ? containerRect?.top : 0
        resolve(containerTop == null ? null : itemRect.top - containerTop)
      })
    })
  }

  async function queryCurrentScrollTop(): Promise<number> {
    return new Promise((resolve) => {
      let scrollInfo: UniNamespace.NodeInfo | null = null
      const query = scopedQuery()
      const target =
        options.mode === 'scroll-view'
          ? query.select(options.containerSelector)
          : query.selectViewport()

      target.scrollOffset((value) => {
        scrollInfo = asRect(value)
      })
      query.exec(() => resolve(scrollInfo?.scrollTop ?? scrollTop.value))
    })
  }

  async function captureSnapshot(anchorKey?: ReturnItemKey): Promise<PageReturnSnapshot> {
    const departureScrollTop = scrollTop.value
    const itemKeys = options.getItemKeys?.()
    let anchorOffset: number | null = null

    if (anchorKey != null) {
      try {
        anchorOffset = await queryAnchorOffset(anchorKey)
      } catch {
        anchorOffset = null
      }
    }

    return createPageReturnSnapshot(departureScrollTop, itemKeys, anchorKey, anchorOffset)
  }

  async function navigateTo(
    navigation: UniNamespace.NavigateToOptions,
    snapshotOptions: NavigateWithSnapshotOptions = {},
  ): Promise<void> {
    if (navigationPreparing) return
    navigationPreparing = true

    try {
      pendingSnapshot = await captureSnapshot(snapshotOptions.anchorKey)
      const { success, fail, complete } = navigation
      uni.navigateTo({
        ...navigation,
        success: (result) => success?.(result),
        fail: (result) => {
          pendingSnapshot = null
          fail?.(result)
        },
        complete: (result) => {
          navigationPreparing = false
          complete?.(result)
        },
      })
    } catch (error) {
      navigationPreparing = false
      pendingSnapshot = null
      throw error
    }
  }

  function onScroll(event: ReturnScrollEvent): void {
    scrollTop.value = Math.max(0, Number(event.detail.scrollTop) || 0)
  }

  async function setScrollPosition(target: number): Promise<void> {
    const normalized = Math.max(0, target)
    if (options.mode === 'page') {
      uni.pageScrollTo({ scrollTop: normalized, duration: 0 })
    } else {
      if (scrollTop.value === normalized) {
        scrollTop.value = normalized > 0 ? Math.max(0, normalized - 1) : 1
        await nextTick()
        await waitForLayout()
      }
      scrollTop.value = normalized
      await nextTick()
    }
  }

  async function restoreTarget(
    target: PageReturnTarget,
    snapshot: PageReturnSnapshot,
  ): Promise<void> {
    if (target.type === 'pixel' || target.type === 'top') {
      await setScrollPosition(target.scrollTop)
      return
    }

    try {
      const currentOffset = await queryAnchorOffset(target.key)
      if (currentOffset == null) {
        await setScrollPosition(snapshot.scrollTop)
        return
      }
      const currentScrollTop = await queryCurrentScrollTop()
      await setScrollPosition(currentScrollTop + currentOffset - target.offset)
    } catch {
      await setScrollPosition(snapshot.scrollTop)
    }
  }

  async function restoreOnShow(refresh?: () => Promise<void>): Promise<void> {
    const snapshot = pendingSnapshot
    if (!snapshot) {
      await refresh?.()
      return
    }

    isReturning.value = true
    if (refresh) uni.showLoading({ title: '刷新中...', mask: true })

    try {
      await refresh?.()
      await nextTick()
      await waitForLayout()
      await options.beforeRestore?.()
      await nextTick()

      const target = resolvePageReturnTarget(snapshot, options.getItemKeys?.())
      await restoreTarget(target, snapshot)
      pendingSnapshot = null
    } finally {
      if (refresh) uni.hideLoading()
      isReturning.value = false
    }
  }

  return {
    isReturning,
    get isReturningValue() {
      return isReturning.value
    },
    scrollTop,
    get scrollTopValue() {
      return scrollTop.value
    },
    itemId,
    onScroll,
    navigateTo,
    restoreOnShow,
  }
}
