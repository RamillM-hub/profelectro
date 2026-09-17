/**
 * ПрофЭлектро — Заказ-наряд — service worker.
 *
 * Стратегия: network-first для страницы приложения.
 * Это принципиально: при cache-first пользователь может месяцами видеть старую
 * версию index.html после обновления на GitHub Pages — именно так возникает
 * "белый экран" и несоответствие кода тому, что залито в репозиторий.
 *
 * ВАЖНО: при каждом обновлении приложения меняйте CACHE_VERSION.
 * Это автоматически удалит все старые кэши при активации.
 */
const CACHE_VERSION = "pe-zakaz-naryad-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // POST-запросы в Google Apps Script никогда не кэшируем и не перехватываем
  if (req.method !== "GET") return;

  // Запросы к чужим origin (Apps Script) отдаём напрямую
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      const fresh = await fetch(req);
      const cache = await caches.open(CACHE_VERSION);
      cache.put(req, fresh.clone());
      return fresh;
    } catch (e) {
      const cached = await caches.match(req);
      if (cached) return cached;
      if (req.mode === "navigate") {
        const fallback = await caches.match("./index.html");
        if (fallback) return fallback;
      }
      throw e;
    }
  })());
});
