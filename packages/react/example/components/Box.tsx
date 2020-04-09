import {useEffect} from 'react'
import DragBehavior from '../behaviors/DragBehavior'
import {useTree} from '@btree/react'

const Box = () => {
  const {tick, state} = useTree({
    tree: DragBehavior,
    initialState: {
      isDragging: false,
      dx: 0,
      dy: 0,
      x: 100,
      y: 100,
    },
  })

  useEffect(() => {
    const cb = (event: MouseEvent) => tick({containerEvent: event})
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
        onMouseDown={event => tick({targetEvent: event})}
        style={{
          transform: `translate(${state.x}px, ${state.y}px)`,
        }}
      />

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

export default Box
