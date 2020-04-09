import nanoid from 'nanoid'
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
  Patches = '$patches',
  SequenceIndex = '$sequenceIndex',
  Status = '$status',
  Count = '$count',
  WasRun = '$wasRun',
}
export interface INodeState {
  [_StoreKey.Count]: number
  [_StoreKey.Status]: NodeStatus
}
export interface INodeTarget {
  addEventListener: (
    type: 'tickstart' | 'tickend',
    listener: () => void
  ) => void
  removeEventListener: (
    type: 'tickstart' | 'tickend',
    listener: () => void
  ) => void
  dispatchEvent: (event: CustomEvent) => boolean
}
export interface IRootNode<State, Props> extends IWithNodeState, INodeTarget {
  id: string
  name: string
  type: NodeType.Root
  state: State
  children: ICompositeNode<State, Props>
  tick: (props?: Props) => NodeStatus | undefined
}
export interface IConditionNode<State, Props> extends IWithNodeState {
  id: string
  name: string
  type: NodeType.Condition
  parent?: IAnyNode<State, Props>
  exec(
    args: {
      state: State
      node: IConditionNode<State, Props>
      root: IRootNode<State, Props>
    },
    props: Props
  ): any
}
export interface IActionNode<State, Props> extends IWithNodeState {
  id: string
  name: string
  type: NodeType.Action
  fn: (state: Draft<State>, props: Props) => void | Promise<void>
  parent?: IAnyNode<State, Props>
}
export interface IStateNode<State, Props> extends IWithNodeState {
  id: string
  type: NodeType.State
  parent?: IAnyNode<State, Props>
  children: IAnyChildNode<State, Props>
  state: any
}
export interface IPortalNode<State, Props> extends IWithNodeState {
  id: string
  type: NodeType.Portal
  parent?: IAnyNode<State, Props>
  children: Array<ICompositeNode<State, Props>>
  clear: () => IPortalNode<State, Props>
  mount: (children: ICompositeNode<State, Props>) => IPortalNode<State, Props>
  unmount: (children: ICompositeNode<State, Props>) => IPortalNode<State, Props>
}
export interface ISequenceNode<State, Props> extends IWithNodeState {
  id: string
  type: NodeType.Sequence
  parent?: IAnyNode<State, Props>
  children: Array<ICompositeNode<State, Props> | ILeafNode<State, Props>>
}
export interface IParallelNode<State, Props> extends IWithNodeState {
  id: string
  type: NodeType.Parallel
  parent?: IAnyNode<State, Props>
  children: Array<ICompositeNode<State, Props> | IActionNode<State, Props>>
}
export interface ISelectorNode<State, Props> extends IWithNodeState {
  id: string
  type: NodeType.Selector
  parent?: IAnyNode<State, Props>
  children: Array<ICompositeNode<State, Props> | IActionNode<State, Props>>
}
export interface IDecoratorNode<State, Props> extends IWithNodeState {
  id: string
  type: NodeType.Decorator
  parent?: IAnyNode<State, Props>
  decorator: (status: NodeStatus) => NodeStatus
  children: ILeafNode<State, Props>
}
export interface IInvertNode<State, Props> extends IWithNodeState {
  id: string
  type: NodeType.Invert
  parent?: IAnyNode<State, Props>
  children: IAnyChildNode<State, Props>
}
export type ICompositeNode<State, Props> =
  | ISelectorNode<State, Props>
  | ISequenceNode<State, Props>
  | IParallelNode<State, Props>
  | IDecoratorNode<State, Props>
  | IInvertNode<State, Props>
  | IPortalNode<State, Props>
  | IStateNode<State, Props>
export type ILeafNode<State, Props> =
  | IActionNode<State, Props>
  | IConditionNode<State, Props>
export type IAnyChildNode<State, Props> =
  | ICompositeNode<State, Props>
  | ILeafNode<State, Props>
export type IAnyNode<State, Props> =
  | IRootNode<State, Props>
  | IAnyChildNode<State, Props>
export interface IWithNodeState {
  $nodeState: INodeState
  /**
   * Get value form node state
   */
  getValue: <T>(key: string, defaultValue?: T) => T
  /**
   * Set value in node state
   */
  setValue: (key: string, value: any) => any
}

export type IOptions<Props> = {
  props?: Props
  setState: any
}

export const nodes = {
  root: function<State, Props>(
    name: string,
    childrenFactory: () => ICompositeNode<State, Props>
  ) {
    return (
      initialState: State,
      options: IOptions<Props> = {
        props: {} as Props,
        setState: () => {},
      }
    ): IRootNode<State, Props> => {
      const registrations: {
        [key: string]: Array<(event: CustomEvent) => void>
      } = {}
      const getListeners = function(type: string) {
        if (!(type in registrations)) registrations[type] = []
        return registrations[type]
      }
      const root: IRootNode<State, Props> = {
        id: nanoid(),
        name,
        type: NodeType.Root,
        children: childrenFactory(),
        state: initialState,
        tick: function tick(props?: Props) {
          if (typeof window === 'undefined') {
            return undefined
          }
          this.dispatchEvent(new CustomEvent('tickstart'))
          const nodeStatus = _interpret(this.children, this, {
            ...options,
            props,
          })
          _resetFinalStates(this.children, this)
          this.dispatchEvent(new CustomEvent('tickend'))
          return nodeStatus
        },
        addEventListener: (
          type: 'tickstart' | 'tickend',
          listener: () => void
        ) => {
          const listeners = getListeners(type)
          const index = listeners.indexOf(listener)
          if (index === -1) registrations[type].push(listener)
        },
        removeEventListener: (
          type: 'tickstart' | 'tickend',
          listener: () => void
        ) => {
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
        ...createNodeState(),
      }
      root.addEventListener = root.addEventListener.bind(root)
      root.removeEventListener = root.removeEventListener.bind(root)
      root.dispatchEvent = root.dispatchEvent.bind(root)
      root.tick = root.tick.bind(root)
      return root
    }
  },
  /**
   * Runs child nodes in sequence until it finds one that succeeds. Succeeds when it finds the first child that succeeds. For child nodes that fail, it moves forward to the next child node. While a child is running it stays on that child node without moving forward.
   */
  selector: function<State, Props>(
    children: Array<ICompositeNode<State, Props> | IActionNode<State, Props>>
  ): ISelectorNode<State, Props> {
    return {
      id: nanoid(),
      type: NodeType.Selector,
      children,
      ...createNodeState(),
    }
  },
  /**
   * Runs each child node one by one. Fails for the first child node that fails. Moves to the next child when the current running child succeeds. Stays on the current child node while it returns running. Succeeds when all child nodes have succeeded.
   */
  sequence: function<State, Props>(
    children: Array<ICompositeNode<State, Props> | ILeafNode<State, Props>>
  ): ISequenceNode<State, Props> {
    return {
      id: nanoid(),
      type: NodeType.Sequence,
      children,
      ...createNodeState({
        [_StoreKey.SequenceIndex]: 0,
      }),
    }
  },
  /**
   * Runs all child nodes in parallel. Continues to run until a required number of child nodes have either failed or succeeded.
   */
  parallel: function<State, Props>(
    children: Array<ICompositeNode<State, Props> | IActionNode<State, Props>>
  ): IParallelNode<State, Props> {
    return {
      id: nanoid(),
      type: NodeType.Parallel,
      children,
      ...createNodeState(),
    }
  },
  condition: function<State, Props>(
    name: string,
    fn?: (state: State, props: Props) => void
  ): IConditionNode<State, Props> {
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
      ...createNodeState(),
    }
  },
  portal: function<State, Props>(): IPortalNode<State, Props> {
    return {
      id: nanoid(),
      type: NodeType.Portal,
      children: [],
      ...createNodeState(),
      clear: function() {
        this.children.splice(0, this.children.length)
        return this
      },
      mount: function(children: ICompositeNode<State, Props>) {
        if (this.children.find(item => item.id === children.id)) return this
        this.children.push(children)
        return this
      },
      unmount: function(children: ICompositeNode<State, Props>) {
        const index = this.children.findIndex(item => item.id === children.id)
        this.children.splice(index, 1)
        return this
      },
    }
  },
  state: function<State, Props>(
    state: any,
    children: IAnyChildNode<State, Props>
  ): IStateNode<State, Props> {
    return {
      id: nanoid(),
      type: NodeType.State,
      children,
      state,
      ...createNodeState(),
    }
  },
  invert: function<State, Props>(
    children: IAnyChildNode<State, Props>
  ): IInvertNode<State, Props> {
    return {
      id: nanoid(),
      type: NodeType.Invert,
      children,
      ...createNodeState(),
    }
  },
  action: function<State, Props>(
    name: string,
    fn: (state: Draft<State>, props: Props) => void
  ): IActionNode<State, Props> {
    return {
      id: nanoid(),
      name,
      type: NodeType.Action,
      fn,
      ...createNodeState(),
    }
  },
}

function _resetFinalStates<State, Props>(
  node: IAnyNode<State, Props>,
  root: IRootNode<State, Props>
) {
  switch (node.type) {
    case NodeType.Action:
      if (!node.getValue(_StoreKey.WasRun)) {
        node.setValue(_StoreKey.Status, NodeStatus.Ready)
      }
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
        item => item.getValue(_StoreKey.Status) === NodeStatus.Running
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

        children.forEach(item => {
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

function _interpret<State, Props>(
  node: IAnyNode<State, Props>,
  root: IRootNode<State, Props>,
  options: IOptions<Props> = {
    props: {} as Props,
    setState: () => {},
  }
): NodeStatus {
  const {state} = root
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
          root.state = nextState
          options.setState?.(nextState)
          root.tick(options.props)

          return NodeStatus.Success
        }

        return status
      }

      bump(node)

      const nextState = produce(
        state,
        draft => node.fn(draft, options.props || ({} as Props)),
        patches => {
          node.setValue(_StoreKey.Patches, patches)

          if (isPromise(nextState)) {
            root.tick()
          }
        }
      )

      if (isPromise(nextState)) {
        node.setValue(_StoreKey.Status, NodeStatus.Running)

        return NodeStatus.Running
      }

      // TODO: Handle errors(failure status)

      root.state = nextState as State
      options.setState?.(nextState)
      node.setValue(_StoreKey.Status, NodeStatus.Success)
      return NodeStatus.Success
    }
    case NodeType.Condition: {
      bump(node)
      node.setValue(_StoreKey.Status, NodeStatus.Running)
      if (
        node.exec(
          {
            state,
            node,
            root,
          },
          options.props || ({} as Props)
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
      bump(node)
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
      bump(node)
      return _interpret(node.children, root, options)
    }
    case NodeType.Decorator: {
      bump(node)
      return node.decorator(_interpret(node.children, root, options))
    }
    case NodeType.Portal:
    case NodeType.Parallel: {
      bump(node)
      node.setValue(_StoreKey.Status, NodeStatus.Running)
      let states = []

      for (let i = 0; i < node.children.length; i++) {
        node.children[i].parent = node
        states[i] = _interpret(node.children[i], root, options)
      }
      // TODO: Make this a prop
      const nSuccess = states.filter(status => status === NodeStatus.Success)
        .length
      // TODO: Make this a prop
      const nFailure = states.filter(status => status === NodeStatus.Failure)
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
      bump(node)
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
      bump(node)
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

function bump(node: IAnyNode<any, any>) {
  const currentValue = node.getValue<number>(_StoreKey.Count, 0)
  node.setValue(_StoreKey.Count, currentValue + 1)
}

function createNodeState(customState?: any) {
  return {
    $nodeState: {
      [_StoreKey.Count]: 0,
      [_StoreKey.WasRun]: false,
      [_StoreKey.Status]: NodeStatus.Ready,
      ...customState,
    },
    setValue(key: string, value: any) {
      this['$nodeState'][key] = value
    },
    getValue<Value>(key: string, defaultValue?: any): Value {
      if (this['$nodeState'] === undefined) {
        return defaultValue === undefined ? undefined : defaultValue
      }
      return this['$nodeState'][key] === undefined
        ? defaultValue
        : this['$nodeState'][key]
    },
  }
}

function isPromise(item: any): boolean {
  return item && typeof item.then === 'function'
}
