const CACHE_NAME = 'camera-app-v16_debug'; // 버전을 올려 이전 캐시 갱신 유도
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './icon.png'
];

// 서비스 워커 설치 및 캐싱
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// 활성화 및 이전 캐시 제거
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('이전 캐시 삭제:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 네트워크 우선(Network-First) 전략 적용: 온라인일 때는 항상 최신 파일 로드, 오프라인일 때만 캐시 사용
self.addEventListener('fetch', (e) => {
    // 내부 페이지 요청에 대해서만 네트워크 우선 적용
    e.respondWith(
        fetch(e.request)
            .then((response) => {
                // 네트워크 요청 성공 시 캐시 갱신
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(e.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // 오프라인이거나 네트워크 오류 시 캐시에서 반환 (쿼리 파라미터 무시하고 검색)
                return caches.match(e.request, { ignoreSearch: true });
            })
    );
});
