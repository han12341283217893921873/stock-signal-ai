const CACHE_NAME = "stock-signal-ai-v2";
const STATIC_ASSETS = ["/", "/index.html", "/manifest.json"];

// 설치: 정적 자산 사전 캐시
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting(); // 즉시 활성화
});

// 활성화: 이전 버전 캐시 삭제
self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
        )
      )
  );
  self.clients.claim();
});

// fetch: API/WS는 통과, 나머지는 Network-First (캐시 폴백)
self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);

  // API 호출 / WebSocket / 외부 도메인 → 통과
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/trpc/") ||
    request.url.startsWith("ws") ||
    !url.origin.includes(self.location.origin)
  ) {
    return;
  }

  // 네비게이션 요청 (페이지) → Network-First, 실패 시 캐시 폴백
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match("/index.html").then(r => r || fetch(request)))
    );
    return;
  }

  // 정적 자산 → Cache-First
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(res => {
        if (res.ok) {
          caches.open(CACHE_NAME).then(c => c.put(request, res.clone()));
        }
        return res;
      });
    })
  );
});
