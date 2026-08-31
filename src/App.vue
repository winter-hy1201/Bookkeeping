<script setup lang="ts">
import { onError, onHide, onLaunch, onShow } from '@dcloudio/uni-app'
import { init as dbInit } from './db'

onLaunch(() => {
  console.log('App Launch')
  // plus.sqlite.openDatabase 是 callback 形式，init() 返回 Promise
  dbInit()
    .then(() => {
      console.log('[db] init OK')
    })
    .catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[db] init failed', e)
      uni.showToast({
        title: `数据库初始化失败：${msg}`.slice(0, 24),
        icon: 'none',
        duration: 3000,
      })
    })
})

onShow(() => {
  console.log('App Show')
})

onHide(() => {
  console.log('App Hide')
})

// 全局未捕获错误兜底：DB 损坏 / 异步 API 抛错 / 渲染异常都进这里
onError((err: unknown) => {
  const raw = err instanceof Error ? err.message : String(err)
  const title = raw.includes('integrity_check')
    ? '数据库损坏，请用备份恢复'
    : `出错了：${raw}`.slice(0, 24)
  console.error('[app] onError', err)
  uni.showToast({ title, icon: 'none', duration: 3000 })
})
</script>

<style lang="scss">
page {
  --hej-color-canvas: #{$hej-color-canvas};
  --hej-color-surface: #{$hej-color-surface};
  --hej-color-surface-subtle: #{$hej-color-surface-subtle};
  --hej-color-control: #{$hej-color-control};
  --hej-color-control-disabled: #{$hej-color-control-disabled};
  --hej-color-text: #{$hej-color-text};
  --hej-color-text-secondary: #{$hej-color-text-secondary};
  --hej-color-text-tertiary: #{$hej-color-text-tertiary};
  --hej-color-border: #{$hej-color-border};
  --hej-color-border-strong: #{$hej-color-border-strong};
  --hej-color-accent: #{$hej-color-accent};
  --hej-color-accent-soft: #{$hej-color-accent-soft};
  --hej-color-success: #{$hej-color-success};
  --hej-color-warning: #{$hej-color-warning};
  --hej-color-warning-soft: #{$hej-color-warning-soft};
  --hej-color-danger: #{$hej-color-danger};
  --hej-color-danger-soft: #{$hej-color-danger-soft};
  --hej-color-pending: #{$hej-color-pending};
  --hej-color-pending-soft: #{$hej-color-pending-soft};
  --hej-color-delivered: #{$hej-color-delivered};
  --hej-color-delivered-soft: #{$hej-color-delivered-soft};
  --hej-radius-control: #{$hej-radius-control};
  --hej-radius-panel: #{$hej-radius-panel};
  --hej-radius-pill: #{$hej-radius-pill};
  --hej-shadow-panel: #{$hej-shadow-panel};
  --hej-font-family: #{$hej-font-family};

  background: $hej-color-canvas;
  color: $hej-color-text;
  font-family: $hej-font-family;
}
</style>
