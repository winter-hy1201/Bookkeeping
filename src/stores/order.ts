import { defineStore } from 'pinia'
import { cancelOrder, createOrder, listOrders, markDelivered, updateOrder } from '../api/orders'
import type { CreateOrderInput, UpdateOrderInput } from '../types/api'
import type { Order } from '../types/domain'
import { today } from '../utils/date'

interface OrderState {
  list: Order[]
  currentDate: string
  loading: boolean
}

export const useOrderStore = defineStore('order', {
  state: (): OrderState => ({
    list: [],
    currentDate: today(),
    loading: false,
  }),

  actions: {
    setDate(date: string): void {
      this.currentDate = date
    },

    async refreshForDate(date: string): Promise<void> {
      this.currentDate = date
      this.loading = true
      try {
        this.list = await listOrders({ startDate: date, endDate: date })
      } finally {
        this.loading = false
      }
    },

    async create(input: CreateOrderInput): Promise<Order> {
      const order = await createOrder(input)
      await this.refreshForDate(this.currentDate)
      return order
    },

    async update(id: number, input: UpdateOrderInput): Promise<Order> {
      const order = await updateOrder(id, input)
      await this.refreshForDate(this.currentDate)
      return order
    },

    async markDelivered(id: number): Promise<Order> {
      const order = await markDelivered(id)
      await this.refreshForDate(this.currentDate)
      return order
    },

    async cancel(id: number): Promise<void> {
      await cancelOrder(id)
      await this.refreshForDate(this.currentDate)
    },
  },
})
