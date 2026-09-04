// prompt-keep の Service Worker。
//
// 目的はホーム画面へのインストールを可能にすることと、オフライン時に
// ブラウザの既定エラー画面ではなく自前の案内を出すこと。
//
// ページやAPIの応答は一切キャッシュしない。ログイン後の内容を保存すると、
// 別のアカウントや古い状態がそのまま表示されうるため。
// 保持するのはオフライン用の静的ページ1枚だけ。

const CACHE = "prompt-keep-shell-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // 画面遷移だけを見る。API・認証・静的ファイルはブラウザにそのまま任せる
  if (request.method !== "GET" || request.mode !== "navigate") return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request).catch(async () => {
      const cached = await caches.match(OFFLINE_URL);
      return cached ?? Response.error();
    }),
  );
});
