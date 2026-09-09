import type { LucideIcon } from "lucide-react";
import { Copy, PenLine, Search, Share2 } from "lucide-react";

/**
 * LP の文言。e2e（tests/e2e/public-pages.spec.ts）が見出しと主 CTA の文字列を
 * そのまま参照しているので、変えるときは spec も一緒に直す。
 *
 * /signin へのリンクは複数あるが、ラベルは全部別にしてある。同じ名前のリンクが
 * 2つ以上あると Playwright の getByRole が strict モードで失敗する。
 */
export const hero = {
  title: "プロンプトを、探さない",
  // 2 行で言い切る。詳しい説明は下のカードに任せる
  leadLines: ["よく使うAIプロンプトを、1か所に。", "貯めて、探して、ワンクリックでコピー。"],
  cardEyebrow: "無料 / Google アカウントだけ",
  cardTitle: "貯めたプロンプトを、いつでも手元に",
  cardBody: "ログインすれば、どの端末からも同じ一覧が開きます。",
  primaryCta: "Googleで始める",
  secondaryCta: "プロンプト一覧へ",
} as const;

export type Feature = {
  title: string;
  body: string;
  icon: LucideIcon;
};

export const features: Feature[] = [
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
  {
    title: "共有する",
    body: "リンクと QR で1件だけ公開。停止すれば元のリンクは開けなくなります。",
    icon: Share2,
  },
];

export const install = {
  title: "ホーム画面に追加",
  body: "PWA 対応。スマホのホーム画面に置けば、アプリのように一覧がすぐ開きます。",
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
  ],
  toast: "コピーしました",
} as const;

export const howTo = {
  title: "使い方は3ステップ",
  cta: "今すぐ始める",
  steps: [
    { title: "Google でログイン", body: "登録フォームはありません。" },
    { title: "プロンプトを貼り付ける", body: "タイトルもタグも省略できます。" },
    { title: "次からはコピーするだけ", body: "検索かタグで開いて、1クリック。" },
  ],
} as const;

export const footer = {
  title: "はじめる準備はできています",
  lines: ["最初の1件を保存すれば、", "次からは探さずに済みます。"],
  cta: "無料で始める",
} as const;
