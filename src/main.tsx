import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import Main from './App.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <h1>Strahlenterapie Interaktion</h1>
    <Main cells={3}/>
  </React.StrictMode>,
)
