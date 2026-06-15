export type MealType = 'lunch' | 'dinner'

export type PaymentMethod = 'wechat' | 'cash' | 'meal_card'

export type OrderStatus = 'pending' | 'delivered' | 'cancelled'

export type MealCardStatus = 'active' | 'depleted'

export type BooleanInt = 0 | 1

export interface Customer {
  id: number
  name: string
  phone: string | null
  wechat: string | null
  default_lunch_price: number | null
  default_dinner_price: number | null
  discount_rate: number
  note: string | null
  created_at: string
  updated_at: string
}

export interface MealCard {
  id: number
  customer_id: number
  total_meals: number
  used_meals: number
  amount: number
  status: MealCardStatus
  created_at: string
}

export interface Order {
  id: number
  customer_id: number
  order_date: string
  meal_type: MealType
  quantity: number
  sort_order: number
  unit_price: number
  amount: number
  payment_method: PaymentMethod
  meal_card_id: number | null
  status: OrderStatus
  note: string | null
  created_at: string
  updated_at: string
  cancelled_at: string | null
}

export interface ExpenseCategory {
  id: number
  name: string
  icon: string | null
  sort_order: number
  is_default: BooleanInt
}

export interface Expense {
  id: number
  expense_date: string
  category_id: number
  amount: number
  refund_amount: number
  note: string | null
  created_at: string
}
