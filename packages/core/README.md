# @btree/core

![](../../art/banner-core.png)

This package contains Behavior Tree nodes and interpreter implementation.

## Quick start

```sh
npm i @btree/core
```


```tsx
import {nodes} from '@btree/core'

const HelloBehavior = nodes.root('Hello behavior', () =>
  nodes.selector([
    nodes.sequence([
      nodes.condition('Has admin role', (state, props) => props?.role === 'admin'),
      nodes.action('Say hello to admin', () => {
        console.log('Hello boss')
      })
    ]),
    nodes.action('Say hello to user', () => {
      console.log('Hello user')
    })
  ])
)

// Create instance of tree
const helloTree = HelloBehavior()

helloTree.tick() // => Hello user
helloTree.tick({role: 'admin'}) // => Hello boss
```


## API

### `nodes.root(name, () => children)`

Creates a new Behavior Tree.

```tsx
const AppBehavior = nodes.root('AppBehavior', () =>
  nodes.selector([
    // ...
  ])
)
```

### `nodes.sequence([children])`

Runs each child node one by one. Returns failure for the first child node that fails. Moves to the next child when the currently running child succeeds. Stays on the current child node while it returns running(async operation) status. Succeeds when all child nodes have succeeded.

### `nodes.selector([children])`

Runs child nodes one by one until it finds one that succeeds. Return success status when it finds the child that succeeds, stops execution at that time. For child nodes that fail, it moves forward to the next child node. While a child is running(async operation) it stays on that child node without moving forward.

### `nodes.parallel([children])`

Runs all child nodes in parallel. Continues to run until a all children nodes have either failed or succeeded.

```tsx
nodes.parallel([
  nodes.action('Load user profile', async (state) => {
    state.profile = await // ...
  }),
  nodes.action('Load blog posts', async (state) => {
    state.posts = await // ...
  })
])
```

### `nodes.condition(description, (state, props) => boolean)`

Perform a logic check on current state and props.

```tsx
nodes.condition('Is loading', state => state.isLoading)
```

### `nodes.action(description, (state, props) => void)`

Action is used to modify state and emit side effects.

```tsx
nodes.action('Stop loading', (state) => {
  state.isLoading = false
})
```

### `nodes.invert(children)`

This node is used to change children status to:
- `Success` if children returned `Failure`
- `Failure` if children returned `Success`

It's useful when you have extracted node logic to const.

```tsx
const isLoading = nodes.condition('Is loading', state => state.isLoading)

nodes.sequence([
  nodes.invert(isLoading),
  nodes.action('Content was loaded', () => {
    console.log('Done')
  })
])
```
