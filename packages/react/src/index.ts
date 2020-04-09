import {createContext, useContext, useState, useEffect, useMemo} from 'react'
import {IRootNode, IOptions} from '@btree/core'
import {DevToolsContext} from './dev-tools'

function useTree<State, Props>(options: {
  tree: (
    initialState: State,
    options: IOptions<Props | undefined>
  ) => IRootNode<State, Props>
  initialState: State
}) {
  const [, dispatch] = useContext(DevToolsContext)
  const [state, setState] = useState(options.initialState)
  const memoTree = useMemo(() => options.tree(state, {setState}), [])

  useEffect(() => {
    dispatch?.({type: 'registerTree', payload: memoTree})
    memoTree.tick()

    return () => {
      dispatch?.({type: 'unregisterTree', payload: memoTree})
    }
  }, [])

  return memoTree
}

function createTreeContext<State, Props>(
  _behaviorTree: (
    initialState: State,
    options?: IOptions<Props>
  ) => IRootNode<State, Props>
) {
  const TreeContext = createContext<IRootNode<State, Props> | null>(null)
  const useTreeContext = () => useContext(TreeContext)

  return {useTreeContext, TreeContext}
}

export {DevTools} from './dev-tools'
export {createTreeContext, useTree}
