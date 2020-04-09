import React from 'react'
import {DevTools} from '@btree/react'
import Box from '../components/Box'

const IndexPage = () => (
  <>
    <DevTools>
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
  </>
)

export default IndexPage
