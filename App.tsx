
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import KeywordSelector from './components/KeywordSelector';
import { generateStory } from './services/geminiService';
import { GENRE_DATA, MANDATORY_FOOTER, TONE_OPTIONS, FIXED_TAGS } from './constants';
import { StoryState, Season, ToneId, Length, Genre } from './types';

const SEASON_OPTIONS: { id: Season; label: string; icon: string }[] = [
  { id: 'spring', label: '春', icon: '🌸' },
  { id: 'summer', label: '夏', icon: '🌻' },
  { id: 'autumn', label: '秋', icon: '🍂' },
  { id: 'winter', label: '冬', icon: '❄️' },
  { id: 'all', label: '通年', icon: '🌈' },
];

const LENGTH_OPTIONS: { id: Length; label: string; desc: string }[] = [
  { id: 'short', label: '短め', desc: '400字' },
  { id: 'standard', label: '標準', desc: '1000字' },
  { id: 'long', label: '長め', desc: '2000字' },
];

const App: React.FC = () => {
  const [selectedGenre, setSelectedGenre] = useState<Genre>('heartwarming');
  const [selectedSeason, setSelectedSeason] = useState<Season>('all');
  const [selectedTone, setSelectedTone] = useState<ToneId>('gentle');
  const [selectedLength, setSelectedLength] = useState<Length>('standard');
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [story, setStory] = useState<StoryState>({
    isGenerating: false,
    content: '',
    error: null,
  });

  useEffect(() => {
    setSelectedKeywords([]);
  }, [selectedGenre]);

  const activeGenreData = useMemo(() => GENRE_DATA[selectedGenre], [selectedGenre]);

  const handleToggleKeyword = useCallback((keyword: string) => {
    setSelectedKeywords(prev => 
      prev.includes(keyword) 
        ? prev.filter(k => k !== keyword) 
        : [...prev, keyword]
    );
  }, []);

  const handleRandomSelect = () => {
    const allKeywords = activeGenreData.categories.flatMap(c => c.keywords);
    const shuffled = [...allKeywords].sort(() => 0.5 - Math.random());
    setSelectedKeywords(shuffled.slice(0, 5));
  };

  const handleGenerate = async () => {
    if (selectedKeywords.length === 0) {
      alert("言葉を1つ以上選んでください。");
      return;
    }

    const toneLabel = TONE_OPTIONS.find(t => t.id === selectedTone)?.label || '自然な';

    setStory({ isGenerating: true, content: '', error: null });
    try {
      const result = await generateStory(
        activeGenreData.label,
        selectedKeywords,
        selectedSeason,
        toneLabel,
        selectedLength
      );
      setStory({ isGenerating: false, content: result, error: null });
      setTimeout(() => {
        document.getElementById('story-result')?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    } catch (err: any) {
      setStory({ isGenerating: false, content: '', error: err.message });
    }
  };

  const parsedContent = useMemo(() => {
    if (!story.content) return { title: '', bodyLines: [], aiTags: [], imagePrompt: '', footerText: '' };
    const lines = story.content.split('\n');
    let currentSection = '';
    let title = '';
    let imagePrompt = '';
    const bodyLines: string[] = [];
    const aiTags: string[] = [];
    let footerText = '';

    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed === '[TITLE]') currentSection = 'title';
      else if (trimmed === '[STORY]') currentSection = 'story';
      else if (trimmed === '[RECOMMENDED_TAGS]') currentSection = 'tags';
      else if (trimmed === '[IMAGE_PROMPT]') currentSection = 'image_prompt';
      else {
        if (currentSection === 'title' && trimmed && !title) title = trimmed.replace(/^#\s*/, '');
        else if (currentSection === 'story') {
           if (trimmed && trimmed !== title) {
             let cleanLine = line;
             selectedKeywords.forEach(k => {
               const regex = new RegExp(`#${k}`, 'g');
               cleanLine = cleanLine.replace(regex, k);
             });

             if (cleanLine.includes("コーヒー代") || cleanLine.includes("Fin.") || cleanLine.includes("ーーーー")) {
               footerText += (footerText ? '\n' : '') + cleanLine;
             } else {
               bodyLines.push(cleanLine);
             }
           }
        }
        else if (currentSection === 'tags') {
          const matches = trimmed.match(/#[^\s#]+/g);
          if (matches) {
            matches.forEach(m => { if (!aiTags.includes(m)) aiTags.push(m); });
          }
        } else if (currentSection === 'image_prompt' && trimmed) {
          imagePrompt += (imagePrompt ? ' ' : '') + trimmed;
        }
      }
    });

    return { 
      title, 
      bodyLines, 
      aiTags, 
      imagePrompt: imagePrompt.trim(), 
      footerText: footerText.trim() || MANDATORY_FOOTER 
    };
  }, [story.content, selectedKeywords]);

  const allTags = useMemo(() => {
    const combined = [...FIXED_TAGS];
    parsedContent.aiTags.forEach(tag => {
      const t = tag.startsWith('#') ? tag : `#${tag}`;
      if (!combined.includes(t)) combined.push(t);
    });
    return combined;
  }, [parsedContent.aiTags]);

  const stats = useMemo(() => {
    const text = parsedContent.bodyLines.join('');
    return {
      count: text.length,
      time: Math.ceil(text.length / 600)
    };
  }, [parsedContent.bodyLines]);

  const copyToClipboard = (text: string, msg: string) => {
    navigator.clipboard.writeText(text);
    alert(msg);
  };

  const copyRichTextToClipboard = async () => {
    const { bodyLines, footerText } = parsedContent;
    
    let htmlContent = '';
    let plainTextContent = '';

    bodyLines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('【') && trimmed.endsWith('】')) {
        const hText = trimmed.replace(/^【\s*/, '').replace(/\s*】$/, '');
        // noteで見出しとして認識される<h2>タグ
        htmlContent += `<h2 style="font-size: 1.5em; font-weight: bold; border-left: 4px solid #333; padding-left: 10px; margin-top: 2em; margin-bottom: 1em;">${hText}</h2>`;
        plainTextContent += `\n${trimmed}\n`;
      } else if (trimmed === "") {
        htmlContent += '<p><br></p>';
        plainTextContent += '\n';
      } else {
        htmlContent += `<p>${line}</p>`;
        plainTextContent += `${line}\n`;
      }
    });

    const footerLines = footerText.split('\n');
    htmlContent += '<p><br></p>';
    footerLines.forEach(fLine => {
      htmlContent += `<p style="text-align: center; color: #78716c;">${fLine}</p>`;
    });

    plainTextContent += `\n${footerText}`;

    try {
      const blobHtml = new Blob([htmlContent], { type: 'text/html' });
      const blobText = new Blob([plainTextContent], { type: 'text/plain' });
      const data = [new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText })];
      
      await navigator.clipboard.write(data);
      alert("本文（見出し・Fin込）をコピーしました！\nnoteに貼り付けてください。");
    } catch (err) {
      copyToClipboard(plainTextContent, "プレーンテキストとしてコピーしました。");
    }
  };

  return (
    <div className="min-h-screen pb-32 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <header className="py-16 text-center space-y-4">
        <div className="inline-block px-4 py-1.5 bg-stone-200 text-stone-600 rounded-full text-[10px] font-bold tracking-widest uppercase mb-4">
          note story generator
        </div>
        <h1 className="text-4xl sm:text-55xl font-extrabold text-stone-800 serif leading-tight">
          物語の<span className="text-orange-600 underline decoration-orange-200 underline-offset-8">種</span>をまく。
        </h1>
        <p className="text-stone-500 max-w-md mx-auto leading-loose text-base font-medium">
          noteでの読みやすさに特化した、<br />美しい余白を持つストーリーを作成します。
        </p>
      </header>

      <main className="space-y-16">
        {/* 1. Genre Selection */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center text-sm font-bold">1</span>
            <h2 className="text-xl font-bold text-stone-800">ジャンルを選ぶ</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
            {(Object.values(GENRE_DATA) as any[]).map((genre) => (
              <button
                key={genre.id}
                onClick={() => setSelectedGenre(genre.id)}
                className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all duration-300 ${
                  selectedGenre === genre.id 
                  ? 'bg-white border-stone-800 shadow-md scale-[1.02]' 
                  : 'bg-stone-50 border-transparent opacity-60 hover:opacity-100 hover:border-stone-200'
                }`}
              >
                <span className="text-2xl mb-1">{genre.icon}</span>
                <span className="text-[10px] font-bold text-stone-800">{genre.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 2. Options */}
        <section className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200 grid grid-cols-1 md:grid-cols-1 gap-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">Season</h3>
              <div className="grid grid-cols-5 gap-1.5">
                {SEASON_OPTIONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSeason(s.id)}
                    className={`p-2.5 rounded-xl border transition-all ${selectedSeason === s.id ? 'bg-stone-800 border-stone-800 text-white' : 'bg-stone-50 border-stone-100 hover:border-stone-200'}`}
                  >
                    <span className="text-lg" title={s.label}>{s.icon}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">Length</h3>
              <div className="grid grid-cols-3 gap-1.5">
                {LENGTH_OPTIONS.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setSelectedLength(l.id)}
                    className={`py-2 rounded-xl border text-[10px] font-bold transition-all ${selectedLength === l.id ? 'bg-stone-800 border-stone-800 text-white' : 'bg-stone-50 border-stone-100 hover:border-stone-200'}`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-stone-100">
            <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">Atmosphere</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {TONE_OPTIONS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTone(t.id)}
                  className={`py-3 px-2 rounded-xl border text-[10px] font-bold transition-all flex flex-col items-center gap-1 ${
                    selectedTone === t.id 
                    ? 'bg-stone-800 border-stone-800 text-white shadow-md scale-[1.05]' 
                    : 'bg-stone-50 border-stone-100 hover:border-stone-200 text-stone-600'
                  }`}
                >
                  <span className="text-base">{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 3. Keywords */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center text-sm font-bold">2</span>
              <h2 className="text-xl font-bold text-stone-800">言葉を紡ぐ</h2>
            </div>
            <button onClick={handleRandomSelect} className="text-xs font-bold text-stone-500 hover:text-stone-900 flex items-center gap-2 px-4 py-2 rounded-full border border-stone-200 transition-all bg-white">
              🎲 おまかせ
            </button>
          </div>
          
          <div className={`transition-all duration-500 overflow-hidden ${selectedKeywords.length > 0 ? 'max-h-[300px] mb-6' : 'max-h-0'}`}>
            <div className="bg-stone-100 rounded-2xl p-5 border border-stone-200 shadow-inner flex flex-wrap gap-2">
              {selectedKeywords.map((k) => (
                <button key={k} onClick={() => handleToggleKeyword(k)} className="px-3 py-1.5 bg-stone-800 text-white rounded-full text-[11px] font-bold flex items-center gap-2">
                  {k} <span className="opacity-50">×</span>
                </button>
              ))}
            </div>
          </div>

          <KeywordSelector 
            selectedKeywords={selectedKeywords} 
            onToggleKeyword={handleToggleKeyword}
            categories={activeGenreData.categories}
          />
        </section>

        {/* 4. Action */}
        <section className="flex flex-col items-center py-4">
          <button
            onClick={handleGenerate}
            disabled={story.isGenerating || selectedKeywords.length === 0}
            className={`w-full max-w-sm py-6 rounded-full font-extrabold text-xl transition-all shadow-xl ${
              story.isGenerating || selectedKeywords.length === 0 
              ? 'bg-stone-200 text-stone-400' 
              : 'bg-stone-900 text-white hover:scale-[1.03] active:scale-95'
            }`}
          >
            {story.isGenerating ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                物語を創造しています...
              </span>
            ) : "物語を創造する ✨"}
          </button>
        </section>

        {/* 5. Result */}
        {story.content && (
          <section id="story-result" className="space-y-12 animate-in fade-in slide-in-from-bottom-10 duration-700 pb-20">
            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-stone-100 overflow-hidden">
              <div className={`h-2 bg-gradient-to-r from-stone-400 to-stone-600`}></div>
              
              <div className="p-8 sm:p-16 space-y-12">
                <div className="flex justify-center gap-6 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] border-b border-stone-50 pb-6">
                  <span>Characters: {stats.count}</span>
                  <span>Est. Reading: {stats.time} min</span>
                </div>

                <div className="text-center space-y-2">
                  <h5 className="text-[9px] font-bold text-stone-300 uppercase tracking-widest">Title</h5>
                  <p className="text-3xl sm:text-4xl font-bold text-stone-900 serif leading-tight">{parsedContent.title}</p>
                </div>
                
                <div className="max-w-2xl mx-auto">
                  <article className="serif text-[17px] sm:text-[19px] leading-[2.2] text-stone-800 whitespace-pre-wrap">
                    {parsedContent.bodyLines.map((line, i) => {
                      const trimmed = line.trim();
                      if (trimmed.startsWith('【') && trimmed.endsWith('】')) {
                        return (
                          <h2 key={i} className="text-xl sm:text-2xl font-bold mt-16 mb-8 text-stone-900 border-l-4 border-stone-800 pl-5 bg-stone-50/50 py-2 rounded-r-xl">
                            {trimmed.replace(/^【\s*/, '').replace(/\s*】$/, '')}
                          </h2>
                        );
                      }
                      if (trimmed === "") return <div key={i} className="h-8"></div>;
                      return <p key={i} className="mb-8">{line}</p>;
                    })}
                  </article>

                  <div className="mt-20 pt-10 border-t border-stone-100 flex flex-col items-center">
                    <div className="text-center p-10 bg-stone-50/50 rounded-3xl border border-stone-200/40 w-full">
                      <p className="text-stone-500 text-sm italic leading-loose whitespace-pre-wrap font-medium text-center">
                        {parsedContent.footerText}
                      </p>
                    </div>
                  </div>
                </div>

                {parsedContent.imagePrompt && (
                  <div className="max-w-2xl mx-auto p-8 bg-amber-50/40 rounded-3xl border border-amber-100/50 space-y-4">
                    <div className="flex items-center gap-2 text-amber-600">
                      <span className="text-lg">🎨</span>
                      <h5 className="text-[10px] font-bold uppercase tracking-widest">Image AI Prompt</h5>
                    </div>
                    <p className="text-sm italic font-mono text-stone-600 leading-relaxed bg-white/60 p-5 rounded-2xl border border-white">
                      {parsedContent.imagePrompt}
                    </p>
                    <p className="text-[9px] text-amber-400 text-center font-bold">
                      ※この英文を画像生成AIに入力して、noteのヘッダーを作成しましょう。
                    </p>
                  </div>
                )}

                <div className="max-w-2xl mx-auto space-y-4 pt-8">
                  <h5 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest text-center">推奨ハッシュタグ</h5>
                  <div className="flex flex-wrap justify-center gap-2">
                    {allTags.map((tag, i) => {
                      const isAiTag = !FIXED_TAGS.includes(tag);
                      return (
                        <span key={i} className={`px-3 py-1 rounded-full text-[10px] font-bold ${isAiTag ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-stone-800 text-white'}`}>
                          {tag}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full max-w-md mx-auto space-y-4 mt-8">
              <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-stone-100 space-y-3">
                <button 
                  onClick={() => copyToClipboard(parsedContent.imagePrompt, "画像プロンプトをコピーしました")} 
                  className="w-full py-4 rounded-2xl font-bold bg-amber-500 text-white shadow-lg hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm"
                >
                  🎨 プロンプトコピー
                </button>
                
                <button 
                  onClick={() => copyToClipboard(parsedContent.title, "タイトルをコピーしました")} 
                  className="w-full py-4 rounded-2xl font-bold bg-stone-100 text-stone-700 border border-stone-200 hover:bg-stone-200 transition-all shadow-sm flex items-center justify-center gap-2 text-sm"
                >
                  📄 タイトルコピー
                </button>
                
                <button 
                  onClick={copyRichTextToClipboard} 
                  className="w-full py-5 rounded-2xl font-bold bg-stone-900 text-white shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-0.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">✒️</span>
                    <span>本文コピー (見出し・Fin込)</span>
                  </div>
                  <span className="text-[9px] opacity-70 font-medium">スマホで見やすい小見出しもコピーされます</span>
                </button>
                
                <button 
                  onClick={() => copyToClipboard(allTags.join(' '), "全てのハッシュタグをコピーしました")} 
                  className="w-full py-4 rounded-2xl font-bold bg-stone-100 text-stone-700 border border-stone-200 hover:bg-stone-200 transition-all shadow-sm flex items-center justify-center gap-2 text-sm"
                >
                  🏷️ 全てのタグをコピー
                </button>

                <a 
                  href="https://note.com/posts/new" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-full py-4 rounded-2xl font-bold bg-[#24b438] text-white shadow-lg hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm"
                >
                  🚀 noteを開く
                </a>
              </div>
              <p className="text-center text-[10px] text-stone-400 serif px-4">
                「本文コピー」は書式付きです。noteの投稿画面にそのまま貼り付けてください。
              </p>
            </div>
          </section>
        )}
      </main>

      <footer className="mt-20 py-16 text-center text-stone-400 text-[10px] serif border-t border-stone-100">
        &copy; 2026 Note Story Generator • 優しさは、言葉の余白に宿る。byNoiseCamera
      </footer>
    </div>
  );
};

export default App;
