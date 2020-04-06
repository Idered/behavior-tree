import React, {useEffect} from 'react'
import {nodes} from '@btree/core'
import {DevTools, useTree} from '@btree/react'

const initialState = {
  isDragging: false,
  x: 0,
  y: 0,
  dx: 0,
  dy: 0,
}

type TreeState = typeof initialState
type TreeProps = {
  boxEvent?: React.MouseEvent<HTMLDivElement, MouseEvent>
  bodyEvent?: MouseEvent
}

const DragBehavior = nodes.root<TreeState, TreeProps>('Drag behavior', () =>
  nodes.selector([
    nodes.sequence([
      nodes.condition('Is moving', (state, props) => {
        return props.bodyEvent?.type === 'mousemove' && state.isDragging
      }),
      nodes.action('Move box', (state, props) => {
        state.x = props.bodyEvent?.clientX - state.dx
        state.y = props.bodyEvent?.clientY - state.dy
      }),
    ]),
    nodes.sequence([
      nodes.condition('Has clicked on box', (state, props) => props.boxEvent),
      nodes.action('Start dragging', (state, props) => {
        const boundingRect = props.boxEvent.currentTarget.getBoundingClientRect()
        state.isDragging = true
        state.x = boundingRect.x
        state.y = boundingRect.y
        state.dx = props.boxEvent.clientX - boundingRect.x
        state.dy = props.boxEvent.clientY - boundingRect.y
      }),
    ]),
    nodes.sequence([
      nodes.condition('Has released drag', (state, props) => {
        return props.bodyEvent?.type === 'mouseup' && state.isDragging
      }),
      nodes.action('End dragging', (state) => {
        state.isDragging = false
      }),
    ]),
  ])
)

const Box = () => {
  const [state, tick] = useTree(DragBehavior, initialState)

  useEffect(() => {
    const cb = (event: MouseEvent) => tick({bodyEvent: event})
    document.body.addEventListener('mouseup', cb)
    document.body.addEventListener('mousemove', cb)

    return () => {
      document.body.removeEventListener('mouseup', cb)
      document.body.removeEventListener('mousemove', cb)
    }
  }, [])

  return (
    <>
      <div
        className={`box ${state.isDragging ? 'dragging' : ''}`}
        onMouseDown={(event) => tick({boxEvent: event})}
        style={{
          transform: `translate(${state.x}px, ${state.y}px)`,
        }}
      ></div>

      <style jsx>{`
        .box.dragging {
          background: red;
        }

        .box {
          height: 20vmin;
          width: 20vmin;
          background: #99ccff;
          border-radius: 1rem;
        }
      `}</style>
    </>
  )
}

const Home = () => {
  return (
    <div>
      <DevTools>
        <Box />
        <Box />
      </DevTools>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body,
        html {
          margin: 0;
          padding: 0;
          height: 100%;
          width: 100%;
        }
      `}</style>
    </div>
  )
}

export default Home
