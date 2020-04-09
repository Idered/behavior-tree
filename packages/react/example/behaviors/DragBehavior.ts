import {nodes} from '@btree/core'

type TreeProps = {
  targetEvent?: React.MouseEvent<HTMLDivElement, MouseEvent>
  containerEvent?: MouseEvent
}

type TreeState = {
  isDragging: boolean
  x: number
  y: number
  dx: number
  dy: number
}

const DragBehavior = nodes.root<TreeState, TreeProps>('DragBehavior', () =>
  nodes.selector([
    nodes.sequence([
      nodes.condition('Is dragging', (state, props) => {
        return props.containerEvent?.type === 'mousemove' && state.isDragging
      }),
      nodes.action('Move target', (state, props) => {
        state.x = props.containerEvent?.clientX - state.dx
        state.y = props.containerEvent?.clientY - state.dy
      }),
    ]),
    nodes.sequence([
      nodes.condition(
        'Has clicked on target',
        (state, props) => props.targetEvent
      ),
      nodes.action('Start dragging', (state, props) => {
        const boundingRect = props.targetEvent.currentTarget.getBoundingClientRect()
        state.isDragging = true
        state.x = boundingRect.x
        state.y = boundingRect.y
        state.dx = props.targetEvent.clientX - boundingRect.x
        state.dy = props.targetEvent.clientY - boundingRect.y
      }),
    ]),
    nodes.sequence([
      nodes.condition('Has released drag', (state, props) => {
        return props.containerEvent?.type === 'mouseup' && state.isDragging
      }),
      nodes.action('End dragging', state => {
        state.isDragging = false
      }),
    ]),
  ])
)

export default DragBehavior
