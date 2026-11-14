import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/onest'
import './index.css'
import App from './App.jsx'
import { PublicWishlist } from './wishlist/PublicWishlist.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {location.pathname.replace(/\/$/, '') === '/share' ? <PublicWishlist /> : <App />}
  </StrictMode>,
)
