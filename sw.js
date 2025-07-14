const CACHE_NAME = 'lupa-terra-v1.0.1';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './filters.js',
  './shader.frag',
  './manifest.json',
  './icon-72x72.png',
  './icon-96x96.png',
  './icon-128x128.png',
  './icon-144x144.png',
  './icon-152x152.png',
  './icon-192x192.png',
  './icon-384x384.png',
  './icon-512x512.png',
  './logo.jpg'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cache aberto');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Todos os arquivos em cache');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Erro ao adicionar arquivos ao cache:', error);
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker: Ativando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Ativado');
      return self.clients.claim();
    })
  );
});

// Interceptação de requisições - Estratégia Network First para recursos dinâmicos
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Não interceptar requisições para getUserMedia ou WebRTC
  if (event.request.url.includes('getUserMedia') || 
      event.request.url.includes('webrtc') ||
      event.request.url.includes('mediastream')) {
    return;
  }
  
  // Para recursos estáticos, usar cache first
  if (event.request.destination === 'image' || 
      event.request.destination === 'style' || 
      event.request.destination === 'script' ||
      event.request.destination === 'manifest') {
    
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          return response || fetch(event.request).then(fetchResponse => {
            const responseClone = fetchResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
            return fetchResponse;
          });
        })
        .catch(() => {
          // Fallback para recursos essenciais
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        })
    );
  } else {
    // Para outros recursos, usar network first
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  }
});
