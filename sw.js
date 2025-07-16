const CACHE_NAME = 'lupa-terra-secure-v2.0.0';
const CACHE_STATIC = 'lupa-terra-static-v2.0.0';
const CACHE_DYNAMIC = 'lupa-terra-dynamic-v2.0.0';

const STATIC_FILES = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './filters.js',
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

const DYNAMIC_CACHE_LIMIT = 50;
const CACHE_TIMEOUT = 8000; // 8 segundos

// Utilitário para validar URLs
function isValidUrl(url) {
    try {
        const parsedUrl = new URL(url);
        return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch (e) {
        return false;
    }
}

// Utilitário para sanitizar cache keys
function sanitizeCacheKey(key) {
    return key.replace(/[^\w\-\.\/]/g, '_');
}

// Limitar tamanho do cache dinâmico
async function limitCacheSize(cacheName, maxSize) {
    try {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        
        if (keys.length > maxSize) {
            const keysToDelete = keys.slice(0, keys.length - maxSize);
            await Promise.all(keysToDelete.map(key => cache.delete(key)));
        }
    } catch (error) {
        console.error('Erro ao limitar cache:', error);
    }
}

// Instalar Service Worker
self.addEventListener('install', event => {
    console.log('[SW] Instalando Service Worker...');
    
    event.waitUntil(
        caches.open(CACHE_STATIC)
            .then(cache => {
                console.log('[SW] Cache estático aberto');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('[SW] Arquivos estáticos em cache');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('[SW] Erro na instalação:', error);
            })
    );
});

// Ativar Service Worker
self.addEventListener('activate', event => {
    console.log('[SW] Ativando Service Worker...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_STATIC && 
                            cacheName !== CACHE_DYNAMIC && 
                            cacheName !== CACHE_NAME) {
                            console.log('[SW] Removendo cache antigo:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[SW] Service Worker ativado');
                return self.clients.claim();
            })
            .catch(error => {
                console.error('[SW] Erro na ativação:', error);
            })
    );
});

// Interceptar requisições
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Ignorar requisições não HTTP/HTTPS
    if (!isValidUrl(request.url)) {
        return;
    }
    
    // Ignorar requisições para chrome-extension, moz-extension, etc.
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return;
    }
    
    // Ignorar requisições para APIs externas específicas
    if (url.hostname !== location.hostname && 
        !url.hostname.includes('fonts.googleapis.com') && 
        !url.hostname.includes('fonts.gstatic.com')) {
        return;
    }
    
    // Estratégia Cache First para arquivos estáticos
    if (STATIC_FILES.some(file => request.url.includes(file))) {
        event.respondWith(cacheFirst(request));
        return;
    }
    
    // Estratégia Network First para outros recursos
    event.respondWith(networkFirst(request));
});

// Estratégia Cache First
async function cacheFirst(request) {
    try {
        const cache = await caches.open(CACHE_STATIC);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetchWithTimeout(request);
        
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('[SW] Erro em Cache First:', error);
        return new Response('Offline', { status: 503 });
    }
}

// Estratégia Network First
async function networkFirst(request) {
    try {
        const networkResponse = await fetchWithTimeout(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_DYNAMIC);
            cache.put(request, networkResponse.clone());
            limitCacheSize(CACHE_DYNAMIC, DYNAMIC_CACHE_LIMIT);
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[SW] Rede falhou, tentando cache...');
        
        try {
            const cache = await caches.open(CACHE_DYNAMIC);
            const cachedResponse = await cache.match(request);
            
            if (cachedResponse) {
                return cachedResponse;
            }
            
            // Fallback para página offline
            if (request.destination === 'document') {
                return caches.match('./index.html');
            }
            
            return new Response('Recurso não disponível offline', { status: 503 });
        } catch (cacheError) {
            console.error('[SW] Erro ao acessar cache:', cacheError);
            return new Response('Erro interno', { status: 500 });
        }
    }
}

// Fetch com timeout
function fetchWithTimeout(request, timeout = CACHE_TIMEOUT) {
    return Promise.race([
        fetch(request),
        new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), timeout);
        })
    ]);
}

// Sincronização em background
self.addEventListener('sync', event => {
    console.log('[SW] Sincronização em background:', event.tag);
    
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    try {
        console.log('[SW] Executando sincronização...');
        // Implementar lógica de sincronização se necessário
    } catch (error) {
        console.error('[SW] Erro na sincronização:', error);
    }
}

// Notificações push
self.addEventListener('push', event => {
    if (!event.data) return;
    
    try {
        const data = event.data.json();
        const options = {
            body: data.body || 'Nova notificação',
            icon: './icon-192x192.png',
            badge: './icon-96x96.png',
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: data.primaryKey || 1
            },
            actions: [
                {
                    action: 'explore',
                    title: 'Abrir App',
                    icon: './icon-96x96.png'
                },
                {
                    action: 'close',
                    title: 'Fechar',
                    icon: './icon-96x96.png'
                }
            ]
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title || 'Lupa Terra', options)
        );
    } catch (error) {
        console.error('[SW] Erro ao processar push:', error);
    }
});

// Clique em notificações
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('./index.html')
        );
    }
});

// Mensagens do cliente
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({
            version: CACHE_NAME
        });
    }
});

// Manipulação de erros
self.addEventListener('error', event => {
    console.error('[SW] Erro no Service Worker:', event.error);
});

self.addEventListener('unhandledrejection', event => {
    console.error('[SW] Promise rejeitada:', event.reason);
});

// Limpeza periódica do cache
setInterval(async () => {
    await limitCacheSize(CACHE_DYNAMIC, DYNAMIC_CACHE_LIMIT);
}, 300000); // 5 minutos

console.log('[SW] Service Worker carregado');
