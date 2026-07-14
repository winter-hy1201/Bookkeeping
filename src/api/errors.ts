export class InsufficientCardError extends Error {
  constructor(message = '次卡次数不足，请改用微信或现金支付') {
    super(message)
    this.name = 'InsufficientCardError'
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
