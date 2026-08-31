<script setup lang="ts">
import { computed } from 'vue'
import { HEJI_ICON_NODES, type HejiIconName } from './icon-registry'

const props = withDefaults(
  defineProps<{
    name: string
    size?: number | string
    strokeWidth?: number | string
    label?: string
    decorative?: boolean
  }>(),
  {
    size: 20,
    strokeWidth: 1.9,
    label: '',
    decorative: true,
  },
)

const resolvedIconName = computed<HejiIconName>(() => {
  if (props.name in HEJI_ICON_NODES) {
    return props.name as HejiIconName
  }
  if (import.meta.env.DEV) {
    console.warn(`[HejiIcon] Unknown Lucide icon "${props.name}"; using CircleHelp.`)
  }
  return 'CircleHelp'
})

const accessibleLabel = computed(() => (props.decorative ? undefined : props.label || props.name))
const iconSize = computed(() => Number(props.size))
const iconStrokeWidth = computed(() => Number(props.strokeWidth))

function escapeSvgAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function toSvgAttributeName(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
}

function createMaskDataUrl(name: HejiIconName, strokeWidth: number): string {
  const iconNode = HEJI_ICON_NODES[name]
  const children = iconNode
    .map(([tag, attributes]) => {
      const serializedAttributes = Object.entries(attributes)
        .filter(
          ([attributeName, value]) =>
            attributeName !== 'key' && value !== null && value !== undefined,
        )
        .map(
          ([attributeName, value]) =>
            `${toSvgAttributeName(attributeName)}="${escapeSvgAttribute(String(value))}"`,
        )
        .join(' ')
      return `<${tag}${serializedAttributes ? ` ${serializedAttributes}` : ''}></${tag}>`
    })
    .join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${children}</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const maskStyle = computed(() => {
  const size = `${iconSize.value}px`
  const maskImage = `url("${createMaskDataUrl(resolvedIconName.value, iconStrokeWidth.value)}")`
  return {
    width: size,
    height: size,
    WebkitMaskImage: maskImage,
    maskImage,
  }
})
</script>

<template>
  <view
    class="heji-icon"
    :style="maskStyle"
    :aria-hidden="decorative ? 'true' : undefined"
    :aria-label="accessibleLabel"
  />
</template>

<style lang="scss">
.heji-icon {
  display: inline-block;
  flex: 0 0 auto;
  vertical-align: middle;
  background-color: currentColor;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
}
</style>
