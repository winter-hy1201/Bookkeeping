import { multiplyMoney, roundMoney } from './format'

export type LunchOrderStatus = 'pending' | 'delivered' | 'cancelled'

export interface LunchCollapseCheckInput {
  currentDate: string
  today: string
  mealType: 'lunch' | 'dinner'
  orders: Array<{ status: LunchOrderStatus }>
}

export interface LunchPanelCollapseState {
  lastAllDelivered: boolean
  open: boolean
  autoCollapsed: boolean
}

export function shouldAutoCollapseTodayLunch(input: LunchCollapseCheckInput): boolean {
  return (
    input.currentDate === input.today &&
    input.mealType === 'lunch' &&
    input.orders.length > 0 &&
    input.orders.every((order) => order.status === 'delivered')
  )
}

export function initializeLunchPanelCollapse(
  open: boolean,
  allDelivered: boolean,
): LunchPanelCollapseState {
  return {
    lastAllDelivered: allDelivered,
    open,
    autoCollapsed: allDelivered && !open,
  }
}

export function markLunchPanelManually(
  state: LunchPanelCollapseState,
  open: boolean,
): LunchPanelCollapseState {
  return {
    ...state,
    open,
    autoCollapsed: false,
  }
}

export function reconcileLunchPanelCollapse(
  state: LunchPanelCollapseState,
  allDelivered: boolean,
  hasPendingOrder: boolean,
): LunchPanelCollapseState {
  const newlyCompleted = !state.lastAllDelivered && allDelivered
  const becameIncomplete = state.autoCollapsed && !allDelivered && hasPendingOrder

  if (newlyCompleted && state.open) {
    return {
      lastAllDelivered: allDelivered,
      open: false,
      autoCollapsed: true,
    }
  }

  if (becameIncomplete) {
    return {
      lastAllDelivered: allDelivered,
      open: true,
      autoCollapsed: false,
    }
  }

  return {
    ...state,
    lastAllDelivered: allDelivered,
  }
}

export interface MealCardAvailabilityInput {
  actualRemaining: number
  reservedByOthers: number
  required: number
}

export interface MealCardAvailability extends MealCardAvailabilityInput {
  available: number
  valid: boolean
}

export function evaluateMealCardAvailability(
  input: MealCardAvailabilityInput,
): MealCardAvailability {
  const available = Math.max(0, input.actualRemaining - input.reservedByOthers)
  return {
    ...input,
    available,
    valid: input.required <= available,
  }
}

export function mergeOrderNotes(
  existing: string | null | undefined,
  incoming: string | null | undefined,
): string {
  const existingNote = (existing ?? '').trim()
  const incomingNote = (incoming ?? '').trim()
  if (!existingNote) return incomingNote
  if (!incomingNote || incomingNote === existingNote) return existingNote
  return `${existingNote}；${incomingNote}`
}

export function selectPendingOrdersForReconciliation<
  T extends { status: 'pending' | 'delivered' | 'cancelled' },
>(orders: T[]): T[] {
  const pendingOrders = orders.filter((order) => order.status === 'pending')
  if (pendingOrders.length > 0 && orders.some((order) => order.status === 'delivered')) {
    return []
  }
  return pendingOrders
}

export function calculatePaymentBreakdown(input: PaymentBreakdownInput): PaymentBreakdown {
  const unitPrice = roundMoney(input.unitPrice)
  if (input.mode === 'meal_card') {
    return {
      paymentMethod: 'meal_card',
      mealCardQuantity: input.quantity,
      moneyQuantity: 0,
      unitPrice,
      amount: 0,
    }
  }

  if (input.mode === 'wechat' || input.mode === 'cash') {
    return {
      paymentMethod: input.mode,
      mealCardQuantity: 0,
      moneyQuantity: input.quantity,
      unitPrice,
      amount: multiplyMoney(unitPrice, input.quantity),
    }
  }

  if (input.mode !== 'mixed' || input.moneyMethod == null || input.mealCardQuantity == null) {
    throw new Error('组合支付信息不完整')
  }
  if (!Number.isInteger(input.mealCardQuantity)) {
    throw new Error('组合支付的次卡次数必须为整数')
  }
  if (input.mealCardQuantity <= 0) {
    throw new Error('组合支付的次卡次数必须大于 0')
  }
  if (input.mealCardQuantity >= input.quantity) {
    throw new Error('组合支付的次卡次数必须小于总份数')
  }
  const moneyQuantity = input.quantity - input.mealCardQuantity
  return {
    paymentMethod: input.moneyMethod,
    mealCardQuantity: input.mealCardQuantity,
    moneyQuantity,
    unitPrice,
    amount: multiplyMoney(unitPrice, moneyQuantity),
  }
}

export type OrderPaymentMode = 'wechat' | 'cash' | 'meal_card' | 'mixed'
export type MonetaryPaymentMethod = 'wechat' | 'cash'

export interface PaymentBreakdownInput {
  mode: OrderPaymentMode
  quantity: number
  mealCardQuantity?: number | null
  moneyMethod?: MonetaryPaymentMethod | null
  unitPrice: number
}

export interface PaymentBreakdown {
  paymentMethod: 'wechat' | 'cash' | 'meal_card'
  mealCardQuantity: number
  moneyQuantity: number
  unitPrice: number
  amount: number
}

export interface PaymentMergeResult extends PaymentBreakdown {
  oldUnitPrice: number
  oldAmount: number
  priceChanged: boolean
}

export function mergePaymentBreakdowns(
  existing: PaymentBreakdown,
  incoming: PaymentBreakdown,
): PaymentMergeResult {
  const existingMoneyMethod =
    existing.moneyQuantity > 0 && existing.paymentMethod !== 'meal_card'
      ? existing.paymentMethod
      : null
  const incomingMoneyMethod =
    incoming.moneyQuantity > 0 && incoming.paymentMethod !== 'meal_card'
      ? incoming.paymentMethod
      : null
  if (
    existingMoneyMethod != null &&
    incomingMoneyMethod != null &&
    existingMoneyMethod !== incomingMoneyMethod
  ) {
    throw new Error('已有订单与本次订单的现金支付方式冲突')
  }

  const mealCardQuantity = existing.mealCardQuantity + incoming.mealCardQuantity
  const moneyQuantity = existing.moneyQuantity + incoming.moneyQuantity
  const paymentMethod = existingMoneyMethod ?? incomingMoneyMethod ?? 'meal_card'
  const existingHasMoney = existing.moneyQuantity > 0
  const incomingHasMoney = incoming.moneyQuantity > 0
  const unitPrice = roundMoney(incomingHasMoney ? incoming.unitPrice : existing.unitPrice)
  const oldUnitPrice = existingHasMoney ? roundMoney(existing.unitPrice) : unitPrice

  return {
    paymentMethod,
    mealCardQuantity,
    moneyQuantity,
    unitPrice,
    amount: multiplyMoney(unitPrice, moneyQuantity),
    oldUnitPrice,
    oldAmount: multiplyMoney(oldUnitPrice, moneyQuantity),
    priceChanged: existingHasMoney && incomingHasMoney && oldUnitPrice !== unitPrice,
  }
}
