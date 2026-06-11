import type { Customer, MealType, Order, OrderStatus, PaymentMethod } from '../types/domain'
import { formatMoney } from './format'

export function showToast(title: string): void {
  uni.showToast({ title, icon: 'none' })
}

export function confirmDialog(title: string, content: string): Promise<boolean> {
  return new Promise((resolve) => {
    uni.showModal({
      title,
      content,
      success: (res) => resolve(Boolean(res.confirm)),
      fail: () => resolve(false),
    })
  })
}

export function actionSheet(itemList: string[]): Promise<number | null> {
  return new Promise((resolve) => {
    uni.showActionSheet({
      itemList,
      success: (res) => resolve(res.tapIndex),
      fail: () => resolve(null),
    })
  })
}

export function toNumber(value: string | number): number {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

export function mealTypeText(value: MealType): string {
  return value === 'lunch' ? '午餐' : '晚餐'
}

export function paymentText(value: PaymentMethod): string {
  if (value === 'wechat') return '微信'
  if (value === 'cash') return '现金'
  return '次卡'
}

export function statusText(value: OrderStatus): string {
  if (value === 'pending') return '待配送'
  if (value === 'delivered') return '已配送'
  return '已取消'
}

export function customerPrice(customer: Customer | null, mealType: MealType): number | null {
  if (!customer) return null
  const base = mealType === 'lunch' ? customer.default_lunch_price : customer.default_dinner_price
  if (base == null) return null
  return base * customer.discount_rate
}

export function priceHint(customer: Customer | null, mealType: MealType): string {
  if (!customer) return ''
  const base = mealType === 'lunch' ? customer.default_lunch_price : customer.default_dinner_price
  if (base == null) return '请手动填入单价'
  return `默认价 ${formatMoney(base)} × ${customer.discount_rate} = ${formatMoney(
    base * customer.discount_rate,
  )}`
}

export function discountLabel(customer: Customer): string {
  if (customer.discount_rate === 1) return ''
  const value = Number((customer.discount_rate * 10).toFixed(1))
  return `${value} 折`
}

export function orderDisplayAmount(order: Order): string {
  if (order.payment_method === 'meal_card') return '次卡'
  return formatMoney(order.amount)
}
