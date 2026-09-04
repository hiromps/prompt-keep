import type { MetadataRoute } from "next";

/**
 * PWA マニフェスト（/manifest.webmanifest として配信される）。
 *
 * start_url を /prompts にしているのは、ホーム画面から開いたときに
 * LP ではなく一覧をすぐ出すため（未ログインなら /signin へリダイレクトされる）。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "prompt-keep",
    short_name: "prompt-keep",
    description: "よく使うAIプロンプトを貯めて、探して、すぐコピーする",
    lang: "ja",
    start_url: "/prompts",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // ランチャーが好きな形に切り抜く用。中身を内側に寄せた別画像を渡す
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
