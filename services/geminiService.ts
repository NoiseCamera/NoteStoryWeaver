
import { GoogleGenAI } from "@google/genai";
import { MANDATORY_FOOTER } from "../constants";

export const generateStory = async (
  genre: string,
  keywords: string[], 
  season: string, 
  tone: string, 
  length: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const seasonText = season === 'all' ? '特定の季節に縛られない、いつかの風景' : `${season}の特有の空気感や匂い`;
  
  const lengthMap: Record<string, string> = {
    short: '400文字程度。一瞬のきらめきを切り取ったショートストーリー',
    standard: '1000文字程度。起承転結があり、深く心に染み入る物語',
    long: '2000文字程度。登場人物の背景や風景を緻密に描いた重厚な作品'
  };

  const prompt = `
あなたは、noteで圧倒的な支持を得ている、優しくて叙情的な物語を紡ぐストーリーテラーです。
「〜です。〜ます。」は一切使わず、「〜だ。〜だった。〜だろう。」といった常体（だ・である調）を使い、エッセイや短編小説のような美しい文体で綴ってください。

【スマホ・note閲覧の最適化ルール】
1. **1段落は2行以内**: スマホの狭い画面で「文章の壁」を作らないため、1つの段落は最大でも2行までにしてください。
2. **改行の徹底**: 意味の区切り、または1〜2文ごとに必ず「空行」を1行（\n\n）入れてください。
3. **小見出しの挿入**: 物語の展開（起・承・転・結）に合わせて、必ず「【 見出しタイトル 】」という形式で小見出しを3〜4箇所挿入してください。

【禁止事項：重要】
1. **キーワードの強調禁止**: 指定されたキーワード（${keywords.join('、')}）を使う際、**絶対に「#」を付けたり、「*」などの記号で強調したりしないでください。** 文章の中に自然な日本語として溶け込ませてください（小見出しの【】は例外とします）。
2. **箇条書き禁止**: 物語の途中で箇条書き（・や1.など）を使わないでください。

【設定】
・ジャンル：${genre}
・季節感：${seasonText}
・全体の雰囲気：${tone}
・長さの目安：${lengthMap[length] || lengthMap.standard}

【出力フォーマット】
[TITLE]
（タイトル）

[STORY]
（物語。場面の切り替わりには必ず 【 見出し 】 を入れること。キーワードに#は付けない。スマホ向けに頻繁に空行を入れる）

（物語の最後に、以下のメッセージを必ず含めてください）
${MANDATORY_FOOTER}

[IMAGE_PROMPT]
（画像生成用英語プロンプト。冒頭に "A soft pastel illustration of..." を付与）

[RECOMMENDED_TAGS]
（物語に合うハッシュタグを5つ程度。例：#猫 #不思議な話）
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: "あなたは物語で人の心を癒やす作家です。スマホでの読みやすさを最優先し、場面展開には必ず【】の見出しを使い、文章内での記号強調は一切行わないでください。",
        temperature: 0.8,
        topP: 0.9,
      }
    });

    return response.text || "物語を紡ぐことができませんでした。";
  } catch (error) {
    console.error("Story generation error:", error);
    throw new Error("AIとの接続に失敗しました。");
  }
};
