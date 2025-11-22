import React, { useState } from 'react';
import { Search, Sparkles, ArrowRight, Loader2, Globe } from 'lucide-react';
import { SEARCH_ENGINES } from '../constants';
import { SearchEngine, AIState } from '../types';
import { askGeminiQuickAnswer } from '../services/geminiService';

interface SearchBarProps {
  onSearch?: (query: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = () => {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'web' | 'ai'>('web');
  const [selectedEngine, setSelectedEngine] = useState<SearchEngine>(SEARCH_ENGINES[0]);
  const [aiState, setAiState] = useState<AIState>(AIState.IDLE);
  const [aiResponse, setAiResponse] = useState<string>('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    if (mode === 'web') {
      window.location.href = `${selectedEngine.urlTemplate}${encodeURIComponent(query)}`;
    } else {
      setAiState(AIState.LOADING);
      const answer = await askGeminiQuickAnswer(query);
      setAiResponse(answer);
      setAiState(AIState.SUCCESS);
    }
  };

  const clearAI = () => {
    setAiState(AIState.IDLE);
    setAiResponse('');
    setQuery('');
  };

  return (
    <div className="w-full max-w-3xl mx-auto mb-8 relative z-20">
      {/* Search Input Box */}
      <div className="relative group">
        {/* Glow Effect */}
        <div className={`absolute -inset-0.5 bg-gradient-to-r from-blue-200 to-purple-200 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500 ${mode === 'ai' ? 'from-indigo-300 to-purple-300' : ''}`}></div>
        
        <form onSubmit={handleSearch} className="relative flex items-center bg-white rounded-2xl shadow-xl shadow-slate-200/50 ring-1 ring-slate-100 p-2 transition-all duration-300">
          
          {/* Left: Search Engine Selector (Only in Web Mode) or AI Icon */}
          <div className="flex items-center pl-3 pr-2 border-r border-slate-100 min-w-[110px]">
             {mode === 'web' ? (
                <select 
                  className="bg-transparent text-sm font-semibold text-slate-600 focus:outline-none cursor-pointer py-2 w-full"
                  value={selectedEngine.id}
                  onChange={(e) => setSelectedEngine(SEARCH_ENGINES.find(eng => eng.id === e.target.value) || SEARCH_ENGINES[0])}
                >
                  {SEARCH_ENGINES.map(eng => (
                    <option key={eng.id} value={eng.id}>{eng.name}</option>
                  ))}
                </select>
             ) : (
                <div className="flex items-center gap-2 text-indigo-600 py-2 px-1 w-full">
                    <Sparkles size={16} />
                    <span className="text-sm font-semibold">AI 助手</span>
                </div>
             )}
          </div>

          {/* Center: Input */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={mode === 'web' ? "输入关键词搜索..." : "输入问题，AI 帮你想办法..."}
            className="flex-1 bg-transparent border-none focus:ring-0 text-lg text-slate-800 placeholder-slate-400 px-4 py-3 w-full focus:outline-none"
            autoFocus
          />
          
          {/* Right: Mode Switcher & Action Button */}
          <div className="flex items-center gap-2 pl-2">
            
            {/* Internal Mode Switcher */}
            <div className="bg-slate-100 p-1 rounded-lg flex items-center">
                <button
                    type="button"
                    onClick={() => setMode('web')}
                    className={`p-1.5 rounded-md transition-all ${mode === 'web' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    title="网页搜索"
                >
                    <Globe size={16} />
                </button>
                <button
                    type="button"
                    onClick={() => setMode('ai')}
                    className={`p-1.5 rounded-md transition-all ${mode === 'ai' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    title="AI 问答"
                >
                    <Sparkles size={16} />
                </button>
            </div>

            <button
                type="submit"
                disabled={!query.trim() || aiState === AIState.LOADING}
                className={`p-3 rounded-xl transition-all duration-200 ${
                query.trim() 
                    ? (mode === 'ai' ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700' : 'bg-blue-600 text-white shadow-md hover:bg-blue-700')
                    : 'bg-slate-100 text-slate-300'
                }`}
            >
                {aiState === AIState.LOADING ? <Loader2 size={20} className="animate-spin" /> : <ArrowRight size={20} />}
            </button>
          </div>
        </form>
      </div>

      {/* AI Response Card */}
      {mode === 'ai' && aiState !== AIState.IDLE && (
        <div className="mt-4 bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-indigo-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-start mb-3 border-b border-indigo-50 pb-2">
            <h3 className="text-sm font-semibold text-indigo-600 flex items-center gap-2">
              <Sparkles size={14} />
              Gemini 回答
            </h3>
            <button onClick={clearAI} className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded hover:bg-slate-100 transition">关闭</button>
          </div>
          <div className="prose prose-slate prose-sm max-w-none">
            {aiState === AIState.LOADING ? (
              <div className="flex gap-1 items-center h-6">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
              </div>
            ) : (
              <p className="text-slate-700 leading-relaxed whitespace-pre-line">{aiResponse}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;