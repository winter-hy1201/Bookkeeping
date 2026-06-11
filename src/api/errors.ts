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
