import { useState, useEffect } from 'react';
import { Search, FileText, BookOpen, Loader2, X, AlertCircle } from 'lucide-react';
import { searchApi, kbApi } from '../services/api';
import type { KnowledgeBase, SearchResult } from '../types';

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = score >= 0.65 ? 'bg-green-400' : score >= 0.40 ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#111122] rounded-full">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="text-xs text-[#64748b] w-8 text-right">{pct}%</span>
    </div>
  );
}

export default function SearchPage() {
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [selectedKbId, setSelectedKbId] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    kbApi.list().then(list => {
      setKbs(list);
      if (list.length > 0) setSelectedKbId(list[0].id);
    });
  }, []);

  const handleSearch = async () => {
    if (!query.trim() || !selectedKbId) return;
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const data = await searchApi.search(selectedKbId, query.trim());
      setResults(data.results);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      <div>
        <h2 className="page-title">Semantic Search</h2>
        <p className="page-subtitle">Search your knowledge base using natural language</p>
      </div>

      {/* Search input */}
      <div className="card">
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-[#94a3b8] mb-1 block font-medium">Knowledge Base</label>
            <select
              id="search-kb-selector"
              className="input"
              value={selectedKbId}
              onChange={e => setSelectedKbId(e.target.value)}
            >
              {kbs.map(kb => <option key={kb.id} value={kb.id}>{kb.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-[#94a3b8] mb-1 block font-medium">Search Query</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
                <input
                  id="search-input"
                  className="input pl-9"
                  placeholder="Search for anything in your documents..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <button
                id="search-submit-btn"
                className="btn-primary"
                onClick={handleSearch}
                disabled={!query.trim() || !selectedKbId || loading}
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                Search
              </button>
            </div>
          </div>
        </div>

        {/* Quick searches */}
        <div className="mt-3 flex flex-wrap gap-2">
          {['attendance requirement', 'examination rules', 'hostel timings', 'library hours', 'placement eligibility'].map(q => (
            <button
              key={q}
              className="text-xs bg-[#111122] border border-[#2a2a4a] hover:border-brand-500/40 rounded-full px-3 py-1 text-[#94a3b8] hover:text-[#e2e8f0] transition-all"
              onClick={() => { setQuery(q); }}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="card border-red-500/20 bg-red-500/5 text-red-400 text-sm p-3 flex items-center justify-between">
          <div className="flex items-center gap-2"><AlertCircle size={14} /> {error}</div>
          <button onClick={() => setError('')}><X size={13} /></button>
        </div>
      )}

      {/* Results */}
      {loading && (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="card h-28 skeleton" />)}
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="card text-center py-12">
          <Search size={32} className="mx-auto mb-3 text-[#2a2a4a]" />
          <p className="text-sm text-[#94a3b8]">No matching passages found</p>
          <p className="text-xs text-[#64748b] mt-1">Try a different query or lower the threshold</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#94a3b8]">
              <span className="font-semibold text-[#e2e8f0]">{results.length}</span> passages found
            </p>
          </div>
          {results.map((r, i) => (
            <div key={r.chunk_id ?? i} className="card-hover" id={`search-result-${i}`}>
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-2">
                  <FileText size={14} className="text-brand-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-[#e2e8f0]">{r.file_name}</p>
                    <p className="text-xs text-[#64748b]">Page {r.page_number}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`badge text-[10px] ${
                    r.similarity_score >= 0.65 ? 'badge-green' :
                    r.similarity_score >= 0.40 ? 'badge-yellow' : 'badge-red'
                  }`}>
                    {r.similarity_score >= 0.65 ? '🟢 High' :
                     r.similarity_score >= 0.40 ? '🟡 Medium' : '🔴 Low'}
                  </span>
                </div>
              </div>

              {/* Score bar */}
              <div className="mb-3">
                <ScoreBar score={r.similarity_score} />
              </div>

              {/* Passage */}
              <div className="bg-[#111122] rounded-lg p-3 border border-[#2a2a4a]">
                <p className="text-sm text-[#94a3b8] leading-relaxed">
                  {r.content.slice(0, 500)}{r.content.length > 500 ? '...' : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
