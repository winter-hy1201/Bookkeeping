declare module 'pinia' {
  import type { App } from 'vue'

  export interface Pinia {
    install(app: App): void
  }

  export type StateTree = object

  type GetterTree<S extends StateTree> = Record<string, (state: S) => unknown>

  type GetterResults<G> = {
    readonly [K in keyof G]: G[K] extends (...args: unknown[]) => infer R ? R : never
  }

  type Store<S extends StateTree, G extends GetterTree<S>, A> = S & GetterResults<G> & A

  export function createPinia(): Pinia

  export function defineStore<S extends StateTree, G extends GetterTree<S>, A>(
    id: string,
    options: {
      state: () => S
      getters?: G
      actions?: A & ThisType<Store<S, G, A>>
    },
  ): () => Store<S, G, A>
}
