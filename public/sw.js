// prompt-keep の Service Worker。
//
// 目的はホーム画面へのインストールを可能にすることと、オフライン時に
// ブラウザの既定エラー画面ではなく自前の案内を出すこと。
//
// ページや API の応答は原則キャッシュしない。ログイン後の内容を保存すると、
// 別のアカウントや古い状態がそのまま表示されうるため。
//
// 例外は 2 つだけ（docs/decisions/0009-shared-copy-ranking.md）:
//   - /ranking: 公開データ。ネットワーク優先で、失敗したら最後の表示を返す
//   - /_next/static/*: ハッシュ付きの CSS / JS / フォント。ユーザーデータを含まない。
//     これが無いとオフラインの /ranking は CSS も JS も無い素の HTML になる

const SHELL_CACHE = "prompt-keep-shell-v2";
const PAGE_CACHE = "prompt-keep-pages-v1";
const STATIC_CACHE = "prompt-keep-static-v1";
const OFFLINE_URL = "/offline.html";
const CACHED_PAGES = new Set(["/ranking"]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  const keep = new Set([SHELL_CACHE, PAGE_CACHE, STATIC_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // ビルド成果物はキャッシュ優先。URL にハッシュが入るので古い版を返す心配が無い
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // 以降は画面遷移だけを見る。API・認証はブラウザにそのまま任せる
  if (request.mode !== "navigate") return;

  // ランキングだけネットワーク優先 + 失敗時に最後の保存
  if (CACHED_PAGES.has(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(PAGE_CACHE).then((cache) => cache.put(url.pathname, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(url.pathname, { cacheName: PAGE_CACHE });
          if (cached) return cached;
          const offline = await caches.match(OFFLINE_URL);
          return offline ?? Response.error();
        }),
    );
    return;
  }

  event.respondWith(
    fetch(request).catch(async () => {
      const cached = await caches.match(OFFLINE_URL);
      return cached ?? Response.error();
    }),
  );
});
