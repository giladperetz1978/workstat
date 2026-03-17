const APP_CACHE = 'work-pulse-cache-v1'

const getBase = () => {
  const scopeUrl = new URL(self.registration.scope)
  return scopeUrl.pathname.endsWith('/') ? scopeUrl.pathname : `${scopeUrl.pathname}/`
}

const BASE = getBase()
const CORE_ASSETS = [BASE, `${BASE}index.html`, `${BASE}manifest.webmanifest`]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(APP_CACHE).then((cache) => cache.addAll(CORE_ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== APP_CACHE)
          .map((key) => caches.delete(key)),
      ),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached

      return fetch(event.request)
        .then((response) => {
          const copy = response.clone()
          caches.open(APP_CACHE).then((cache) => cache.put(event.request, copy))
          return response
        })
        .catch(() => caches.match(`${BASE}index.html`))
    }),
  )
})
