
import React, { useState, useMemo } from 'react';
import { KeywordCategory } from '../types';

interface KeywordSelectorProps {
  selectedKeywords: string[];
  onToggleKeyword: (keyword: string) => void;
  categories: KeywordCategory[];
}

const KeywordSelector: React.FC<KeywordSelectorProps> = ({ selectedKeywords, onToggleKeyword, categories }) => {
  const [activeTab, setActiveTab] = useState(categories[0]?.id);
  const [searchTerm, setSearchTerm] = useState('');

  // カテゴリーが切り替わった時にタブをリセット
  useMemo(() => {
    if (categories.length > 0 && !categories.find(c => c.id === activeTab)) {
      setActiveTab(categories[0].id);
    }
  }, [categories]);

  const currentCategory = useMemo(() => 
    categories.find(c => c.id === activeTab), [activeTab, categories]);

  const filteredKeywords = useMemo(() => {
    if (!searchTerm) return currentCategory?.keywords || [];
    const allKeywords = categories.flatMap(c => c.keywords);
    return allKeywords.filter(k => k.includes(searchTerm));
  }, [currentCategory, searchTerm, categories]);

  return (
    <div className="bg-white rounded-[1.5rem] shadow-sm border border-stone-200 overflow-hidden">
      <div className="p-4 border-b border-stone-100 bg-stone-50/50">
        <div className="relative">
          <input
            type="text"
            placeholder="このジャンルの言葉を検索..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-200 text-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="absolute left-4 top-3.5 text-stone-400">🔍</span>
        </div>
      </div>

      {!searchTerm && (
        <div className="flex overflow-x-auto scrollbar-hide bg-stone-50 border-b border-stone-100">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`px-6 py-4 text-sm whitespace-nowrap transition-all border-b-2 font-bold ${
                activeTab === cat.id 
                ? 'text-stone-900 border-stone-900 bg-white' 
                : 'text-stone-400 border-transparent hover:text-stone-600'
              }`}
            >
              <span className="mr-2">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      )}

      <div className="p-6 max-h-[400px] overflow-y-auto">
        <div className="flex flex-wrap gap-2.5">
          {filteredKeywords.map((keyword) => {
            const isSelected = selectedKeywords.includes(keyword);
            return (
              <button
                key={keyword}
                onClick={() => onToggleKeyword(keyword)}
                className={`px-4 py-2 rounded-xl text-sm transition-all duration-200 border font-medium ${
                  isSelected
                    ? 'bg-stone-900 border-stone-900 text-white shadow-lg scale-105'
                    : 'bg-white border-stone-100 text-stone-600 hover:border-stone-300'
                }`}
              >
                {keyword}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default KeywordSelector;
