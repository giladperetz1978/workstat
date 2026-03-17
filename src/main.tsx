import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(<App />)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((registration) => {
        let hasRefreshed = false

        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (hasRefreshed) return
          hasRefreshed = true
          window.location.reload()
        })

        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: 'SKIP_WAITING' })
            }
          })
        })
      })
      .catch(() => {
        // Keep app functional even if SW registration fails.
      })
  })
}
