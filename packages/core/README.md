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

Creates a new Behavior Tree. It takes a name of the tree and a function that return any of children nodes eg. selector, sequence etc.

```tsx
const AppBehavior = nodes.root('AppBehavior', () =>
  nodes.selector([
    // ...
  ])
)
```

### `nodes.sequence([children, children, ...])`

Sequence is an AND, requiring all children to succeed. It will visit each child in order, starting with the first, and when that succeeds, it will go to next one. If any child fails it will immediately return failure to the parent. If the last child in the sequence succeeds, then the sequence will return success ot its parent.

The following example will:
1. Check if user is logged in
2. If user is not logged in - it will do nothing
3. If user is logged in - it will add item to cart

```tsx
nodes.sequence([
  nodes.condition('Ensure user is logged in', () => /* ... */),
  nodes.action('Add item to cart', () => /* ... */)
])
```

### `nodes.selector([children, children, ...])`

Selector is an OR, requiring at least one children to succeed. It will run each child in order, starting with the first, if it fails, it will run the next one, until it finds one that succeeds an returns it to the parent. Selector will fail if all children returns failure.

The following example will:
1. Fetch featured posts
2. If fetching featured posts fail, it will get recent posts

```tsx
nodes.selector([
  nodes.action('Get featured posts', () => /* ... */),
  nodes.action('Get recent posts', () => /* ... */)
])
```

### `nodes.parallel([children, children, ...])`

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
