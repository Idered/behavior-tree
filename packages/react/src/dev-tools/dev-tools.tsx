import * as React from 'react'
import {IAnyNode, NodeStatus, _StoreKey, IRootNode, NodeType} from '@btree/core'
import styles from './style.module.css'
import {
  SequenceIcon,
  SelectorIcon,
  QuestionIcon,
  ActionIcon,
  InvertIcon,
  PortalIcon,
  StateIcon,
} from './icons'

export interface TreeViewProps {}

export interface TreeNodeProps {
  node: IAnyNode<any, any>
}

const Item = React.memo<{
  children?: React.ReactNode
  status?: NodeStatus
}>(({children, status = NodeStatus.Ready}) => (
  <div className={`${styles.listItem} ${styles[status]}`}>{children}</div>
))
const Loader = React.memo(() => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 38 38"
    xmlns="http://www.w3.org/2000/svg"
    stroke="#ffc107"
  >
    <g fill="none" fillRule="evenodd">
      <g transform="translate(3 3)" strokeWidth="6">
        <circle strokeOpacity=".5" cx="16" cy="16" r="16" />
        <path d="M32 16c0-9.94-8.06-16-16-16">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 16 16"
            to="360 16 16"
            dur="1s"
            repeatCount="indefinite"
          />
        </path>
      </g>
    </g>
  </svg>
))
const Status: React.FC<{status: NodeStatus}> = React.memo(({status}) =>
  status === NodeStatus.Running ? (
    <Loader />
  ) : (
    <div className={`${styles.itemStatus} ${styles[status]}`} />
  )
)
const Count: React.FC = React.memo(({children}) => (
  <div className={styles.counter}>{children}</div>
))
const Label: React.FC = React.memo(({children}) => (
  <div className={styles.itemLabel}>{children}</div>
))
const TreeNode: React.FC<TreeNodeProps> = ({node}) => {
  if (!node) {
    return null
  }

  if (node.type === NodeType.Root) {
    return <TreeNode node={node.children} />
  }

  if (node.type === NodeType.Sequence) {
    return (
      <Item status={node.getValue(_StoreKey.Status)}>
        <Label>
          <SequenceIcon
            className={`${styles.labelIcon} ${styles.labelIconSequence}`}
          />
          Sequence
          <Count>{node.getValue(_StoreKey.Count)}</Count>
          <Status status={node.getValue(_StoreKey.Status)} />
        </Label>
        {node.children.map((item) => (
          <TreeNode key={item.id} node={item} />
        ))}
      </Item>
    )
  }

  if (node.type === NodeType.Parallel) {
    return (
      <Item status={node.getValue(_StoreKey.Status)}>
        <Label>
          Parallel
          <Count>{node.getValue(_StoreKey.Count)}</Count>
          <Status status={node.getValue(_StoreKey.Status)} />
        </Label>
        {node.children.map((item) => (
          <TreeNode key={item.id} node={item} />
        ))}
      </Item>
    )
  }

  if (node.type === NodeType.Selector) {
    return (
      <Item status={node.getValue(_StoreKey.Status)}>
        <Label>
          <SelectorIcon
            className={`${styles.labelIcon} ${styles.labelIconSelector}`}
          />
          Selector
          <Count>{node.getValue(_StoreKey.Count)}</Count>
          <Status status={node.getValue(_StoreKey.Status)} />
        </Label>
        {node.children.map((item) => (
          <TreeNode key={item.id} node={item} />
        ))}
      </Item>
    )
  }

  if (node.type === NodeType.Condition) {
    return (
      <Item status={node.getValue(_StoreKey.Status)}>
        <Label>
          <QuestionIcon
            className={`${styles.labelIcon} ${styles.labelIconQuestion}`}
          />
          {node.name}
          <Count>{node.getValue(_StoreKey.Count)}</Count>
          <Status status={node.getValue(_StoreKey.Status)} />
        </Label>
      </Item>
    )
  }

  if (node.type === NodeType.Action) {
    return (
      <Item status={node.getValue(_StoreKey.Status)}>
        <Label>
          <ActionIcon
            className={`${styles.labelIcon} ${styles.labelIconAction}`}
          />
          {node.name}
          <Count>{node.getValue(_StoreKey.Count)}</Count>
          <Status status={node.getValue(_StoreKey.Status)} />
        </Label>
      </Item>
    )
  }

  if (node.type === NodeType.Invert) {
    return (
      <Item status={node.getValue(_StoreKey.Status)}>
        <Label>
          <InvertIcon
            className={`${styles.labelIcon} ${styles.labelIconInvert}`}
          />
          Invert
          <Count>{node.getValue(_StoreKey.Count)}</Count>
          <Status status={node.getValue(_StoreKey.Status)} />
        </Label>
        <TreeNode node={node.children} />
      </Item>
    )
  }

  if (node.type === NodeType.State) {
    return (
      <Item status={node.getValue(_StoreKey.Status)}>
        <Label>
          <StateIcon
            className={`${styles.labelIcon} ${styles.labelIconState}`}
          />
          State
          <Count>{node.getValue(_StoreKey.Count)}</Count>
          <Status status={node.getValue(_StoreKey.Status)} />
        </Label>
        <TreeNode node={node.children} />
      </Item>
    )
  }

  if (node.type === NodeType.Decorator) {
    return (
      <Item status={node.getValue(_StoreKey.Status)}>
        <Label>
          Decorator
          <Count>{node.getValue(_StoreKey.Count)}</Count>
          <Status status={node.getValue(_StoreKey.Status)} />
        </Label>
        <TreeNode node={node.children} />
      </Item>
    )
  }

  if (node.type === NodeType.Portal) {
    return (
      <Item status={node.getValue(_StoreKey.Status)}>
        <Label>
          <PortalIcon
            className={`${styles.labelIcon} ${styles.labelIconPortal}`}
          />
          Portal
          <Count>{node.getValue(_StoreKey.Count)}</Count>
          <Status status={node.getValue(_StoreKey.Status)} />
        </Label>
        {node.children.map((item) => (
          <TreeNode key={item.id} node={item} />
        ))}
      </Item>
    )
  }

  return (
    <Item>
      <Label>INVALID NODE</Label>
    </Item>
  )
}

function reducer(
  state: IRootNode<any, any>[],
  action: {
    type: 'registerTree' | 'unregisterTree'
    payload: IRootNode<any, any>
  }
) {
  if (action.type === 'unregisterTree') {
    return state.filter((item) => item !== action.payload)
  }
  return [...state, action.payload]
}

export const DevToolsContext = React.createContext<
  [IRootNode<any, any>[], React.Dispatch<Parameters<typeof reducer>[1]>] | []
>([])

export const DevTools = React.memo(({children}) => {
  const [, setUpdate] = React.useState()
  const [selectedTreeId, setSelectedTreeId] = React.useState<
    string | undefined
  >()
  const [trees, dispatch] = React.useReducer(reducer, [])
  const selectedTree = trees.find((item) => item.id === selectedTreeId)

  React.useEffect(() => {
    const update = () => setUpdate({})
    if (trees.length === 0) return
    if (!selectedTree) {
      setSelectedTreeId(trees[0].id)
      return
    }

    selectedTree.onTick(update)

    return () => {
      selectedTree.removeEventListener('tick', update)
    }
  }, [selectedTree, trees])

  return (
    <DevToolsContext.Provider value={[trees, dispatch]}>
      <div className={styles.container}>
        <select
          className={styles.select}
          onChange={(e) => {
            setSelectedTreeId(e.target.value)
          }}
        >
          {trees.map((node, index) => (
            <option key={node.id} value={node.id}>
              {index + 1}. {node.name}
            </option>
          ))}
        </select>

        <div className={styles.list}>
          {selectedTree && <TreeNode node={selectedTree} />}
        </div>
      </div>
      {children}
    </DevToolsContext.Provider>
  )
})
