import type { LucideIcon } from "lucide-react";
import { Copy, PenLine, Search, Share2 } from "lucide-react";

/**
 * LP の文言。e2e（tests/e2e/public-pages.spec.ts）が見出しと主 CTA の文字列を
 * そのまま参照しているので、変えるときは spec も一緒に直す。
 *
 * 訴求は「貯める」より「X でシェアして広がる」に寄せている。
 * 受け取る側がログイン不要でコピーできる（= 広がる理由）を必ず添える。
 *
 * /signin へのリンクは複数あるが、ラベルは全部別にしてある。同じ名前のリンクが
 * 2つ以上あると Playwright の getByRole が strict モードで失敗する。
 */
export const hero = {
  /**
   * 見出しは 2 行で固定し、2 行目の「シェア」だけ色を変える。
   * h1 の中で行を分けるので、e2e は名前の完全一致ではなく level:1 + toContainText で見る。
   */
  titleLines: ["いいプロンプトは、", "シェアで広がる"],
  titleAccent: "シェア",
  eyebrow: "無料 / Google アカウントだけ",
  // 2 行で言い切る。詳しい説明は下のカードに任せる
  leadLines: ["貯めたプロンプトを、ワンタップで X にポスト。", "開いた人は、ログインなしでそのままコピー。"],
  primaryCta: "Googleで始める",
  // 未ログインの人にとっては「一覧」より、いま広がっているものが見えるほうが入口になる
  secondaryCta: "ランキングを見る",
  // ファーストビュー下部の小さな安心材料
  trust: ["ログイン不要で開ける", "QR 付き", "いつでも停止"],
  // ポスター内の X 投稿モック（飾り。span のみ）
  mockPost: {
    name: "あなた",
    handle: "@you",
    text: "いつも使ってるレビュー用プロンプト、置いときます",
    link: "prompt-keep.app/s/…",
    tag: "#promptkeep",
  },
  mockToast: "コピーしました",
  // public/images/hero-share.png（Codex の image_gen で生成した 3D イラスト）
  imageAlt: "プロンプトのカードがスマートフォンのSNSフィードへ飛び出していく3Dイラスト",
} as const;

export type Feature = {
  title: string;
  body: string;
  icon: LucideIcon;
};

export const features: Feature[] = [
  {
    title: "ポストする",
    body: "共有ダイアログの「Xでポスト」で、リンクとハッシュタグ入りの投稿画面へ。",
    icon: Share2,
  },
  {
    title: "貯める",
    body: "タイトルなしでも保存できるクイック入力。タグはあとから付け足せます。",
    icon: PenLine,
  },
  {
    title: "探す",
    body: "タグでの絞り込みと、タイトル・本文・タグを横断する全文検索。",
    icon: Search,
  },
  {
    title: "使う",
    body: "カードのコピーボタンで本文をそのままクリップボードへ。",
    icon: Copy,
  },
];

export const install = {
  title: "ホーム画面に追加",
  body: "PWA 対応。スマホのホーム画面に置けば、思いついた瞬間に貯めて、その場でポストできます。",
  primaryCta: "ログインして追加する",
  disabledCta: "オフライン編集は未対応",
} as const;

export const preview = {
  title: "一覧はこんな見た目",
  caption: "表示例",
  cards: [
    {
      title: "コードレビュー依頼",
      body: "次の差分をレビューして、バグ・可読性・テスト不足の順に指摘してください。",
      tags: ["dev", "review"],
      pinned: true,
    },
    {
      title: "",
      body: "要点を3行で。専門用語は使わず、中学生にも分かる言い方で。",
      tags: ["writing"],
      pinned: false,
    },
    {
      title: "英訳チェック",
      body: "以下の英文を自然な表現に直し、変えた箇所と理由を表にしてください。",
      tags: ["english"],
      pinned: false,
    },
    {
      title: "会議メモの整理",
      body: "この議事録から決定事項・宿題（担当と期限）・未決の論点を分けて箇条書きにしてください。",
      tags: ["work", "meeting"],
      pinned: false,
    },
  ],
  toast: "コピーしました",
} as const;

export const howTo = {
  title: "ポストまで3ステップ",
  cta: "今すぐ始める",
  steps: [
    { title: "Google でログイン", body: "登録フォームはありません。" },
    { title: "プロンプトを貼り付ける", body: "タイトルもタグも省略できます。" },
    { title: "「Xでポスト」を押す", body: "共有リンク付きの投稿画面が開きます。" },
  ],
} as const;

export const footer = {
  title: "最初の1件を、今日ポストしよう",
  lines: ["受け取った人はログイン不要でコピーできる。", "だから、広がる。"],
  cta: "無料で始める",
  rankingLink: "いま広がっているプロンプトを見る",
} as const;
