import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database, FileText, MessageSquare, CheckCircle, XCircle,
  BookOpen, ArrowRight, Clock, TrendingUp,
} from 'lucide-react';
import { analyticsApi } from '../services/api';
import type { DashboardStats, Document } from '../types';

interface RecentQuestion {
  id: string; content: string; answered: number; avg_score: number;
  created_at: string; kb_name: string; source_count: number;
}

function StatCard({
  icon: Icon, label, value, color, sub
}: {
  icon: React.ElementType; label: string; value: number | string;
  color: string; sub?: string;
}) {
  const colorMap: Record<string, string> = {
    blue:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
    green:  'bg-green-500/10 text-green-400 border-green-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    red:    'bg-red-500/10 text-red-400 border-red-500/20',
    cyan:   'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  };

  return (
    <div className="card-hover">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${colorMap[color]}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="text-2xl font-bold text-[#e2e8f0] mb-1">{value}</div>
      <div className="text-sm text-[#64748b]">{label}</div>
      {sub && <div className="text-xs text-[#94a3b8] mt-1">{sub}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ready:      'badge-green',
    processing: 'badge-yellow',
    uploaded:   'badge-blue',
    failed:     'badge-red',
  };
  return <span className={map[status] ?? 'badge-gray'}>{status}</span>;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentDocs, setRecentDocs] = useState<Document[]>([]);
  const [recentQs, setRecentQs] = useState<RecentQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    analyticsApi.dashboard()
      .then(data => {
        setStats(data.stats);
        setRecentDocs(data.recentDocs);
        setRecentQs(data.recentQuestions);
      })
      .catch(() => setError('Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array(6).fill(0).map((_, i) => <div key={i} className="card h-28 skeleton" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card border-red-500/20 bg-red-500/5 text-center py-10">
        <XCircle size={32} className="text-red-400 mx-auto mb-3" />
        <p className="text-red-400">{error}</p>
        <p className="text-[#64748b] text-sm mt-1">Make sure the backend is running on port 3001</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="page-header">
        <h2 className="page-title">Welcome back 👋</h2>
        <p className="page-subtitle">Here's an overview of your KnowBase AI system</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard icon={BookOpen}      label="Knowledge Bases" value={stats?.total_kbs ?? 0}          color="purple" />
        <StatCard icon={FileText}      label="Documents"        value={stats?.total_docs ?? 0}         color="blue" />
        <StatCard icon={Database}      label="Total Chunks"     value={(stats?.total_chunks ?? 0).toLocaleString()} color="cyan" />
        <StatCard icon={MessageSquare} label="Questions Asked"  value={stats?.total_questions ?? 0}   color="yellow" />
        <StatCard icon={CheckCircle}   label="Answered"         value={stats?.answered_questions ?? 0} color="green" />
        <StatCard icon={XCircle}       label="Unanswered"       value={stats?.unanswered_questions ?? 0} color="red" />
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/app/chat')}
          className="card-hover text-left group cursor-pointer"
          id="dash-open-chat-btn"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare size={16} className="text-brand-400" />
                <span className="text-sm font-semibold text-[#e2e8f0]">Ask a Question</span>
              </div>
              <p className="text-xs text-[#64748b]">Open AI Assistant</p>
            </div>
            <ArrowRight size={16} className="text-[#64748b] group-hover:text-brand-400 transition-colors" />
          </div>
        </button>
        <button
          onClick={() => navigate('/app/documents')}
          className="card-hover text-left group cursor-pointer"
          id="dash-upload-btn"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FileText size={16} className="text-blue-400" />
                <span className="text-sm font-semibold text-[#e2e8f0]">Upload Document</span>
              </div>
              <p className="text-xs text-[#64748b]">Add to knowledge base</p>
            </div>
            <ArrowRight size={16} className="text-[#64748b] group-hover:text-blue-400 transition-colors" />
          </div>
        </button>
        <button
          onClick={() => navigate('/app/analytics')}
          className="card-hover text-left group cursor-pointer"
          id="dash-analytics-btn"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={16} className="text-green-400" />
                <span className="text-sm font-semibold text-[#e2e8f0]">View Analytics</span>
              </div>
              <p className="text-xs text-[#64748b]">Question statistics</p>
            </div>
            <ArrowRight size={16} className="text-[#64748b] group-hover:text-green-400 transition-colors" />
          </div>
        </button>
      </div>

      {/* Recent docs + questions */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Documents */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#e2e8f0]">Recent Documents</h3>
            <button
              onClick={() => navigate('/app/documents')}
              className="text-xs text-brand-400 hover:text-brand-300"
            >
              View all →
            </button>
          </div>
          {recentDocs.length === 0 ? (
            <div className="text-center py-8 text-[#64748b] text-sm">
              <FileText size={24} className="mx-auto mb-2 opacity-50" />
              No documents yet
            </div>
          ) : (
            <div className="space-y-2">
              {recentDocs.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg bg-[#111122] border border-[#2a2a4a]">
                  <div className="w-8 h-8 rounded-lg bg-[#1e1e36] border border-[#2a2a4a] flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-[#94a3b8]">{doc.file_type?.toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#e2e8f0] truncate">{doc.file_name}</p>
                    <p className="text-xs text-[#64748b]">
                      {doc.chunk_count} chunks · {formatDate(doc.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={doc.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Questions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#e2e8f0]">Recent Questions</h3>
            <button
              onClick={() => navigate('/app/analytics')}
              className="text-xs text-brand-400 hover:text-brand-300"
            >
              View analytics →
            </button>
          </div>
          {recentQs.length === 0 ? (
            <div className="text-center py-8 text-[#64748b] text-sm">
              <MessageSquare size={24} className="mx-auto mb-2 opacity-50" />
              No questions asked yet
            </div>
          ) : (
            <div className="space-y-2">
              {recentQs.map(q => (
                <div key={q.id} className="p-3 rounded-lg bg-[#111122] border border-[#2a2a4a]">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-[#e2e8f0] truncate flex-1">{q.content}</p>
                    {q.answered
                      ? <CheckCircle size={14} className="text-green-400 flex-shrink-0 mt-0.5" />
                      : <XCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                    }
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-[#64748b]">{q.kb_name}</span>
                    <span className="text-xs text-[#64748b]">·</span>
                    <span className="text-xs text-[#64748b]">{q.source_count} sources</span>
                    <span className="text-xs text-[#64748b]">·</span>
                    <span className="text-xs text-[#64748b] flex items-center gap-1">
                      <Clock size={10} /> {formatDate(q.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
