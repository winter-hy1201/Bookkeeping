import dayjs from 'dayjs'

export const DEFAULT_MENU_TEMPLATE_NAME = '日常午晚餐'

export const DEFAULT_MENU_TEMPLATE_BODY = `自家厨房现做盒饭送餐上门🏡

{{#午餐}}
{{日期}}午餐🍱
{{午餐}}
{{/午餐}}

🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟

{{#晚餐}}
{{日期}}晚餐🍱
{{晚餐}}
{{/晚餐}}

需要换糙米饭的宝子提前跟我说噢～🥰

大家私聊我订餐～

单价25元/份🍱
月卡478元/20份🍱`

const KNOWN_TOKENS = new Set(['日期', '午餐', '晚餐', '#午餐', '/午餐', '#晚餐', '/晚餐'])
const TOKEN_PATTERN = /{{\s*([^{}]+?)\s*}}/g

export interface MenuTemplateValues {
  menuDate: string
  lunchText?: string | null
  dinnerText?: string | null
}

export function validateMenuTemplate(body: string): void {
  if (!body.trim()) throw new Error('请输入模板正文')

  let activeBlock: '午餐' | '晚餐' | null = null
  let hasMealPlaceholder = false
  for (const match of body.matchAll(TOKEN_PATTERN)) {
    const token = match[1]?.trim() ?? ''
    if (!KNOWN_TOKENS.has(token)) throw new Error(`不支持占位符 {{${token}}}`)

    if (token === '#午餐' || token === '#晚餐') {
      if (activeBlock) throw new Error('午餐和晚餐区块不能嵌套')
      activeBlock = token.slice(1) as '午餐' | '晚餐'
      continue
    }
    if (token === '/午餐' || token === '/晚餐') {
      const closing = token.slice(1) as '午餐' | '晚餐'
      if (activeBlock !== closing) throw new Error(`${closing}区块的开始和结束标记不匹配`)
      activeBlock = null
      continue
    }
    if (token === '午餐' || token === '晚餐') {
      hasMealPlaceholder = true
      if (activeBlock !== token) throw new Error(`{{${token}}} 必须放在${token}区块内`)
    }
  }
  if (activeBlock) throw new Error(`${activeBlock}区块缺少结束标记`)
  if (!hasMealPlaceholder) throw new Error('模板至少需要一个午餐或晚餐占位符')

  const withoutKnownTokens = body.replace(TOKEN_PATTERN, '')
  if (withoutKnownTokens.includes('{{') || withoutKnownTokens.includes('}}')) {
    throw new Error('模板中存在未闭合的占位符')
  }
}

function normalizeOutput(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[\t ]+$/g, ''))
    .join('\n')
    .trim()
    .replace(/\n[\t ]*\n(?:[\t ]*\n)+/g, '\n\n')
}

export function renderMenuTemplate(body: string, values: MenuTemplateValues): string {
  validateMenuTemplate(body)
  const lunchText = values.lunchText?.trim() ?? ''
  const dinnerText = values.dinnerText?.trim() ?? ''
  let output = body.replace(
    /{{\s*#午餐\s*}}([\s\S]*?){{\s*\/午餐\s*}}/g,
    (_, content: string) => (lunchText ? content : ''),
  )
  output = output.replace(
    /{{\s*#晚餐\s*}}([\s\S]*?){{\s*\/晚餐\s*}}/g,
    (_, content: string) => (dinnerText ? content : ''),
  )
  output = output
    .replace(/{{\s*日期\s*}}/g, () => dayjs(values.menuDate).format('M月D日'))
    .replace(/{{\s*午餐\s*}}/g, () => lunchText)
    .replace(/{{\s*晚餐\s*}}/g, () => dinnerText)
  return normalizeOutput(output)
}
