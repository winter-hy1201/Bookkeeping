<script setup lang="ts">
import { onHide, onLaunch, onShow } from '@dcloudio/uni-app'
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
        title: `数据库初始化失败：${msg}`,
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
</script>

<style></style>
