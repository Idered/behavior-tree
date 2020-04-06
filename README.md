![](art/banner.png)

## Behavior Tree Toolkit

- 🌲 [@btree/core](packages/core) - Framework agnostic behavior trees implementation
- ⚛ [@btree/react](packages/react) - Hooks and docs how to use BT with React

## Quick start

> Check [docs](packages/core/README.md) to learn the API.

```sh
npm install @btree/core
```

```tsx
import {nodes, tick} from '@btree/core'

const state = {
  isLoggedIn: false
}

const tree = nodes.root<typeof state>('App behavior', () =>
  nodes.selector([
    nodes.sequence([
      nodes.conditional((state) => state.isLoggedIn)
      nodes.action('Redirect to dashboard', () => {
        navigate('/dashboard')
      }),
    ]),
    nodes.sequence([
      nodes.action('Redirect to login page', () => {
        navigate('/login')
      }),
    ]),
  ])
)

tick(tree, state)
```

## Authors

- Kasper Mikiewicz ([@Idered](https://twitter.com/idered))
