const TOKEN_PATTERN = /{{\s*([^{}]+?)\s*}}/g
const KNOWN_TOKENS = new Set(['本次使用份数', '当前可用份数'])

export const DEFAULT_MEAL_CARD_TEMPLATE_NAME = '月卡信息'

export const DEFAULT_MEAL_CARD_TEMPLATE_BODY = `同步一下的月卡信息：
您办理的是478元/20份的月卡套餐，本次使用{{本次使用份数}}份，当前剩余{{当前可用份数}}份可用，有任何问题随时联系我就可以啦😊`

export interface MealCardTemplateValues {
  usedMeals: number
  availableMeals: number
}

export function validateMealCardTemplate(body: string): void {
  if (!body.trim()) throw new Error('请输入模板正文')

  const foundTokens = new Set<string>()
  for (const match of body.matchAll(TOKEN_PATTERN)) {
    const token = match[1]?.trim() ?? ''
    if (!KNOWN_TOKENS.has(token)) throw new Error(`不支持占位符 {{${token}}}`)
    foundTokens.add(token)
  }

  if (!foundTokens.has('本次使用份数')) {
    throw new Error('模板必须包含 {{本次使用份数}}')
  }
  if (!foundTokens.has('当前可用份数')) {
    throw new Error('模板必须包含 {{当前可用份数}}')
  }

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

export function renderMealCardTemplate(
  body: string,
  values: MealCardTemplateValues,
): string {
  validateMealCardTemplate(body)
  return normalizeOutput(
    body
      .replace(/{{\s*本次使用份数\s*}}/g, () => String(values.usedMeals))
      .replace(/{{\s*当前可用份数\s*}}/g, () => String(values.availableMeals)),
  )
}
