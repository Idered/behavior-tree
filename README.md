![](art/banner.png)

## Behavior Tree Toolkit

- [Core](packages/core/README.md) - Framework agnostic behavior trees implementation
- [React](packages/react/README.md) - Hooks and docs how to use BT with React

## Quick start

> Check [Behavior Trees Documentation](packages/core/README.md) to learn the API.

```tsx
import {nodes, tick} from '@behavior-tree/core'

const state = {
  isLoggedIn: false
}

const tree = nodes.root<typeof state>(
  nodes.selector([
    nodes.sequence([
      nodes.conditional(({state}) => state.isLoggedIn)
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

## License

The MIT License.
