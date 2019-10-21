import {v4} from 'uuid'

export const enum _NodeStatus {
  Success = 1,
  Failure = 2,
  Running = 3,
}
export const enum _StoreKey {
  SequenceIndex = '$sequenceIndex',
  Status = '$status',
}
const NodeStatusName = [, 'Success', 'Failure', 'Running']
export type IConditionalNode<T> = {
  uuid: string
  name: string
  type: 'Conditional'
  exec(props: {
    state: T
    node: IConditionalNode<T> & IWithStore
    root: IRootNode<T> & IWithStore
  }): boolean
}
export type IActionNode<T> = {
  uuid: string
  name: string
  type: 'Action'
  exec(props: {
    state: T
    node: IActionNode<T> & IWithStore
    root: IRootNode<T> & IWithStore
  }): void | Promise<any>
}
export type ISequenceNode<T> = {
  uuid: string
  type: 'Sequence'
  children: Array<ICompositeNode<T> | ILeafNode<T>>
}
export type IParallelNode<T> = {
  uuid: string
  type: 'Parallel'
  children: Array<ICompositeNode<T> | IActionNode<T>>
}
export type IRootNode<T> = {
  uuid: string
  type: 'Root'
  children: ICompositeNode<T>
}
export type ISelectorNode<T> = {
  uuid: string
  type: 'Selector'
  children: Array<ICompositeNode<T> | IActionNode<T>>
}
export type IDecoratorNode<T> = {
  uuid: string
  type: 'Decorator'
  decorator: (status: _NodeStatus) => _NodeStatus
  children: ILeafNode<T>
}
export type IInvertNode<T> = {
  uuid: string
  type: 'Invert'
  children: IAnyChildNode<T>
}
export type ICompositeNode<T> =
  | ISelectorNode<T>
  | ISequenceNode<T>
  | IParallelNode<T>
  | IDecoratorNode<T>
  | IInvertNode<T>
export type ILeafNode<T> = IActionNode<T> | IConditionalNode<T>
export type IAnyChildNode<T> = ICompositeNode<T> | ILeafNode<T>
export type IAnyNode<T> = IRootNode<T> | IAnyChildNode<T>
export type IBehaviorTree<T> = IRootNode<T>
export type IStore = ReturnType<typeof _createStore>
export type IWithStore = {
  getValue: (key: string, defaultValue?: any) => any
  setValue: (key: string, value: any) => any
}

const stores: {
  [uuid: string]: IStore
} = {}

export function tick<T>(node: IRootNode<T>, state: T): _NodeStatus {
  if (node.type !== 'Root') {
    throw new Error('Use tick on root node.')
  }

  if (!stores[node.uuid]) {
    stores[node.uuid] = _createStore()
  }

  return _tick(node.children, state, stores[node.uuid], node)
}

export const nodes = {
  root: function<T>(children: ICompositeNode<T>): IRootNode<T> {
    return {uuid: v4(), type: 'Root' as const, children}
  },
  /**
   * Runs child nodes in sequence until it finds one that succeeds. Succeeds when it finds the first child that succeeds. For child nodes that fail, it moves forward to the next child node. While a child is running it stays on that child node without moving forward.
   */
  selector: function<T>(
    children: Array<ICompositeNode<T> | IActionNode<T>>
  ): ISelectorNode<T> {
    return {uuid: v4(), type: 'Selector' as const, children}
  },
  /**
   * Runs each child node in sequence. Fails for the first child node that fails. Moves to the next child when the current running child succeeds. Stays on the current child node while it returns running. Succeeds when all child nodes have succeeded.
   */
  sequence: function<T>(
    children: Array<ICompositeNode<T> | ILeafNode<T>>
  ): ISequenceNode<T> {
    return {uuid: v4(), type: 'Sequence' as const, children}
  },
  /**
   * Runs all child nodes in parallel. Continues to run until a required number of child nodes have either failed or succeeded.
   */
  parallel: function<T>(
    children: Array<ICompositeNode<T> | IActionNode<T>>
  ): IParallelNode<T> {
    return {uuid: v4(), type: 'Parallel' as const, children}
  },
  conditional: function<T>(
    name: string,
    fn?: (props: {
      state: T
      node: IConditionalNode<T> & IWithStore
      root: IRootNode<T> & IWithStore
    }) => boolean
  ): IConditionalNode<T> {
    return {
      name,
      uuid: v4(),
      type: 'Conditional' as const,
      exec: props => (typeof fn === 'function' ? fn(props) : true),
    }
  },
  invert: function<T>(children: IAnyChildNode<T>): IInvertNode<T> {
    return {
      uuid: v4(),
      type: 'Invert' as const,
      children,
    }
  },
  action: function<T>(
    name: string,
    fn: (props: {
      state: T
      node: IActionNode<T> & IWithStore
      root: IRootNode<T> & IWithStore
    }) => void | Promise<any>
  ): IActionNode<T> {
    return {
      name,
      uuid: v4(),
      type: 'Action' as const,
      exec: props => fn(props),
    }
  },
}
export function _tick<T>(
  node: IAnyNode<T>,
  state: T,
  store: IStore,
  root: IRootNode<T>
): _NodeStatus {
  switch (node.type) {
    case 'Action': {
      const status = store.getValue(_StoreKey.Status, node) as _NodeStatus

      if (status) {
        console.debug(`[ASYNC_ACTION] "${node.name}" ${NodeStatusName[status]}`)
        return status
      }

      const action = node.exec({
        state,
        node: _withStore(node, store),
        root: _withStore(root, store),
      })

      if (action && typeof action.then === 'function') {
        console.debug(`[ASYNC_ACTION] "${node.name}" is running`)
        store.setValue(_StoreKey.Status, node, _NodeStatus.Running)

        action.then(
          res => {
            store.setValue(_StoreKey.Status, node, _NodeStatus.Success)
            _tick(root.children, state, store, root)
            store.setValue(_StoreKey.Status, node, undefined)
            return res
          },
          err => {
            store.setValue(_StoreKey.Status, node, _NodeStatus.Failure)
            _tick(root.children, state, store, root)
            store.setValue(_StoreKey.Status, node, undefined)
            throw err
          }
        )

        console.debug(`[ASYNC_ACTION] "${node.name}" is pending`)
        return _NodeStatus.Running
      }

      console.debug(`[ACTION] "${node.name}" succeeded`)
      return _NodeStatus.Success
    }
    case 'Conditional': {
      if (
        node.exec({
          state,
          node: _withStore(node, store),
          root: _withStore(root, store),
        })
      ) {
        console.debug(`[CONDITIONAL]: "${node.name}" succeeded`)
        return _NodeStatus.Success
      } else {
        console.debug(`[CONDITIONAL]: "${node.name}" failure`)
        return _NodeStatus.Failure
      }
    }
    case 'Invert': {
      const status = _tick(node.children, state, store, root)
      if (status === _NodeStatus.Failure) return _NodeStatus.Success
      if (status === _NodeStatus.Success) return _NodeStatus.Failure
      return status
    }
    case 'Decorator': {
      return node.decorator(_tick(node.children, state, store, root))
    }
    case 'Parallel': {
      let states = []

      for (let i = 0; i < node.children.length; i++) {
        states[i] = _tick(node.children[i], state, store, root)
      }
      // TODO: Make this a prop
      const nSuccess = states.filter(status => status === _NodeStatus.Success)
        .length
      // TODO: Make this a prop
      const nFailure = states.filter(status => status === _NodeStatus.Failure)
        .length

      if (nSuccess === node.children.length) {
        return _NodeStatus.Success
      } else if (nFailure === node.children.length) {
        return _NodeStatus.Failure
      }

      return _NodeStatus.Running
    }
    case 'Sequence': {
      console.debug('[SEQUENCE]: Running')
      let index = store.getValue(_StoreKey.SequenceIndex, node, 0)
      while (index < node.children.length) {
        const child = node.children[index]
        const status = _tick(child, state, store, root)

        if (status === _NodeStatus.Success) {
          store.setValue(_StoreKey.SequenceIndex, node, ++index)
          continue
        } else if (status === _NodeStatus.Running) {
          console.debug('[SEQUENCE]: Running')
          return _NodeStatus.Running
        } else if (status === _NodeStatus.Failure) {
          store.setValue(_StoreKey.SequenceIndex, node, 0)
          console.debug('[SEQUENCE]: Failure')
          return _NodeStatus.Failure
        }
      }
      console.debug('[SEQUENCE]: Success')
      store.setValue(_StoreKey.SequenceIndex, node, 0)
      return _NodeStatus.Success
    }
    case 'Selector': {
      for (const child of node.children) {
        const status = _tick(child, state, store, root)
        if (status === _NodeStatus.Success || status === _NodeStatus.Running) {
          return status
        }
      }

      return _NodeStatus.Failure
    }
    default:
      return _NodeStatus.Success
  }
}

function _withStore<T extends IAnyNode<any>>(
  node: T,
  store: IStore
): T & IWithStore {
  return {
    ...node,
    getValue: (key: string, defaultValue?: any) =>
      store.getValue(key, node, defaultValue),
    setValue: (key: string, value?: any) => store.setValue(key, node, value),
  }
}

function _createStore<T>() {
  const store: {
    [uuid: string]:
      | {
          [key: string]: any
        }
      | undefined
  } = {}

  return {
    setValue: (key: string, node: IAnyNode<T>, value: any) => {
      if (store[node.uuid] === undefined) store[node.uuid] = {}
      if (store[node.uuid] !== undefined) (store[node.uuid] as any)[key] = value
    },
    getValue: (key: string, node: IAnyNode<T>, defaultValue?: any) => {
      const nodeStore = store[node.uuid]
      if (nodeStore === undefined) {
        return defaultValue === undefined ? undefined : defaultValue
      }
      return nodeStore[key] === undefined ? defaultValue : nodeStore[key]
    },
  }
}
