import { nextTick, ref, type Ref } from 'vue'
import { onPageScroll } from '@dcloudio/uni-app'
import {
  createPageReturnSnapshot,
  resolvePageReturnTarget,
  type PageReturnSnapshot,
  type PageReturnTarget,
} from '../utils/page-return'

interface BaseOptions {
  hasContent?: () => boolean
  beforeRestore?: () => void | Promise<void>
}

interface ScrollViewOptions extends BaseOptions {
  mode: 'scroll-view'
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

export type PageReturnRefresh = () => Promise<boolean | void>

function waitForLayout(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 16))
}

export function usePageReturnSnapshot(options: PageReturnOptions): {
  isReturning: Ref<boolean>
  isReturningValue: boolean
  scrollTop: Ref<number>
  scrollTopValue: number
  onScroll: (event: ReturnScrollEvent) => void
  navigateTo: (navigation: UniNamespace.NavigateToOptions) => Promise<void>
  restoreOnShow: (refresh?: PageReturnRefresh) => Promise<void>
} {
  const scrollTop = options.mode === 'scroll-view' && options.scrollTop ? options.scrollTop : ref(0)
  const isReturning = ref(false)
  let pendingSnapshot: PageReturnSnapshot | null = null
  let navigationPreparing = false

  if (options.mode === 'page') {
    onPageScroll((event) => {
      scrollTop.value = Math.max(0, Number(event.scrollTop) || 0)
    })
  }

  function captureSnapshot(): PageReturnSnapshot {
    return createPageReturnSnapshot(scrollTop.value)
  }

  async function navigateTo(navigation: UniNamespace.NavigateToOptions): Promise<void> {
    if (navigationPreparing) return
    navigationPreparing = true

    try {
      pendingSnapshot = captureSnapshot()
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

  async function restoreTarget(target: PageReturnTarget): Promise<void> {
    await setScrollPosition(target.scrollTop)
  }

  async function restoreOnShow(refresh?: PageReturnRefresh): Promise<void> {
    const snapshot = pendingSnapshot
    if (!snapshot) {
      await refresh?.()
      return
    }

    isReturning.value = true
    if (refresh) uni.showLoading({ title: '刷新中...', mask: true })

    try {
      const refreshSucceeded = (await refresh?.()) !== false
      await nextTick()
      await waitForLayout()
      await options.beforeRestore?.()
      await nextTick()

      const target = resolvePageReturnTarget(snapshot, options.hasContent?.() ?? true)
      await restoreTarget(target)
      if (refreshSucceeded) pendingSnapshot = null
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
    onScroll,
    navigateTo,
    restoreOnShow,
  }
}
