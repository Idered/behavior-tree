import {nanoid} from 'nanoid'
import produce, {applyPatches, Patch, enablePatches, Draft} from 'immer'

enablePatches()

export const enum NodeStatus {
  Ready = 'Ready',
  Success = 'Success',
  Failure = 'Failure',
  Running = 'Running',
}
export const enum NodeType {
  Action = 'Action',
  Condition = 'Condition',
  Decorator = 'Decorator',
  Invert = 'Invert',
  Parallel = 'Parallel',
  Portal = 'Portal',
  Root = 'Root',
  Selector = 'Selector',
  Sequence = 'Sequence',
  State = 'State',
}
export const enum _StoreKey {
  TickState = '$tickState',
  Patches = '$patches',
  SequenceIndex = '$sequenceIndex',
  Status = '$status',
  Count = '$count',
  WasRun = '$wasRun',
}
export interface INodeStore {
  [_StoreKey.Count]: number
  [_StoreKey.Status]: NodeStatus
}
export interface INodeTarget {
  addEventListener: (type: 'tick', listener: () => void) => void
  removeEventListener: (type: 'tick', listener: () => void) => void
  dispatchEvent: (event: CustomEvent) => boolean
}
export interface IRootNode<T, Props> extends IWithStore, INodeTarget {
  id: string
  name: string
  type: NodeType.Root
  store: INodeStore
  onTick: (cb: () => void) => void
  children: ICompositeNode<T, Props>
}
export interface IConditionNode<T, Props> extends IWithStore {
  id: string
  name: string
  type: NodeType.Condition
  store: INodeStore
  parent?: IAnyNode<T, Props>
  exec(
    args: {state: T; node: IConditionNode<T, Props>; root: IRootNode<T, Props>},
    props: Props
  ): any
}
export interface IActionNode<T, Props> extends IWithStore {
  id: string
  name: string
  type: NodeType.Action
  fn: (state: Draft<T>, props: Props) => void | Promise<void>
  store: INodeStore
  parent?: IAnyNode<T, Props>
}
export interface IStateNode<T, Props> extends IWithStore {
  id: string
  type: NodeType.State
  store: INodeStore
  parent?: IAnyNode<T, Props>
  children: IAnyChildNode<T, Props>
  state: any
}
export interface IPortalNode<T, Props> extends IWithStore {
  id: string
  type: NodeType.Portal
  store: INodeStore
  parent?: IAnyNode<T, Props>
  children: Array<ICompositeNode<T, Props>>
  clear: () => IPortalNode<T, Props>
  mount: (children: ICompositeNode<T, Props>) => IPortalNode<T, Props>
  unmount: (children: ICompositeNode<T, Props>) => IPortalNode<T, Props>
}
export interface ISequenceNode<T, Props> extends IWithStore {
  id: string
  type: NodeType.Sequence
  store: INodeStore
  parent?: IAnyNode<T, Props>
  children: Array<ICompositeNode<T, Props> | ILeafNode<T, Props>>
}
export interface IParallelNode<T, Props> extends IWithStore {
  id: string
  type: NodeType.Parallel
  store: INodeStore
  parent?: IAnyNode<T, Props>
  children: Array<ICompositeNode<T, Props> | IActionNode<T, Props>>
}
export interface ISelectorNode<T, Props> extends IWithStore {
  id: string
  type: NodeType.Selector
  store: INodeStore
  parent?: IAnyNode<T, Props>
  children: Array<ICompositeNode<T, Props> | IActionNode<T, Props>>
}
export interface IDecoratorNode<T, Props> extends IWithStore {
  id: string
  type: NodeType.Decorator
  store: INodeStore
  parent?: IAnyNode<T, Props>
  decorator: (status: NodeStatus) => NodeStatus
  children: ILeafNode<T, Props>
}
export interface IInvertNode<T, Props> extends IWithStore {
  id: string
  type: NodeType.Invert
  store: INodeStore
  parent?: IAnyNode<T, Props>
  children: IAnyChildNode<T, Props>
}
export type ICompositeNode<T, Props> =
  | ISelectorNode<T, Props>
  | ISequenceNode<T, Props>
  | IParallelNode<T, Props>
  | IDecoratorNode<T, Props>
  | IInvertNode<T, Props>
  | IPortalNode<T, Props>
  | IStateNode<T, Props>
export type ILeafNode<T, Props> =
  | IActionNode<T, Props>
  | IConditionNode<T, Props>
export type IAnyChildNode<T, Props> =
  | ICompositeNode<T, Props>
  | ILeafNode<T, Props>
export type IAnyNode<T, Props> = IRootNode<T, Props> | IAnyChildNode<T, Props>
export type IStore = ReturnType<typeof _createStore>
export interface IWithStore {
  /**
   * Get value form node store
   */
  getValue: <T>(key: string, defaultValue?: T) => T
  /**
   * Set value in node store
   */
  setValue: (key: string, value: any) => any
  /**
   * Update execution counter
   */
  bump: () => void
}

export function tick<T, Props>(
  root: IRootNode<T, Props>,
  state: T,
  options: {
    props: Props | {}
    setState: any
  } = {
    props: {},
    setState: () => {},
  }
): NodeStatus | undefined {
  if (root.type !== NodeType.Root) {
    throw new Error('Use tick on root node.')
  }

  if (typeof window === 'undefined') {
    return undefined
  }
  root.setValue(
    _StoreKey.TickState,
    root.getValue(_StoreKey.TickState) || state
  )
  const result = _interpret(root.children, root, options)
  const currentTickState = root.getValue(_StoreKey.TickState)
  options.setState(currentTickState)
  _resetFinalStates(root.children, root)
  root.dispatchEvent(new CustomEvent('tick'))

  return result
}

export function rafTick<T, Props>(node: IRootNode<T, Props>, state: T) {
  if (typeof window === 'undefined') {
    return
  }

  if (!window.requestAnimationFrame) {
    throw new Error(`Browser doesn't support requestAnimationFrame`)
  }

  window.requestAnimationFrame(() => {
    tick(node, state)
    rafTick(node, state)
  })
}

export const nodes = {
  root: function <T, Props>(
    name: string,
    children: () => ICompositeNode<T, Props>
  ): () => IRootNode<T, Props> {
    return () => {
      const registrations: {
        [key: string]: Array<(event: CustomEvent) => void>
      } = {}
      const getListeners = function (type: string) {
        if (!(type in registrations)) registrations[type] = []
        return registrations[type]
      }
      return {
        id: nanoid(),
        name,
        type: NodeType.Root,
        children: children(),
        addEventListener: (type: 'tick', listener: () => void) => {
          const listeners = getListeners(type)
          const index = listeners.indexOf(listener)
          if (index === -1) registrations[type].push(listener)
        },
        removeEventListener: (type: 'tick', listener: () => void) => {
          const listeners = getListeners(type)
          const index = listeners.indexOf(listener)
          if (index !== -1) registrations[type].splice(index, 1)
        },
        dispatchEvent: (event: CustomEvent) => {
          var listeners = getListeners(event.type).slice()
          for (var i = 0; i < listeners.length; i++)
            listeners[i].call(this, event)
          return !event.defaultPrevented
        },
        onTick: function (cb: () => void) {
          this.addEventListener('tick', cb)
        },
        ..._createStore(),
      }
    }
  },
  /**
   * Runs child nodes in sequence until it finds one that succeeds. Succeeds when it finds the first child that succeeds. For child nodes that fail, it moves forward to the next child node. While a child is running it stays on that child node without moving forward.
   */
  selector: function <T, Props>(
    children: Array<ICompositeNode<T, Props> | IActionNode<T, Props>>
  ): ISelectorNode<T, Props> {
    return {
      id: nanoid(),
      type: NodeType.Selector,
      children,
      ..._createStore(),
    }
  },
  /**
   * Runs each child node one by one. Fails for the first child node that fails. Moves to the next child when the current running child succeeds. Stays on the current child node while it returns running. Succeeds when all child nodes have succeeded.
   */
  sequence: function <T, Props>(
    children: Array<ICompositeNode<T, Props> | ILeafNode<T, Props>>
  ): ISequenceNode<T, Props> {
    return {
      id: nanoid(),
      type: NodeType.Sequence,
      children,
      ..._createStore({
        [_StoreKey.SequenceIndex]: 0,
      }),
    }
  },
  /**
   * Runs all child nodes in parallel. Continues to run until a required number of child nodes have either failed or succeeded.
   */
  parallel: function <T, Props>(
    children: Array<ICompositeNode<T, Props> | IActionNode<T, Props>>
  ): IParallelNode<T, Props> {
    return {
      id: nanoid(),
      type: NodeType.Parallel,
      children,
      ..._createStore(),
    }
  },
  condition: function <T, Props>(
    name: string,
    fn?: (state: T, props: Props) => void
  ): IConditionNode<T, Props> {
    return {
      id: nanoid(),
      name,
      type: NodeType.Condition,
      exec: (args, props) => {
        if (typeof fn === 'function') {
          return fn(args.state, props)
        } else {
          return true
        }
      },
      ..._createStore(),
    }
  },
  portal: function <T, Props>(): IPortalNode<T, Props> {
    return {
      id: nanoid(),
      type: NodeType.Portal,
      children: [],
      ..._createStore(),
      clear: function () {
        this.children.splice(0, this.children.length)
        return this
      },
      mount: function (children: ICompositeNode<T, Props>) {
        if (this.children.find((item) => item.id === children.id)) return this
        this.children.push(children)
        return this
      },
      unmount: function (children: ICompositeNode<T, Props>) {
        const index = this.children.findIndex((item) => item.id === children.id)
        this.children.splice(index, 1)
        return this
      },
    }
  },
  state: function <T, Props>(
    state: any,
    children: IAnyChildNode<T, Props>
  ): IStateNode<T, Props> {
    return {
      id: nanoid(),
      type: NodeType.State,
      children,
      state,
      ..._createStore(),
    }
  },
  invert: function <T, Props>(
    children: IAnyChildNode<T, Props>
  ): IInvertNode<T, Props> {
    return {
      id: nanoid(),
      type: NodeType.Invert,
      children,
      ..._createStore(),
    }
  },
  action: function <T, Props>(
    name: string,
    fn: (state: Draft<T>, props: Props) => void
  ): IActionNode<T, Props> {
    return {
      id: nanoid(),
      name,
      type: NodeType.Action,
      fn,
      ..._createStore(),
    }
  },
}

export function _resetFinalStates<T, Props>(
  node: IAnyNode<T, Props>,
  root: IRootNode<T, Props>
) {
  switch (node.type) {
    case NodeType.Action:
      if (!node.getValue(_StoreKey.WasRun)) {
        node.setValue(_StoreKey.Status, NodeStatus.Ready)
      }
      // TODO: Clean up finished actions
      break
    case NodeType.Portal:
    case NodeType.Invert:
    case NodeType.Parallel:
    case NodeType.Sequence:
    case NodeType.Selector: {
      // TODO: Clean up this logic

      const children = Array.isArray(node.children)
        ? node.children
        : [node.children]
      const hasRunningChildren = children.some(
        (item) => item.getValue(_StoreKey.Status) === NodeStatus.Running
      )
      const isSequence = node.type === NodeType.Sequence
      const hasSequenceFinished = isSequence
        ? node.getValue<number>(_StoreKey.SequenceIndex) + 1 ===
            children.length || node.getValue(_StoreKey.WasRun) === false
        : true

      if (!hasRunningChildren && hasSequenceFinished) {
        node.setValue(_StoreKey.Status, NodeStatus.Ready)

        if (node.type === NodeType.Sequence) {
          node.setValue(_StoreKey.SequenceIndex, 0)
        }

        children.forEach((item) => {
          item.setValue(_StoreKey.Status, NodeStatus.Ready)
        })
      }

      for (let i = 0; i < children.length; i++) {
        _resetFinalStates(children[i], root)
      }
      break
    }
    default:
      break
  }

  node.setValue(_StoreKey.WasRun, false)
}

function _interpret<T, Props extends Record<string, any>>(
  node: IAnyNode<T, Props>,
  root: IRootNode<T, Props>,
  options: {
    props: Props
    setState: any
  } = {
    props: {} as Props,
    setState: () => {},
  }
): NodeStatus {
  const state = root.getValue<T>(_StoreKey.TickState)
  node.setValue(_StoreKey.WasRun, true)

  switch (node.type) {
    case NodeType.Action: {
      const status = node.getValue<NodeStatus>(_StoreKey.Status)

      // This is an async action
      if (status === NodeStatus.Running) {
        const patches = node.getValue<Patch[]>(_StoreKey.Patches)

        // If patches is not undefined then action has resolved and we can apply it's result to current state
        if (patches) {
          // Apply patches to current state
          const nextState = applyPatches(state, patches)
          // Reset patches array
          node.setValue(_StoreKey.Patches, undefined)
          node.setValue(_StoreKey.Status, NodeStatus.Success)

          root.setValue(_StoreKey.TickState, nextState)
          // Trigger tree tick with new state
          tick(root, nextState)

          return NodeStatus.Success
        }

        return status
      }

      node.bump()

      const result = produce(
        state,
        (draft) => node.fn(draft, options.props),
        (patches) => {
          node.setValue(_StoreKey.Patches, patches)

          if (isPromise(result)) {
            tick(root, state, options)
          }
        }
      )

      if (isPromise(result)) {
        node.setValue(_StoreKey.Status, NodeStatus.Running)

        return NodeStatus.Running
      }

      // TODO: Handle errors(failure status)

      // if (maybePromise && typeof maybePromise.then === 'function') {
      //   node.setValue(_StoreKey.Status, NodeStatus.Running)

      //   maybePromise.then(
      //     (nextState) => {
      //       options.setState(nextState)
      //       node.setValue(_StoreKey.Status, NodeStatus.Success)
      //       tick(root, nextState)
      //     },
      //     (err) => {
      //       node.setValue(_StoreKey.Status, NodeStatus.Failure)
      //       tick(root, state)
      //       throw err
      //     }
      //   )

      //   node.setValue(_StoreKey.Status, NodeStatus.Running)
      //   return NodeStatus.Running
      // } else {
      //   // tick(root, result)
      //   options.setState(result)
      // }

      root.setValue(_StoreKey.TickState, result)
      node.setValue(_StoreKey.Status, NodeStatus.Success)
      return NodeStatus.Success
    }
    case NodeType.Condition: {
      node.bump()
      node.setValue(_StoreKey.Status, NodeStatus.Running)
      if (
        node.exec(
          {
            state,
            node,
            root,
          },
          options.props || {}
        )
      ) {
        node.setValue(_StoreKey.Status, NodeStatus.Success)
        return NodeStatus.Success
      } else {
        node.setValue(_StoreKey.Status, NodeStatus.Failure)
        return NodeStatus.Failure
      }
    }
    case NodeType.Invert: {
      node.bump()
      node.setValue(_StoreKey.Status, NodeStatus.Running)
      const status = _interpret(node.children, root, options)
      if (status === NodeStatus.Failure) {
        node.setValue(_StoreKey.Status, NodeStatus.Success)
        return NodeStatus.Success
      }
      if (status === NodeStatus.Success) {
        node.setValue(_StoreKey.Status, NodeStatus.Failure)
        return NodeStatus.Failure
      }
      return status
    }
    case NodeType.State: {
      node.bump()
      return _interpret(node.children, root, options)
    }
    case NodeType.Decorator: {
      node.bump()
      return node.decorator(_interpret(node.children, root, options))
    }
    case NodeType.Portal:
    case NodeType.Parallel: {
      node.bump()
      node.setValue(_StoreKey.Status, NodeStatus.Running)
      let states = []

      for (let i = 0; i < node.children.length; i++) {
        node.children[i].parent = node
        states[i] = _interpret(node.children[i], root, options)
      }
      // TODO: Make this a prop
      const nSuccess = states.filter((status) => status === NodeStatus.Success)
        .length
      // TODO: Make this a prop
      const nFailure = states.filter((status) => status === NodeStatus.Failure)
        .length

      if (nSuccess === node.children.length) {
        node.setValue(_StoreKey.Status, NodeStatus.Success)
        return NodeStatus.Success
      } else if (nFailure === node.children.length) {
        node.setValue(_StoreKey.Status, NodeStatus.Failure)
        return NodeStatus.Failure
      }
      node.setValue(_StoreKey.Status, NodeStatus.Running)
      return NodeStatus.Running
    }
    case NodeType.Sequence: {
      node.bump()
      node.setValue(_StoreKey.Status, NodeStatus.Running)
      let index = node.getValue<number>(_StoreKey.SequenceIndex, 0)
      while (index < node.children.length) {
        const child = node.children[index]
        child.parent = node
        const status = _interpret(child, root, options)

        if (status === NodeStatus.Success) {
          node.setValue(_StoreKey.SequenceIndex, ++index)
          continue
        } else if (status === NodeStatus.Running) {
          node.setValue(_StoreKey.Status, NodeStatus.Running)
          return NodeStatus.Running
        } else if (status === NodeStatus.Failure) {
          node.setValue(_StoreKey.SequenceIndex, 0)
          node.setValue(_StoreKey.Status, NodeStatus.Failure)
          return NodeStatus.Failure
        }
      }
      node.setValue(_StoreKey.SequenceIndex, 0)
      node.setValue(_StoreKey.Status, NodeStatus.Success)
      return NodeStatus.Success
    }
    case NodeType.Selector: {
      node.bump()
      node.setValue(_StoreKey.Status, NodeStatus.Running)

      for (const child of node.children) {
        child.parent = node
        const status = _interpret(child, root, options)
        if (status === NodeStatus.Success || status === NodeStatus.Running) {
          node.setValue(_StoreKey.Status, status)
          return status
        }
      }
      node.setValue(_StoreKey.Status, NodeStatus.Failure)
      return NodeStatus.Failure
    }
    default:
      throw new Error('Invalid node type!')
  }
}

export function _createStore(customState?: any) {
  return {
    store: {
      [_StoreKey.Count]: 0,
      [_StoreKey.WasRun]: false,
      [_StoreKey.Status]: NodeStatus.Ready,
      ...customState,
    },
    bump() {
      const currentValue = this.getValue<number>(_StoreKey.Count, 0)
      this.setValue(_StoreKey.Count, currentValue + 1)
    },
    setValue(key: string, value: any) {
      this.store[key] = value
    },
    getValue<Value>(key: string, defaultValue?: any): Value {
      if (this.store === undefined) {
        return defaultValue === undefined ? undefined : defaultValue
      }
      return this.store[key] === undefined ? defaultValue : this.store[key]
    },
  }
}

function isPromise(item: any): boolean {
  return item && typeof item.then === 'function'
}
