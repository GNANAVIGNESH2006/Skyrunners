import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import { BarChart3, CheckCircle, XCircle, TrendingUp, FileText, Loader2 } from 'lucide-react';
import { analyticsApi, kbApi } from '../services/api';
import type { AnalyticsData, KnowledgeBase } from '../types';

const COLORS = { high: '#10b981', medium: '#f59e0b', low: '#ef4444', answered: '#6366f1', unanswered: '#ef4444' };

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 text-[#64748b]">
      <BarChart3 size={28} className="mb-2 opacity-40" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1e1e36] border border-[#2a2a4a] rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-[#94a3b8] mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[#e2e8f0]">{p.name}: {p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [selectedKbId, setSelectedKbId] = useState('');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = (kbId?: string) => {
    setLoading(true);
    analyticsApi.get(kbId || undefined)
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    kbApi.list().then(setKbs);
    load();
  }, []);

  const pieData = data
    ? [
        { name: 'High', value: data.relevance_distribution.high,   color: COLORS.high },
        { name: 'Medium', value: data.relevance_distribution.medium, color: COLORS.medium },
        { name: 'Low', value: data.relevance_distribution.low,    color: COLORS.low },
      ].filter(d => d.value > 0)
    : [];

  const answerPie = data
    ? [
        { name: 'Answered',   value: data.answered_questions,   color: COLORS.answered },
        { name: 'Unanswered', value: data.unanswered_questions, color: COLORS.unanswered },
      ].filter(d => d.value > 0)
    : [];

  const hasData = data && data.total_questions > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Analytics</h2>
          <p className="page-subtitle">Insights into your knowledge base usage</p>
        </div>
        <select
          id="analytics-kb-selector"
          className="input w-auto text-xs"
          value={selectedKbId}
          onChange={e => { setSelectedKbId(e.target.value); load(e.target.value || undefined); }}
        >
          <option value="">All Knowledge Bases</option>
          {kbs.map(kb => <option key={kb.id} value={kb.id}>{kb.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={24} className="animate-spin text-brand-400" />
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: BarChart3,    label: 'Total Questions',     value: data?.total_questions ?? 0,    color: 'text-brand-400',  bg: 'bg-brand-500/10 border-brand-500/20' },
              { icon: CheckCircle, label: 'Answered',             value: data?.answered_questions ?? 0, color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20' },
              { icon: XCircle,     label: 'Not Found',            value: data?.unanswered_questions ?? 0, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
              { icon: TrendingUp,  label: 'Avg Relevance Score',  value: data ? `${Math.round(data.avg_relevance * 100)}%` : '0%', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
            ].map(({ icon: Icon, label, value, color, bg }) => (
              <div key={label} className="card">
                <div className={`w-9 h-9 rounded-lg border flex items-center justify-center mb-3 ${bg}`}>
                  <Icon size={16} className={color} />
                </div>
                <div className="text-2xl font-bold text-[#e2e8f0] mb-1">{value}</div>
                <div className="text-xs text-[#64748b]">{label}</div>
              </div>
            ))}
          </div>

          {!hasData ? (
            <div className="card text-center py-16">
              <BarChart3 size={40} className="mx-auto mb-4 text-[#2a2a4a]" />
              <h3 className="text-sm font-semibold text-[#94a3b8] mb-2">No analytics data yet</h3>
              <p className="text-xs text-[#64748b]">
                Start asking questions in the AI Assistant to see analytics here.
              </p>
            </div>
          ) : (
            <>
              {/* Daily questions chart */}
              <div className="card">
                <h3 className="text-sm font-semibold text-[#e2e8f0] mb-4">Questions Over Time (Last 30 Days)</h3>
                {data!.daily_counts.length === 0 ? (
                  <EmptyState label="No daily data available" />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={data!.daily_counts} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                      <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                      <Line type="monotone" dataKey="count" name="Total" stroke="#6366f1" strokeWidth={2} dot={{ r: 3, fill: '#6366f1' }} />
                      <Line type="monotone" dataKey="answered" name="Answered" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="grid lg:grid-cols-3 gap-4">
                {/* Answer rate pie */}
                <div className="card">
                  <h3 className="text-sm font-semibold text-[#e2e8f0] mb-4">Answer Rate</h3>
                  {answerPie.length === 0 ? (
                    <EmptyState label="No data" />
                  ) : (
                    <div className="flex flex-col items-center">
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie data={answerPie} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                            {answerPie.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex gap-4 mt-2">
                        {answerPie.map(e => (
                          <div key={e.name} className="flex items-center gap-1.5 text-xs text-[#94a3b8]">
                            <div className="w-2 h-2 rounded-full" style={{ background: e.color }} />
                            {e.name}: {e.value}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Relevance distribution pie */}
                <div className="card">
                  <h3 className="text-sm font-semibold text-[#e2e8f0] mb-4">Relevance Distribution</h3>
                  {pieData.length === 0 ? (
                    <EmptyState label="No relevance data" />
                  ) : (
                    <div className="flex flex-col items-center">
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                            {pieData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex gap-3 mt-2 flex-wrap justify-center">
                        {pieData.map(e => (
                          <div key={e.name} className="flex items-center gap-1.5 text-xs text-[#94a3b8]">
                            <div className="w-2 h-2 rounded-full" style={{ background: e.color }} />
                            {e.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Top documents */}
                <div className="card">
                  <h3 className="text-sm font-semibold text-[#e2e8f0] mb-4">Most Used Documents</h3>
                  {data!.top_documents.length === 0 ? (
                    <EmptyState label="No document usage data" />
                  ) : (
                    <div className="space-y-2">
                      {data!.top_documents.slice(0, 6).map((doc, i) => (
                        <div key={doc.file_name} className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded bg-[#1e1e36] flex items-center justify-center text-[10px] text-[#64748b] font-bold flex-shrink-0">
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-[#e2e8f0] truncate">{doc.file_name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className="flex-1 h-1 bg-[#111122] rounded-full">
                                <div
                                  className="h-1 bg-brand-500 rounded-full"
                                  style={{ width: `${Math.min(100, (doc.query_count / (data!.top_documents[0]?.query_count || 1)) * 100)}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-[#64748b] w-6 text-right">{doc.query_count}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Top topics bar chart */}
              {data!.top_documents.length > 0 && (
                <div className="card">
                  <h3 className="text-sm font-semibold text-[#e2e8f0] mb-4">Document Query Frequency</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data!.top_documents.slice(0, 8)} margin={{ top: 5, right: 10, bottom: 40, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                      <XAxis
                        dataKey="file_name"
                        tick={{ fill: '#64748b', fontSize: 10 }}
                        angle={-30}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="query_count" name="Queries" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
