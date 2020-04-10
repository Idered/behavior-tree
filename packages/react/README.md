# @btree/react

![](../../art/banner-react.png)

This package contains React hooks and DevTools component used to visualize tree.

## Quick start

```sh
npm i @btree/core @bree/react
```

## API

### `useTree(options)`

Initialize tree instance and setup connection with React state.

- `options.tree`: an instance of root node
- `options.initialState`: Initial state passed to tree

```tsx
import {nodes} from '@btree/core'
import {useTree} from '@btree/react'

const tree = nodes.root('AppTree', () =>
  nodes.sequence([
    nodes.condition('Is logout action', (state, props) => props?.action === 'logout'),
    nodes.action('Do logout', (state) => {
      state.username = null
    })
  ])
)

const initialState = {
  username: 'john'
}

const App = () => {
  const {state, tick} = useTree({tree, initialState})

  return (
    <div>
      {state.username ? (
        <div>
          <div>Hello {state.username}</div>
          <button onClick={() => tick({action: 'logout'})}>Logout</button>
        </div>
      ) : (
        <div>Hello guest</div>
      )}
    </div>
  )
}
```

### `DevTools`

Component used to visualize BehaviorTree.

```tsx
const App = () => (
  <DevTools>
    <YourPage />
  </DevTools>
)
```

Or if you want to use `useTree` in App component:

```tsx
const App = () => {
  const tree = useTree({tree: AppBehavior})

  return (
    <DevTools trees={[tree]}>
      <YourPage />
    </DevTools>
  )
}
```

### `createTreeContext(tree)`

Function used to create React Context for given tree.

```tsx
const AppBehavior = nodes.root('AppBehavior', () =>
  nodes.selector([
    // ...
  ])
)

const {useTreeContext, TreeContext} = createTreeContext(AppBehavior)

const MyComponent = () => {
  const tree = useTreeContext()
  // You can access tree.state in nested component
}

const App = () => {
  const tree = useTree({tree: AppBehavior})
  return (
    <TreeContext.Provider value={tree}>
      <MyComponent />
    </TreeContext.Provide>
  )
}
```
