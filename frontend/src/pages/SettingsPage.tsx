import { useState, useEffect } from 'react';
import { Settings, Key, Sliders, CheckCircle, XCircle, Loader2, Save, ExternalLink } from 'lucide-react';
import { healthApi } from '../services/api';

interface SettingField {
  key: string; label: string; desc: string; type: string;
  placeholder?: string; envVar: string;
}

const RAG_SETTINGS: SettingField[] = [
  { key: 'topK',      label: 'Top-K Retrieval',        type: 'number', desc: 'Number of document chunks retrieved per query (1–20)', placeholder: '5', envVar: 'RAG_TOP_K' },
  { key: 'threshold', label: 'Similarity Threshold',   type: 'number', desc: 'Minimum similarity score to include a chunk (0.0–1.0)', placeholder: '0.25', envVar: 'RAG_SIMILARITY_THRESHOLD' },
  { key: 'chunkSize', label: 'Chunk Size (tokens)',     type: 'number', desc: 'Approximate token count per chunk (500–2000)', placeholder: '1000', envVar: 'CHUNK_SIZE' },
  { key: 'chunkOverlap', label: 'Chunk Overlap (tokens)', type: 'number', desc: 'Overlap between consecutive chunks (50–300)', placeholder: '150', envVar: 'CHUNK_OVERLAP' },
];

export default function SettingsPage() {
  const [openai, setOpenai] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    healthApi.check()
      .then(data => setOpenai(data.openai))
      .catch(() => setOpenai(false))
      .finally(() => setChecking(false));
  }, []);

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <div>
        <h2 className="page-title">Settings</h2>
        <p className="page-subtitle">Configure KnowBase AI for your environment</p>
      </div>

      {/* AI Status */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-brand-500/10 rounded-lg flex items-center justify-center border border-brand-500/20">
            <Key size={15} className="text-brand-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#e2e8f0]">OpenAI API Status</h3>
            <p className="text-xs text-[#64748b]">Required for full AI capabilities</p>
          </div>
        </div>

        <div className={`rounded-xl p-4 border ${openai ? 'bg-green-500/5 border-green-500/20' : 'bg-yellow-500/5 border-yellow-500/20'}`}>
          <div className="flex items-center gap-2 mb-2">
            {checking ? (
              <Loader2 size={16} className="animate-spin text-[#64748b]" />
            ) : openai ? (
              <CheckCircle size={16} className="text-green-400" />
            ) : (
              <XCircle size={16} className="text-yellow-400" />
            )}
            <span className={`text-sm font-medium ${openai ? 'text-green-400' : 'text-yellow-400'}`}>
              {checking ? 'Checking...' : openai ? 'OpenAI API Key Configured' : 'OpenAI API Key Not Configured'}
            </span>
          </div>
          {!checking && !openai && (
            <div className="text-xs text-[#94a3b8] space-y-2">
              <p>The app is running in <strong className="text-yellow-400">Fallback Mode</strong>:</p>
              <ul className="list-disc list-inside space-y-1 text-[#64748b]">
                <li>Document upload, chunking, and indexing: ✅ Works</li>
                <li>Semantic search (keyword-based): ✅ Works</li>
                <li>AI summarization: ❌ Not available</li>
                <li>Raw passage retrieval displayed instead of AI answer</li>
              </ul>
              <p className="mt-2">To enable full AI:</p>
              <ol className="list-decimal list-inside space-y-1 text-[#64748b]">
                <li>Copy <code className="bg-[#111122] px-1 rounded">.env.example</code> to <code className="bg-[#111122] px-1 rounded">backend/.env</code></li>
                <li>Add your OpenAI API key</li>
                <li>Restart the backend server</li>
              </ol>
            </div>
          )}
          {!checking && openai && (
            <p className="text-xs text-[#94a3b8]">Full AI-powered RAG is active. GPT-4o-mini for chat, text-embedding-3-small for embeddings.</p>
          )}
        </div>

        <a
          href="https://platform.openai.com/api-keys"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary mt-3 text-xs inline-flex"
        >
          <ExternalLink size={12} /> Get OpenAI API Key
        </a>
      </div>

      {/* RAG Configuration */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center border border-purple-500/20">
            <Sliders size={15} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#e2e8f0]">RAG Configuration</h3>
            <p className="text-xs text-[#64748b]">Configure via environment variables in <code className="bg-[#111122] px-1 rounded text-[10px]">backend/.env</code></p>
          </div>
        </div>

        <div className="space-y-4">
          {RAG_SETTINGS.map(s => (
            <div key={s.key} className="bg-[#111122] border border-[#2a2a4a] rounded-lg p-4">
              <div className="flex items-start justify-between gap-3 mb-1">
                <div>
                  <p className="text-xs font-semibold text-[#e2e8f0]">{s.label}</p>
                  <p className="text-[10px] text-[#64748b] mt-0.5">{s.desc}</p>
                </div>
                <code className="text-[10px] bg-[#0a0a14] border border-[#2a2a4a] px-2 py-1 rounded text-brand-400 whitespace-nowrap flex-shrink-0">
                  {s.envVar}
                </code>
              </div>
              <div className="text-[10px] text-[#64748b] mt-2">
                Default: <code className="bg-[#0a0a14] px-1 rounded">{s.placeholder}</code>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Model Configuration */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-cyan-500/10 rounded-lg flex items-center justify-center border border-cyan-500/20">
            <Settings size={15} className="text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#e2e8f0]">Model Configuration</h3>
            <p className="text-xs text-[#64748b]">All models are configurable via environment variables</p>
          </div>
        </div>

        <div className="space-y-3">
          {[
            { env: 'OPENAI_CHAT_MODEL',      default: 'gpt-4o-mini',             desc: 'LLM for answer generation' },
            { env: 'OPENAI_EMBEDDING_MODEL', default: 'text-embedding-3-small',  desc: 'Model for generating embeddings' },
          ].map(m => (
            <div key={m.env} className="flex items-center justify-between bg-[#111122] border border-[#2a2a4a] rounded-lg p-3">
              <div>
                <code className="text-xs text-brand-400">{m.env}</code>
                <p className="text-[10px] text-[#64748b] mt-0.5">{m.desc}</p>
              </div>
              <code className="text-[10px] bg-[#0a0a14] border border-[#2a2a4a] px-2 py-1 rounded text-[#94a3b8]">
                {m.default}
              </code>
            </div>
          ))}
        </div>
      </div>

      {/* Anti-hallucination info */}
      <div className="card border-brand-500/20 bg-brand-500/5">
        <h3 className="text-sm font-semibold text-[#e2e8f0] mb-3">Anti-Hallucination System</h3>
        <div className="space-y-2 text-xs text-[#94a3b8]">
          <p>KnowBase AI uses a strict system prompt that instructs the LLM to:</p>
          <ul className="list-disc list-inside space-y-1 text-[#64748b]">
            <li>Answer ONLY using provided document context</li>
            <li>Never use general knowledge or training data</li>
            <li>Return "I couldn't find this information" when context is insufficient</li>
            <li>Cite source documents for every factual claim</li>
            <li>Use low temperature (0.1) for consistent, factual responses</li>
          </ul>
          <p className="mt-2">Additionally, a similarity threshold filter prevents the LLM from being called when no relevant chunks are found — ensuring the "not found" response is always returned for truly unsupported questions.</p>
        </div>
      </div>
    </div>
  );
}
