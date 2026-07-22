export class InsufficientCardError extends Error {
  constructor(
    public readonly requiredMeals = 0,
    public readonly availableMeals = 0,
    message = requiredMeals > 0
      ? `当前可用 ${availableMeals} 次，订单需要 ${requiredMeals} 次，请减少份数或调整支付方式`
      : '次卡次数不足，请调整支付方式',
  ) {
    super(message)
    this.name = 'InsufficientCardError'
  }
}

export class DeliveredOrderConflictError extends Error {
  constructor(
    public readonly orderId: number,
    message = '该客户本餐次已经配送，不能继续新增或合并订单',
  ) {
    super(message)
    this.name = 'DeliveredOrderConflictError'
  }
}

export class OrderPaymentConflictError extends Error {
  constructor(
    public readonly orderId: number,
    public readonly existingMethod: 'wechat' | 'cash',
    public readonly incomingMethod: 'wechat' | 'cash',
    message = '已有订单与本次订单的支付方式冲突，请编辑已有订单统一支付方式',
  ) {
    super(message)
    this.name = 'OrderPaymentConflictError'
  }
}

export class OrderPriceConfirmationError extends Error {
  constructor(
    public readonly orderId: number,
    public readonly oldUnitPrice: number,
    public readonly newUnitPrice: number,
    public readonly moneyQuantity: number,
    public readonly oldAmount: number,
    public readonly newAmount: number,
    message = '合并后的实际单价发生变化，需要确认后再保存',
  ) {
    super(message)
    this.name = 'OrderPriceConfirmationError'
  }
}

export class OrderMergeConfirmationError extends Error {
  constructor(
    public readonly sourceOrderId: number,
    public readonly targetOrderId: number,
    message = '修改后会与另一张待配送订单合并，需要确认后再保存',
  ) {
    super(message)
    this.name = 'OrderMergeConfirmationError'
  }
}

export class MealCardReservationConflictError extends Error {
  constructor(
    public readonly reservedMeals: number,
    public readonly remainingAfterChange: number,
    message = `修改后仅剩 ${remainingAfterChange} 次，但待配送订单已预占 ${reservedMeals} 次`,
  ) {
    super(message)
    this.name = 'MealCardReservationConflictError'
  }
}

export class LegacyOrderConflictError extends Error {
  constructor(
    public readonly orderIds: number[],
    message = '当前餐次存在无法自动合并的历史订单，请先逐条处理后再保存',
  ) {
    super(message)
    this.name = 'LegacyOrderConflictError'
  }
}

export class AlreadyDeliveredError extends Error {
  constructor(message = '订单已配送，不能取消') {
    super(message)
    this.name = 'AlreadyDeliveredError'
  }
}

export class DuplicateCustomerNameError extends Error {
  constructor(message = '客户姓名已存在，请换一个姓名') {
    super(message)
    this.name = 'DuplicateCustomerNameError'
  }
}

export class MealCardTotalTooSmallError extends Error {
  constructor(
    public readonly usedMeals: number,
    message = `总次数不能小于已用次数 ${usedMeals}`,
  ) {
    super(message)
    this.name = 'MealCardTotalTooSmallError'
  }
}
