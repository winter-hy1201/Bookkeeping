import { defineStore } from 'pinia'
import { listCategories } from '../api/expense-categories'
import { createExpense, deleteExpense, listExpenses } from '../api/expenses'
import type { CreateExpenseInput } from '../types/api'
import type { Expense, ExpenseCategory } from '../types/domain'
import { today } from '../utils/date'

interface ExpenseState {
  list: Expense[]
  categories: ExpenseCategory[]
  currentDate: string
  loading: boolean
}

export const useExpenseStore = defineStore('expense', {
  state: (): ExpenseState => ({
    list: [],
    categories: [],
    currentDate: today(),
    loading: false,
  }),

  actions: {
    async refreshForDate(date: string): Promise<void> {
      this.currentDate = date
      this.loading = true
      try {
        this.list = await listExpenses({ startDate: date, endDate: date })
      } finally {
        this.loading = false
      }
    },

    async refreshCategories(): Promise<void> {
      this.categories = await listCategories()
    },

    async create(input: CreateExpenseInput): Promise<Expense> {
      const expense = await createExpense(input)
      await this.refreshForDate(this.currentDate)
      return expense
    },

    async remove(id: number): Promise<boolean> {
      const deleted = await deleteExpense(id)
      await this.refreshForDate(this.currentDate)
      return deleted
    },
  },
})
