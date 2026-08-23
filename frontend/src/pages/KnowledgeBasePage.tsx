import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, Plus, Trash2, MessageSquare, FileText,
  MoreVertical, Edit2, X, Check, ChevronRight,
} from 'lucide-react';
import { kbApi } from '../services/api';
import type { KnowledgeBase } from '../types';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function KnowledgeBasePage() {
  const navigate = useNavigate();
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    kbApi.list()
      .then(setKbs)
      .catch(() => setError('Failed to load knowledge bases'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await kbApi.create(newName, newDesc);
      setNewName(''); setNewDesc('');
      setShowCreate(false);
      load();
    } catch {
      setError('Failed to create knowledge base');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await kbApi.delete(id);
      load();
    } catch {
      setError('Failed to delete knowledge base');
    } finally {
      setDeleteId(null);
    }
  };

  const handleEdit = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await kbApi.update(id, { name: editName });
      setEditingId(null);
      load();
    } catch {
      setError('Failed to update');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="page-header mb-0">
          <h2 className="page-title">Knowledge Bases</h2>
          <p className="page-subtitle">Create and manage your document collections</p>
        </div>
        <button
          id="create-kb-btn"
          className="btn-primary"
          onClick={() => setShowCreate(true)}
        >
          <Plus size={16} /> New Knowledge Base
        </button>
      </div>

      {error && (
        <div className="card border-red-500/20 bg-red-500/5 text-red-400 text-sm p-3 flex items-center justify-between">
          {error}
          <button onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="card border-brand-500/30 bg-brand-500/5 animate-slide-up">
          <h3 className="text-sm font-semibold text-[#e2e8f0] mb-4">Create New Knowledge Base</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[#94a3b8] mb-1 block">Name *</label>
              <input
                id="kb-name-input"
                className="input"
                placeholder="e.g. College Student Handbook"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs text-[#94a3b8] mb-1 block">Description</label>
              <textarea
                id="kb-desc-input"
                className="textarea"
                rows={2}
                placeholder="What documents will this knowledge base contain?"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button
                id="kb-create-submit-btn"
                className="btn-primary"
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
              <button
                className="btn-secondary"
                onClick={() => { setShowCreate(false); setNewName(''); setNewDesc(''); }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KB List */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="card h-40 skeleton" />)}
        </div>
      ) : kbs.length === 0 ? (
        <div className="card text-center py-16">
          <BookOpen size={40} className="mx-auto mb-4 text-[#2a2a4a]" />
          <h3 className="text-sm font-semibold text-[#94a3b8] mb-2">No knowledge bases yet</h3>
          <p className="text-xs text-[#64748b] mb-4">Create one to start uploading documents</p>
          <button className="btn-primary mx-auto" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Create Your First
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {kbs.map(kb => (
            <div
              key={kb.id}
              className="card-hover group cursor-pointer relative"
              onClick={() => navigate(`/app/documents?kb_id=${kb.id}`)}
              id={`kb-card-${kb.id}`}
            >
              {/* Top actions */}
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                   onClick={e => e.stopPropagation()}>
                <button
                  className="w-7 h-7 rounded-lg bg-[#1e1e36] hover:bg-[#2a2a4a] flex items-center justify-center"
                  title="Edit"
                  onClick={() => { setEditingId(kb.id); setEditName(kb.name); }}
                >
                  <Edit2 size={12} className="text-[#94a3b8]" />
                </button>
                <button
                  className="w-7 h-7 rounded-lg bg-red-600/20 hover:bg-red-600/30 flex items-center justify-center"
                  title="Delete"
                  onClick={() => setDeleteId(kb.id)}
                >
                  <Trash2 size={12} className="text-red-400" />
                </button>
              </div>

              <div className="w-10 h-10 bg-brand-500/10 rounded-lg flex items-center justify-center border border-brand-500/20 mb-4">
                <BookOpen size={18} className="text-brand-400" />
              </div>

              {/* Inline edit */}
              {editingId === kb.id ? (
                <div onClick={e => e.stopPropagation()} className="mb-2">
                  <input
                    className="input text-sm mb-2"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button className="btn-primary py-1 px-2 text-xs" onClick={() => handleEdit(kb.id)}>
                      <Check size={12} /> Save
                    </button>
                    <button className="btn-secondary py-1 px-2 text-xs" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="font-semibold text-[#e2e8f0] mb-1 pr-16">{kb.name}</h3>
                  <p className="text-xs text-[#64748b] mb-4 line-clamp-2">
                    {kb.description || 'No description'}
                  </p>
                </>
              )}

              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-[#111122] rounded-lg p-2 border border-[#2a2a4a]">
                  <div className="text-sm font-bold text-[#e2e8f0]">{kb.document_count ?? 0}</div>
                  <div className="text-xs text-[#64748b]">Documents</div>
                </div>
                <div className="bg-[#111122] rounded-lg p-2 border border-[#2a2a4a]">
                  <div className="text-sm font-bold text-[#e2e8f0]">{(kb.chunk_count ?? 0).toLocaleString()}</div>
                  <div className="text-xs text-[#64748b]">Chunks</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#2a2a4a]">
                <span className="text-xs text-[#64748b]">Updated {formatDate(kb.updated_at)}</span>
                <div className="flex items-center gap-2">
                  <button
                    className="btn-ghost py-1 px-2 text-xs"
                    title="Open Chat"
                    onClick={e => { e.stopPropagation(); navigate(`/app/chat/${kb.id}`); }}
                  >
                    <MessageSquare size={12} /> Chat
                  </button>
                  <ChevronRight size={14} className="text-[#64748b]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setDeleteId(null)}>
          <div className="card max-w-sm w-full mx-4 border-red-500/30" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-[#e2e8f0] mb-2">Delete Knowledge Base?</h3>
            <p className="text-sm text-[#64748b] mb-4">
              This will permanently delete the knowledge base and all its documents and conversations.
            </p>
            <div className="flex gap-2">
              <button className="btn-danger flex-1" onClick={() => handleDelete(deleteId)}>
                <Trash2 size={14} /> Delete
              </button>
              <button className="btn-secondary flex-1" onClick={() => setDeleteId(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
