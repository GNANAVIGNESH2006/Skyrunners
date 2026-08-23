import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Send, Trash2, Plus, MessageSquare, BookOpen, Copy,
  RefreshCw, ThumbsUp, ThumbsDown, FileText, ChevronRight,
  CheckCircle, XCircle, AlertCircle, Loader2, X,
} from 'lucide-react';
import { chatApi, kbApi } from '../services/api';
import type { KnowledgeBase, Conversation, Message, SourceReference, ChatResponse } from '../types';

// ─── Suggested Questions ───────────────────────────────────────────────────────
const SUGGESTED_QUESTIONS = [
  'What is the minimum attendance requirement?',
  'What happens if attendance is insufficient?',
  'What are the examination rules?',
  'What are the hostel timings?',
  'What are the library borrowing limits?',
  'What is the grading scale?',
  'What are the placement eligibility criteria?',
  // Unsupported — should trigger "I don't know"
  'What is the refund policy for international students?',
];

// ─── Relevance Badge ───────────────────────────────────────────────────────────
function RelevanceBadge({ level, score }: { level: string; score: number }) {
  const cfg: Record<string, { cls: string; label: string; dot: string }> = {
    high:   { cls: 'badge-green',  label: 'High relevance',   dot: 'bg-green-400' },
    medium: { cls: 'badge-yellow', label: 'Medium relevance', dot: 'bg-yellow-400' },
    low:    { cls: 'badge-red',    label: 'Low relevance',    dot: 'bg-red-400' },
    none:   { cls: 'badge-gray',   label: 'Not found',        dot: 'bg-gray-400' },
  };
  const c = cfg[level] ?? cfg.none;
  return (
    <span className={`${c.cls} text-[10px]`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} inline-block`} />
      {c.label} {score > 0 && `(${Math.round(score * 100)}%)`}
    </span>
  );
}

// ─── Message Bubble ────────────────────────────────────────────────────────────
function MessageBubble({
  msg,
  onSelectSources,
}: {
  msg: Message & { relevance_level?: string };
  onSelectSources?: (sources: SourceReference[]) => void;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === 'user';

  const copy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const time = new Date(msg.created_at).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className={`flex gap-3 animate-slide-up ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold
        ${isUser
          ? 'bg-brand-600 text-white'
          : 'bg-gradient-to-br from-purple-600 to-brand-600 text-white'
        }`}
      >
        {isUser ? 'U' : 'AI'}
      </div>

      {/* Bubble */}
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed
          ${isUser
            ? 'bg-brand-600 text-white rounded-tr-sm'
            : msg.answered === 0
              ? 'bg-[#1e1e36] border border-red-500/30 text-[#e2e8f0] rounded-tl-sm'
              : 'bg-[#1e1e36] border border-[#2a2a4a] text-[#e2e8f0] rounded-tl-sm'
          }`}
        >
          {/* Not answered indicator */}
          {!isUser && msg.answered === 0 && (
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-red-500/20">
              <XCircle size={13} className="text-red-400" />
              <span className="text-xs text-red-400 font-medium">Information not found in documents</span>
            </div>
          )}

          {/* Content - render markdown-like formatting */}
          <div className="whitespace-pre-wrap">{msg.content}</div>

          {/* Sources button for assistant */}
          {!isUser && msg.sources && msg.sources.length > 0 && (
            <button
              className="mt-3 flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors"
              onClick={() => onSelectSources?.(msg.sources!)}
            >
              <FileText size={11} />
              {msg.sources.length} source{msg.sources.length !== 1 ? 's' : ''} used
              <ChevronRight size={11} />
            </button>
          )}
        </div>

        {/* Meta row */}
        <div className={`flex items-center gap-2 px-1 ${isUser ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-[#64748b]">{time}</span>
          {!isUser && msg.avg_score > 0 && (
            <RelevanceBadge level={msg.relevance_level ?? 'medium'} score={msg.avg_score} />
          )}
          {!isUser && (
            <div className="flex items-center gap-1">
              <button className="btn-ghost py-0.5 px-1.5 text-[10px]" onClick={copy}>
                {copied ? <CheckCircle size={11} className="text-green-400" /> : <Copy size={11} />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Source Panel ──────────────────────────────────────────────────────────────
function SourcePanel({ sources, onClose }: { sources: SourceReference[]; onClose: () => void }) {
  if (sources.length === 0) return null;

  return (
    <div className="w-72 flex-shrink-0 border-l border-[#2a2a4a] bg-[#0d0d1f] flex flex-col">
      <div className="px-4 py-3 border-b border-[#2a2a4a] flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold text-[#e2e8f0]">Sources & Evidence</h3>
          <p className="text-[10px] text-[#64748b]">{sources.length} source{sources.length !== 1 ? 's' : ''} retrieved</p>
        </div>
        <button className="btn-ghost p-1" onClick={onClose}><X size={13} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {sources.map((src, i) => (
          <div key={src.id ?? i} className="card p-3 border-[#2a2a4a]">
            <div className="flex items-start gap-2 mb-2">
              <FileText size={12} className="text-brand-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-[#e2e8f0] leading-tight">{src.file_name}</p>
                <p className="text-[10px] text-[#64748b]">Page {src.page_number}</p>
              </div>
            </div>

            {/* Relevance bar */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 bg-[#111122] rounded-full h-1">
                <div
                  className={`h-1 rounded-full transition-all ${
                    src.similarity_score >= 0.65 ? 'bg-green-400' :
                    src.similarity_score >= 0.40 ? 'bg-yellow-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${Math.min(100, src.similarity_score * 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-[#64748b]">
                {Math.round(src.similarity_score * 100)}%
              </span>
            </div>

            {/* Chunk content */}
            <div className="bg-[#111122] rounded-lg p-2 border border-[#2a2a4a]">
              <p className="text-[10px] text-[#94a3b8] leading-relaxed line-clamp-6">
                {src.chunk_content}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Chat Page ────────────────────────────────────────────────────────────
export default function ChatPage() {
  const { kbId: paramKbId } = useParams<{ kbId: string }>();
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [selectedKbId, setSelectedKbId] = useState(paramKbId ?? '');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<(Message & { relevance_level?: string })[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [activeSources, setActiveSources] = useState<SourceReference[]>([]);
  const [deleteConvId, setDeleteConvId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load KBs and conversations on mount
  useEffect(() => {
    kbApi.list().then(list => {
      setKbs(list);
      if (!selectedKbId && list.length > 0) setSelectedKbId(list[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedKbId) return;
    chatApi.listConversations(selectedKbId).then(setConversations);
  }, [selectedKbId]);

  // Load conversation messages when active conv changes
  useEffect(() => {
    if (!activeConvId) { setMessages([]); return; }
    chatApi.getConversation(activeConvId).then(conv => {
      setMessages((conv.messages ?? []).map(m => ({
        ...m,
        relevance_level: m.avg_score >= 0.65 ? 'high' : m.avg_score >= 0.40 ? 'medium' : m.avg_score > 0 ? 'low' : 'none',
      })));
    });
  }, [activeConvId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNewConversation = () => {
    setActiveConvId(null);
    setMessages([]);
    setActiveSources([]);
    inputRef.current?.focus();
  };

  const handleDeleteConv = async (id: string) => {
    await chatApi.deleteConversation(id);
    if (activeConvId === id) { setActiveConvId(null); setMessages([]); }
    setConversations(c => c.filter(x => x.id !== id));
    setDeleteConvId(null);
  };

  const handleSend = useCallback(async () => {
    const q = input.trim();
    if (!q || !selectedKbId || sending) return;

    setInput('');
    setSending(true);
    setError('');

    // Optimistic user message
    const tempUserMsg: Message & { relevance_level?: string } = {
      id: `temp-${Date.now()}`,
      conv_id: activeConvId ?? '',
      role: 'user',
      content: q,
      answered: 1,
      avg_score: 0,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    // Typing indicator
    const typingMsg: Message & { relevance_level?: string } = {
      id: 'typing',
      conv_id: activeConvId ?? '',
      role: 'assistant',
      content: '__typing__',
      answered: 1,
      avg_score: 0,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, typingMsg]);

    try {
      const result: ChatResponse = await chatApi.send(
        selectedKbId, q, activeConvId ?? undefined
      );

      // Update conversation ID if new
      if (!activeConvId) {
        setActiveConvId(result.conversation_id);
        chatApi.listConversations(selectedKbId).then(setConversations);
      }

      // Replace typing + temp with real messages
      const assistantMsg: Message & { relevance_level?: string } = {
        id: result.assistant_message_id,
        conv_id: result.conversation_id,
        role: 'assistant',
        content: result.answer,
        answered: result.answered ? 1 : 0,
        avg_score: result.avg_score,
        relevance_level: result.relevance_level,
        created_at: new Date().toISOString(),
        sources: result.sources,
      };

      setMessages(prev => [
        ...prev.filter(m => m.id !== 'typing' && m.id !== tempUserMsg.id),
        { ...tempUserMsg, conv_id: result.conversation_id, id: result.user_message_id },
        assistantMsg,
      ]);

      // Show sources panel if there are sources
      if (result.sources.length > 0) {
        setActiveSources(result.sources);
      } else {
        setActiveSources([]);
      }
    } catch (err: any) {
      setMessages(prev => prev.filter(m => m.id !== 'typing' && m.id !== tempUserMsg.id));
      setError(err.response?.data?.error ?? 'Failed to send message. Make sure the backend is running.');
    } finally {
      setSending(false);
    }
  }, [input, selectedKbId, activeConvId, sending]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 -m-6 overflow-hidden">
      {/* ── Conversations Sidebar ──────────────────────────────────────────── */}
      <div className="w-56 flex-shrink-0 bg-[#0d0d1f] border-r border-[#2a2a4a] flex flex-col">
        {/* KB selector */}
        <div className="p-3 border-b border-[#2a2a4a]">
          <label className="text-[10px] text-[#64748b] mb-1 block font-medium uppercase tracking-wider">Knowledge Base</label>
          <select
            id="chat-kb-selector"
            className="input text-xs py-1.5"
            value={selectedKbId}
            onChange={e => { setSelectedKbId(e.target.value); setActiveConvId(null); setMessages([]); }}
          >
            <option value="">Select KB...</option>
            {kbs.map(kb => <option key={kb.id} value={kb.id}>{kb.name}</option>)}
          </select>
        </div>

        {/* New Chat */}
        <div className="p-2 border-b border-[#2a2a4a]">
          <button
            id="new-chat-btn"
            className="btn-secondary w-full text-xs py-2 justify-center"
            onClick={handleNewConversation}
            disabled={!selectedKbId}
          >
            <Plus size={13} /> New Chat
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 && (
            <p className="text-[10px] text-[#64748b] text-center p-4">No conversations yet</p>
          )}
          {conversations.map(conv => (
            <div
              key={conv.id}
              className={`group flex items-start gap-2 p-2 rounded-lg cursor-pointer text-xs transition-all
                ${activeConvId === conv.id
                  ? 'bg-brand-500/10 border border-brand-500/20 text-brand-300'
                  : 'hover:bg-[#1e1e36] text-[#94a3b8]'
                }`}
              onClick={() => setActiveConvId(conv.id)}
            >
              <MessageSquare size={11} className="mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="truncate leading-tight">{conv.title}</p>
                <p className="text-[10px] text-[#64748b]">{conv.message_count ?? 0} msgs</p>
              </div>
              <button
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-red-400 transition-all"
                onClick={e => { e.stopPropagation(); setDeleteConvId(conv.id); }}
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main Chat Area ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <div className="px-4 py-3 border-b border-[#2a2a4a] bg-[#0d0d1f] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare size={14} className="text-brand-400" />
            <span className="text-sm font-medium text-[#e2e8f0]">
              {activeConvId ? conversations.find(c => c.id === activeConvId)?.title ?? 'Chat' : 'New Conversation'}
            </span>
          </div>
          {activeConvId && (
            <button className="btn-ghost py-1 px-2 text-xs text-red-400 hover:text-red-300"
              onClick={() => { setActiveConvId(null); setMessages([]); }}>
              <X size={12} /> Clear
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!selectedKbId && (
            <div className="text-center py-12">
              <BookOpen size={40} className="mx-auto mb-3 text-[#2a2a4a]" />
              <p className="text-sm text-[#94a3b8] mb-1">Select a knowledge base to start chatting</p>
              <p className="text-xs text-[#64748b]">Choose one from the sidebar on the left</p>
            </div>
          )}

          {selectedKbId && messages.length === 0 && (
            <div className="space-y-6 py-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-brand-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-brand-500/20">
                  <MessageSquare size={20} className="text-brand-400" />
                </div>
                <h3 className="text-base font-semibold text-[#e2e8f0] mb-1">Ask your documents</h3>
                <p className="text-sm text-[#64748b] max-w-sm mx-auto">
                  Questions are answered <em>only</em> from your uploaded documents.
                  Unsupported questions will receive an honest "not found" response.
                </p>
              </div>

              {/* Suggested questions */}
              <div className="max-w-md mx-auto space-y-2">
                <p className="text-xs text-[#64748b] font-medium text-center mb-3">Try asking:</p>
                <div className="grid gap-2">
                  {SUGGESTED_QUESTIONS.slice(0, 6).map(q => (
                    <button
                      key={q}
                      className="text-left text-xs bg-[#111122] border border-[#2a2a4a] hover:border-brand-500/40 hover:bg-[#1e1e36] rounded-lg px-3 py-2.5 text-[#94a3b8] hover:text-[#e2e8f0] transition-all"
                      onClick={() => { setInput(q); inputRef.current?.focus(); }}
                    >
                      {q}
                    </button>
                  ))}
                  <button
                    key={SUGGESTED_QUESTIONS[7]}
                    className="text-left text-xs bg-red-500/5 border border-red-500/20 hover:border-red-500/40 rounded-lg px-3 py-2.5 text-red-400/70 hover:text-red-400 transition-all"
                    onClick={() => { setInput(SUGGESTED_QUESTIONS[7]); inputRef.current?.focus(); }}
                  >
                    🧪 {SUGGESTED_QUESTIONS[7]} <span className="text-[10px]">(unsupported)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {messages.map(msg => (
            msg.content === '__typing__' ? (
              <div key="typing" className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-brand-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">AI</div>
                <div className="bg-[#1e1e36] border border-[#2a2a4a] rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1 items-center">
                    <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                  </div>
                </div>
              </div>
            ) : (
              <MessageBubble
                key={msg.id}
                msg={msg}
                onSelectSources={setActiveSources}
              />
            )
          ))}

          {error && (
            <div className="card border-red-500/20 bg-red-500/5 text-red-400 text-sm p-3 flex items-center justify-between">
              <div className="flex items-center gap-2"><AlertCircle size={14} /> {error}</div>
              <button onClick={() => setError('')}><X size={13} /></button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-4 border-t border-[#2a2a4a] bg-[#0d0d1f]">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              id="chat-input"
              className="textarea flex-1 min-h-[44px] max-h-32 py-2.5"
              placeholder={selectedKbId ? 'Ask anything about your documents...' : 'Select a knowledge base first...'}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!selectedKbId || sending}
              rows={1}
            />
            <button
              id="chat-send-btn"
              className="btn-primary px-4 self-end"
              onClick={handleSend}
              disabled={!input.trim() || !selectedKbId || sending}
            >
              {sending
                ? <Loader2 size={16} className="animate-spin" />
                : <Send size={16} />
              }
            </button>
          </div>
          <p className="text-[10px] text-[#64748b] mt-1.5">
            Enter to send · Shift+Enter for new line · Answers grounded in documents only
          </p>
        </div>
      </div>

      {/* ── Source Panel ────────────────────────────────────────────────────── */}
      {activeSources.length > 0 && (
        <SourcePanel sources={activeSources} onClose={() => setActiveSources([])} />
      )}

      {/* Delete conv confirm */}
      {deleteConvId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setDeleteConvId(null)}>
          <div className="card max-w-xs w-full mx-4 border-red-500/30" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-[#e2e8f0] mb-2">Delete conversation?</h3>
            <p className="text-sm text-[#64748b] mb-4">This action cannot be undone.</p>
            <div className="flex gap-2">
              <button className="btn-danger flex-1" onClick={() => handleDeleteConv(deleteConvId)}>Delete</button>
              <button className="btn-secondary flex-1" onClick={() => setDeleteConvId(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
