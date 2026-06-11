import { defineStore } from 'pinia'
import {
  createCustomer,
  deleteCustomer,
  listCustomers,
  updateCustomer,
} from '../api/customers'
import type { CreateCustomerInput, UpdateCustomerInput } from '../types/api'
import type { Customer } from '../types/domain'

interface CustomerState {
  list: Customer[]
  loading: boolean
}

export const useCustomerStore = defineStore('customer', {
  state: (): CustomerState => ({
    list: [],
    loading: false,
  }),

  getters: {
    byId:
      (state) =>
      (id: number): Customer | null =>
        state.list.find((customer) => customer.id === id) ?? null,
  },

  actions: {
    async refresh(): Promise<void> {
      this.loading = true
      try {
        this.list = await listCustomers()
      } finally {
        this.loading = false
      }
    },

    async create(input: CreateCustomerInput): Promise<Customer> {
      const customer = await createCustomer(input)
      await this.refresh()
      return customer
    },

    async update(id: number, input: UpdateCustomerInput): Promise<Customer | null> {
      const customer = await updateCustomer(id, input)
      await this.refresh()
      return customer
    },

    async remove(id: number): Promise<boolean> {
      const deleted = await deleteCustomer(id)
      await this.refresh()
      return deleted
    },
  },
})
