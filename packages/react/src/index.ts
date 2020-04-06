import {createContext, useContext, useState, useEffect, useMemo} from 'react'
import {IRootNode, tick, NodeStatus} from '@btree/core'

export {DevTools} from './dev-tools'
import {DevToolsContext} from './dev-tools'
export {createTreeStore, useTree}

function useTree<T, Props>(tree: () => IRootNode<T, Props>, initialState: T) {
  const [, dispatch] = useContext(DevToolsContext)
  const [state, setState] = useState(initialState)
  const memoTree = useMemo(() => tree(), [])
  const memoTick = (props: Props) => tick(memoTree, state, {setState, props})

  useEffect(() => {
    dispatch?.({type: 'registerTree', payload: memoTree})
    tick(memoTree, state, {setState, props: {}})

    return () => {
      dispatch?.({type: 'unregisterTree', payload: memoTree})
    }
  }, [])

  return [state, memoTick, memoTree] as [T, typeof memoTick, typeof memoTree]
}

function createTreeStore<State, Props>() {
  const StoreContext = createContext<
    [State, (props: Props) => NodeStatus | undefined] | null
  >(null)
  const useStore = () => useContext(StoreContext)

  return {useStore, StoreContext}
}
