import type {
  Customer,
  Expense,
  ExpenseCategory,
  MealCard,
  MealType,
  Order,
  OrderStatus,
  PaymentMethod,
} from './domain'

export interface CreateCustomerInput {
  name: string
  phone?: string | null
  wechat?: string | null
  default_lunch_price?: number | null
  default_dinner_price?: number | null
  discount_rate?: number
  note?: string | null
}

export type UpdateCustomerInput = Partial<CreateCustomerInput>

export interface OpenMealCardInput {
  customer_id: number
  total_meals: number
  amount: number
  note?: string | null
}

export interface CreateOrderInput {
  customer_id: number
  order_date: string
  meal_type: MealType
  quantity: number
  payment_method: PaymentMethod
  unit_price?: number
  amount?: number
  meal_card_id?: number | null
  note?: string | null
}

export interface UpdateOrderPaymentInput {
  payment_method: Exclude<PaymentMethod, 'meal_card'>
  unit_price: number
  amount: number
  meal_card_id?: null
}

export interface ListOrdersInput {
  startDate?: string
  endDate?: string
  status?: OrderStatus
  customerId?: number
}

export interface CreateExpenseInput {
  expense_date: string
  category_id: number
  amount: number
  note?: string | null
}

export interface ListExpensesInput {
  startDate: string
  endDate: string
  categoryId?: number
}

export interface DateRangeInput {
  startDate: string
  endDate: string
}

export interface StatsSummary {
  orderCount: number
  income: number
  expense: number
  profit: number
}

export interface DailyTrendPoint {
  date: string
  income: number
  expense: number
  profit: number
}

export interface CategoryBreakdown {
  categoryId: number
  categoryName: string
  amount: number
  percentage: number
}

export type CustomerResult = Customer
export type MealCardResult = MealCard
export type OrderResult = Order
export type ExpenseCategoryResult = ExpenseCategory
export type ExpenseResult = Expense
