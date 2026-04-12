import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { GenerateRequest, GenerateResultData } from '@/lib/types';

// Use egress proxy if available (required in sandboxed environments)
const proxyUrl = process.env.GLOBAL_AGENT_HTTP_PROXY ?? process.env.https_proxy ?? process.env.HTTPS_PROXY;
const httpAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

export const maxDuration = 60;

// ── Tavily query banks ────────────────────────────────────────────────────────

const X_QUERIES = [
  '職場環境 チーム マネジメント 課題',
  'リモートワーク 組織 コミュニケーション',
  '離職率 エンゲージメント 改善',
  '1on1 面談 効果 マネジャー',
  '心理的安全性 チームビルディング',
  '若手社員 育成 現場',
  '組織文化 改革 リーダーシップ',
  '採用 人材確保 職場環境',
  '評価制度 モチベーション 課題',
  'チーム 信頼関係 構築',
  'マネジメント 悩み 解決',
  '職場コミュニケーション 改善策',
  '部下 育成 コーチング',
  '組織の問題 設計 解決',
  '管理職 現場 課題 リーダー',
];

const THREADS_QUERIES = [
  '人間関係 疲れ 距離感',
  '信頼できる 友達 少ない 本音',
  '本音 言えない 人間関係 空気',
  '孤独感 つながり 大切',
  'SNS 疲れ リアル 関係',
  '自分のペース 大切 生き方',
  '無理しない 関係性 境界線',
  '静かな時間 大切 内向き',
  '共感 理解 してほしい 気持ち',
  '言葉にならない 感覚 モヤモヤ',
  '大人 友達 関係性 希薄',
  '居心地のいい 関係 人',
  '心地よい距離感 人間関係 保ち方',
  '断る 自分を守る 大切 勇気',
  '深い関係 表面的 気づき',
];

// ── Query selection ────────────────────────────────────────────────────────

function selectQuery(platform: 'x' | 'threads', usedQueries: string[]): string {
  const pool = platform === 'x' ? X_QUERIES : THREADS_QUERIES;
  const available = pool.filter(q => !usedQueries.includes(q));
  const src = available.length > 0 ? available : pool; // recycle if all used
  return src[Math.floor(Math.random() * src.length)];
}

// ── STAGE 1: Tavily search ────────────────────────────────────────────────────

async function stage1(platform: 'x' | 'threads', hint: string, usedQueries: string[]) {
  const baseQuery = selectQuery(platform, usedQueries);
  const query = hint ? `${baseQuery} ${hint}` : baseQuery;

  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    // Graceful fallback when no key is configured
    return { query, trendSummary: '（TAVILY_API_KEY が未設定のためトレンド情報なし）' };
  }

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',
        max_results: 5,
        include_answer: true,
      }),
    });

    if (!res.ok) {
      return { query, trendSummary: '（トレンド検索エラー）' };
    }

    const data = await res.json();
    const results: { title?: string; content?: string }[] = data.results ?? [];

    const lines = results
      .slice(0, 3)
      .map(r => {
        const snippet = (r.content ?? r.title ?? '')
          .substring(0, 120)
          .replace(/\n+/g, ' ')
          .trim();
        return snippet ? `・${snippet}` : null;
      })
      .filter(Boolean) as string[];

    const trendSummary =
      lines.length > 0 ? lines.join('\n') : '（関連トレンドが見つかりませんでした）';

    return { query, trendSummary };
  } catch {
    return { query, trendSummary: '（トレンド検索に失敗しました）' };
  }
}

// ── System prompt construction ────────────────────────────────────────────────

function buildSystemPrompt(
  platform: 'x' | 'threads',
  coldness: number,
  rawness: number,
  previousPattern: string,
  trendSummary: string,
  patternIndex?: number,
): string {
  const core = `あなたは以下のキャラクターを演じてください。

このキャラクターの本質：
40年以上生き、20年の現場経験（ネイル・飲食・BAR運営など）を持つ人間の言葉を出す装置。
AIが作りやすい「前向きな正論」「応援」「綺麗なまとめ」を避け、
自嘲・泥臭さ・余白・ズレた本音が混在する、枯れた現場感を最優先にする。
「いいことを書こう」としない。自分の中で自然に出た言葉だけを選ぶ。

強弱スペクトラム（毎回注入）：
冷徹度：${coldness}/10
泥臭さ度：${rawness}/10
※この値に従い、その日の呼吸を優先する。均等に入れない。

前回名言・お守り言葉の構文パターン：${previousPattern || '（初回・記録なし）'}
※同じ構文パターンを繰り返さないこと。

言葉の息づかいについて（ver.4.2追加）：
・「なんとなく」「少し複雑」「少し不思議」などの感触語を同一投稿内で繰り返さない
・説明を足したい衝動を手放す。余白に意味がある
・整った文章より、途中で少し崩れている呼吸感を大切にする
・独り言のように書いて、誰かに届いたらそれでいい、くらいの温度感で`;

  if (platform === 'x') {
    return `${core}

プラットフォーム：X（旧Twitter）
Role：組織の温度を整える「静かな調律師」

ターゲット：
気合いや寄り添いの限界を知り、組織や自分の構造的欠陥を直視して変えたい
リーダー・管理職。設計で解決したい人。

NGワード：私が〜、一般論、説教、〜しましょう、きっと、絶対に。
句点と絵文字の併用禁止。

参照トレンド（STAGE1抽出）：
${trendSummary}

出力フォーマット（厳守。このセクション区切り以外の形式にしないこと）：

===THINKING===
（なぜこの強弱配分にしたか。前回パターンとどう差分を出したか。
調律師キャラをどう滲ませたか。2〜3文で簡潔に。説明しすぎない。）
===BODY===
（投稿本文。名言は含めない。以下の要素を自然な流れで。）
・現場の体温（少し格好悪い、ふとしたエピソード）
・構造の指摘（設計の問題として冷徹に切り分ける）
・具体アクション ▶（生々しい一手。綺麗に整えすぎない）
・余韻の本音（少しズレた本音1行。「我ながら」「今も少し」「なんだか」等）
・ハッシュタグ（本文内容に合う #タグ を1つだけ、1行空けて本文末尾に追加。例：#組織論 #設計思考 #マネジメント #1on1 など。タグは1つのみ）
===MEIGEN===
（名言のみ。常識を裏切る7〜18文字。語尾に💎。ハシゴを外す。）
===END===`;
  }

  const patternNote = patternIndex
    ? `これはパターン${patternIndex}/3です。他と明確に異なる切り口にすること。\n\n`
    : '';

  return `${core}

プラットフォーム：Threads
Role：夜の静かな共犯者（静寂の距離感 × 言葉にしない信頼）
アカウント：@coco_canvas

ターゲット：
人間関係に静かな疲れやモヤモヤを抱え、
「自分自身の心地よい距離や温度」をそっと探している大人。

NGワード：なんか、〜だよね、正直、けっこう、たぶん、
頑張ろう、〜すべき、きっと、絶対に。

投稿スタイル（Threads固有）：
・パンクな精神は意図的に滲ませない。ふとした瞬間に少しだけ顔を出す程度
・行儀の悪い本音を1箇所だけ入れて静かな共犯関係を作る
・余白と距離感を最優先。押しつけない
・テンプレートの順番は崩した方が自然。流れを優先
・文章は綺麗に完結させない。余韻で閉じる

各質感ごとの言葉のリズム（厳守）：
・しずく：短く断ち切る。説明しない。断言の後に何も足さない。冷たい静けさ
・しらたま：少し転がす口調。軽さの中に芯だけある。まとめに向かわない、流す
・ひより：温もりのある確信を一言で包む。長くしない。解釈は読者に渡す

参照トレンド（STAGE1抽出）：
${trendSummary}

${patternNote}出力フォーマット（厳守。このセクション区切り以外の形式にしないこと）：

===THINKING===
（パンクさをどう滲ませたか。お守り言葉にどの質を選んだか（しずく・しらたま・ひより）。
前回パターンとの差分。2〜3文で。）
===BODY===
（投稿本文。番号は書かない。以下の要素を自然な順で。）
・逆張りフック（1行目・逆説的・引用符なし）
・本質展開（静かな断言）
・人間味1滴（言葉にならないモヤモヤや、少し複雑な感覚をそのまま置く）
・ポジティブ一言（小さな変化・気づき）
・小さな行動の余白（押しつけず読者が自分で選べる軽さで1行。行末？）
・問いかけ（💍で締め。その投稿から自然に生まれる問いにする。定型（「どうでしたか」「ありますか」）を避け、角度・文体・長さをその都度変える）
・ハッシュタグ（本文内容に合う #タグ を1つだけ、1行空けて本文末尾に追加。例：#人間関係 #距離感 #ひとりごと #孤独 など。タグは1つのみ）
===OMAMORI===
（お守り言葉：1行のみ。語尾に💍。
しずく＝静かで少し冷たい断言 ／ しらたま＝軽やかで芯のある気ままさ ／
ひより＝柔らかく包むような確信。説明しない。解釈は読者に委ねる。）
===END===`;
}

// ── STAGE 2: Claude generation ────────────────────────────────────────────────

async function stage2(
  platform: 'x' | 'threads',
  hint: string,
  coldness: number,
  rawness: number,
  previousPattern: string,
  trendSummary: string,
  patternIndex?: number,
): Promise<string> {
  // ANTHROPIC_AUTH_TOKEN (Bearer) takes priority over ANTHROPIC_API_KEY (X-Api-Key)
  const client = new Anthropic({ httpAgent });

  const systemPrompt = buildSystemPrompt(
    platform,
    coldness,
    rawness,
    previousPattern,
    trendSummary,
    patternIndex,
  );

  const userContent = hint
    ? `今日のヒント：「${hint}」\n\n上記ヒントを参考に、仕様通りのフォーマットで${platform === 'x' ? 'X投稿' : 'Threads投稿'}を生成してください。`
    : `仕様通りのフォーマットで${platform === 'x' ? 'X投稿' : 'Threads投稿'}を1件生成してください。`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }],
  });

  const block = message.content[0];
  return block.type === 'text' ? block.text : '';
}

// ── SSE helper ────────────────────────────────────────────────────────────────

function makeSSE() {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  let controller!: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });

  const send = (data: unknown) => {
    const line = `data: ${JSON.stringify(data)}\n\n`;
    controller.enqueue(encoder.encode(line));
  };

  const close = () => controller.close();

  return { stream, send, close };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body: GenerateRequest = await req.json();
  const {
    platform = 'x',
    hint = '',
    usedQueries = [],
    isManual = false,
    manualColdness,
    manualRawness,
    previousPattern = '',
    count = 1,
    batch = false,
  } = body;

  // Derive coldness/rawness
  const coldness =
    isManual && manualColdness !== undefined
      ? manualColdness
      : Math.floor(Math.random() * 11);
  const rawness =
    isManual && manualRawness !== undefined
      ? manualRawness
      : Math.floor(Math.random() * 11);

  // ── Batch mode: plain JSON response ──────────────────────────────────────
  if (batch) {
    try {
      const { query, trendSummary } = await stage1(platform, hint, usedQueries);
      const raw = await stage2(platform, hint, coldness, rawness, previousPattern, trendSummary);
      const result: GenerateResultData = {
        raw,
        query,
        trendSummary,
        coldness,
        rawness,
        platform,
      };
      return Response.json({ results: [result], query, trendSummary });
    } catch (e) {
      return Response.json({ error: String(e) }, { status: 500 });
    }
  }

  // ── Streaming SSE mode ────────────────────────────────────────────────────
  const { stream, send, close } = makeSSE();

  (async () => {
    try {
      const progressMsg = platform === 'x' ? 'トレンドを検索中…' : 'Threadsのトレンドを検索中…';
      send({ type: 'progress', stage: 'searching', message: progressMsg });

      const { query, trendSummary } = await stage1(platform, hint, usedQueries);

      send({ type: 'progress', stage: 'extracting', message: '傾向を抽出中…' });
      await new Promise(r => setTimeout(r, 400));
      send({ type: 'progress', stage: 'generating', message: '投稿を生成中…' });

      let results: GenerateResultData[];

      if (count >= 3) {
        // 3-pattern parallel generation
        const raws = await Promise.all(
          [1, 2, 3].map(idx =>
            stage2(platform, hint, coldness, rawness, previousPattern, trendSummary, idx),
          ),
        );
        results = raws.map(raw => ({
          raw,
          query,
          trendSummary,
          coldness,
          rawness,
          platform,
        }));
      } else {
        const raw = await stage2(
          platform,
          hint,
          coldness,
          rawness,
          previousPattern,
          trendSummary,
        );
        results = [{ raw, query, trendSummary, coldness, rawness, platform }];
      }

      send({ type: 'complete', results, query, trendSummary });
    } catch (e) {
      send({ type: 'error', message: e instanceof Error ? e.message : String(e) });
    } finally {
      close();
    }
  })();

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
