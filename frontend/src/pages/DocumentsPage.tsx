import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import {
  Upload, FileText, Trash2, RefreshCw, X, CheckCircle,
  AlertCircle, Clock, Loader2, Eye, ChevronDown, ChevronUp,
} from 'lucide-react';
import { docApi, kbApi } from '../services/api';
import type { Document, KnowledgeBase } from '../types';

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { cls: string; icon: React.ReactNode }> = {
    ready:      { cls: 'badge-green',  icon: <CheckCircle size={10} /> },
    processing: { cls: 'badge-yellow', icon: <Loader2 size={10} className="animate-spin" /> },
    uploaded:   { cls: 'badge-blue',   icon: <Clock size={10} /> },
    failed:     { cls: 'badge-red',    icon: <AlertCircle size={10} /> },
  };
  const c = cfg[status] ?? { cls: 'badge-gray', icon: null };
  return <span className={c.cls}>{c.icon} {status}</span>;
}

function ProcessingSteps({ doc }: { doc: Document }) {
  const steps = [
    { label: 'Uploaded',    done: true },
    { label: 'Extracting', done: doc.status !== 'uploaded', active: doc.status === 'processing' },
    { label: 'Chunking',   done: doc.status === 'ready',    active: doc.status === 'processing' && doc.chunk_count === 0 },
    { label: 'Embedding',  done: doc.status === 'ready',    active: doc.status === 'processing' && doc.chunk_count === 0 },
    { label: 'Ready',      done: doc.status === 'ready' },
  ];

  return (
    <div className="flex items-center gap-1.5 mt-2">
      {steps.map((s, i) => (
        <div key={s.label} className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${s.done ? 'bg-green-400' : s.active ? 'bg-yellow-400 animate-pulse' : 'bg-[#2a2a4a]'}`} />
          <span className={`text-[10px] ${s.done ? 'text-green-400' : s.active ? 'text-yellow-400' : 'text-[#64748b]'}`}>
            {s.label}
          </span>
          {i < steps.length - 1 && <span className="text-[#2a2a4a] text-[10px]">→</span>}
        </div>
      ))}
    </div>
  );
}

export default function DocumentsPage() {
  const [searchParams] = useSearchParams();
  const initialKbId = searchParams.get('kb_id') ?? '';

  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [docs, setDocs] = useState<Document[]>([]);
  const [selectedKbId, setSelectedKbId] = useState(initialKbId);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedChunks, setExpandedChunks] = useState<string | null>(null);
  const [chunks, setChunks] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      kbApi.list(),
      docApi.list(selectedKbId || undefined),
    ]).then(([kbList, docList]) => {
      setKbs(kbList);
      setDocs(docList);
    }).catch(() => setError('Failed to load documents'))
      .finally(() => setLoading(false));
  }, [selectedKbId]);

  useEffect(() => { load(); }, [load]);

  // Poll processing documents every 3 seconds
  useEffect(() => {
    const processing = docs.some(d => d.status === 'processing' || d.status === 'uploaded');
    if (!processing) return;
    const timer = setTimeout(load, 3000);
    return () => clearTimeout(timer);
  }, [docs, load]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!selectedKbId) {
      setError('Please select a knowledge base first');
      return;
    }
    setUploading(true);
    setError('');

    for (const file of acceptedFiles) {
      try {
        await docApi.upload(file, selectedKbId, setUploadProgress);
        setSuccess(`"${file.name}" uploaded and processing started`);
      } catch (err: any) {
        setError(`Failed to upload ${file.name}: ${err.response?.data?.error ?? err.message}`);
      }
    }

    setUploading(false);
    setUploadProgress(0);
    load();
  }, [selectedKbId, load]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
    disabled: !selectedKbId || uploading,
  });

  const handleDelete = async (id: string) => {
    try {
      await docApi.delete(id);
      load();
    } catch {
      setError('Failed to delete document');
    } finally {
      setDeleteId(null);
    }
  };

  const handleReprocess = async (id: string) => {
    try {
      await docApi.reprocess(id);
      setSuccess('Reprocessing started');
      load();
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to reprocess');
    }
  };

  const loadChunks = async (docId: string) => {
    if (expandedChunks === docId) { setExpandedChunks(null); return; }
    try {
      const data = await docApi.getChunks(docId);
      setChunks(data);
      setExpandedChunks(docId);
    } catch {
      setError('Failed to load chunks');
    }
  };

  const filtered = docs.filter(d => !filterStatus || d.status === filterStatus);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Documents</h2>
          <p className="page-subtitle">Upload and manage your knowledge base documents</p>
        </div>
        <div className="flex gap-2 items-center">
          <select
            className="input w-auto py-2 text-xs"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="ready">Ready</option>
            <option value="processing">Processing</option>
            <option value="uploaded">Uploaded</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="card border-red-500/20 bg-red-500/5 text-red-400 text-sm p-3 flex items-center justify-between">
          {error}<button onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}
      {success && (
        <div className="card border-green-500/20 bg-green-500/5 text-green-400 text-sm p-3 flex items-center justify-between">
          <div className="flex items-center gap-2"><CheckCircle size={14} /> {success}</div>
          <button onClick={() => setSuccess('')}><X size={14} /></button>
        </div>
      )}

      {/* Knowledge base selector */}
      <div className="card">
        <label className="text-xs text-[#94a3b8] mb-2 block font-medium">Select Knowledge Base</label>
        <select
          id="kb-selector"
          className="input"
          value={selectedKbId}
          onChange={e => setSelectedKbId(e.target.value)}
        >
          <option value="">-- All Knowledge Bases --</option>
          {kbs.map(kb => (
            <option key={kb.id} value={kb.id}>{kb.name}</option>
          ))}
        </select>
      </div>

      {/* Upload zone */}
      <div
        {...getRootProps()}
        id="upload-dropzone"
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 cursor-pointer
          ${isDragActive
            ? 'border-brand-500 bg-brand-500/10'
            : !selectedKbId || uploading
              ? 'border-[#2a2a4a] bg-[#111122] opacity-60 cursor-not-allowed'
              : 'border-[#2a2a4a] hover:border-brand-500/50 hover:bg-[#111122]'
          }`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div>
            <Loader2 size={32} className="mx-auto mb-3 text-brand-400 animate-spin" />
            <p className="text-sm text-[#94a3b8] mb-2">Uploading... {uploadProgress}%</p>
            <div className="w-48 mx-auto bg-[#2a2a4a] rounded-full h-1.5">
              <div
                className="bg-brand-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <Upload size={32} className="mx-auto mb-3 text-[#64748b]" />
            <p className="text-sm font-medium text-[#94a3b8] mb-1">
              {isDragActive ? 'Drop files here...' : 'Drag & drop files here'}
            </p>
            <p className="text-xs text-[#64748b] mb-3">or click to browse</p>
            <p className="text-xs text-[#64748b]">Supports: PDF, DOCX, TXT, Markdown · Max 50MB</p>
            {!selectedKbId && (
              <p className="text-xs text-yellow-400 mt-2">⚠ Select a knowledge base above to enable upload</p>
            )}
          </>
        )}
      </div>

      {/* Documents list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="card h-20 skeleton" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <FileText size={32} className="mx-auto mb-3 text-[#2a2a4a]" />
          <p className="text-sm text-[#94a3b8]">No documents found</p>
          <p className="text-xs text-[#64748b] mt-1">Upload a document above to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(doc => (
            <div key={doc.id} className="card" id={`doc-${doc.id}`}>
              <div className="flex items-center gap-4">
                {/* File type icon */}
                <div className="w-10 h-10 rounded-lg bg-[#1e1e36] border border-[#2a2a4a] flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-[#94a3b8]">{doc.file_type?.toUpperCase()}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <p className="text-sm font-medium text-[#e2e8f0] truncate">{doc.file_name}</p>
                    <StatusBadge status={doc.status} />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[#64748b] flex-wrap">
                    <span>{formatFileSize(doc.file_size)}</span>
                    <span>{doc.page_count} pages</span>
                    <span>{doc.chunk_count} chunks</span>
                    <span>{formatDate(doc.created_at)}</span>
                    {doc.kb_id && <span className="text-brand-400">{kbs.find(k => k.id === doc.kb_id)?.name}</span>}
                  </div>
                  {(doc.status === 'processing' || doc.status === 'uploaded') && (
                    <ProcessingSteps doc={doc} />
                  )}
                  {doc.status === 'failed' && doc.error_message && (
                    <p className="text-xs text-red-400 mt-1">⚠ {doc.error_message}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {doc.status === 'ready' && (
                    <button
                      className="btn-ghost py-1.5 px-2 text-xs"
                      title="View chunks"
                      onClick={() => loadChunks(doc.id)}
                    >
                      <Eye size={13} />
                      {expandedChunks === doc.id ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    </button>
                  )}
                  {(doc.status === 'failed' || doc.status === 'ready') && (
                    <button
                      className="btn-ghost py-1.5 px-2 text-xs"
                      title="Reprocess"
                      onClick={() => handleReprocess(doc.id)}
                    >
                      <RefreshCw size={13} />
                    </button>
                  )}
                  <button
                    className="btn-danger py-1.5 px-2 text-xs"
                    title="Delete"
                    onClick={() => setDeleteId(doc.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Chunks viewer */}
              {expandedChunks === doc.id && chunks.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#2a2a4a]">
                  <p className="text-xs font-semibold text-[#94a3b8] mb-3">
                    {chunks.length} chunks extracted
                  </p>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {chunks.map((chunk: any) => (
                      <div key={chunk.id} className="bg-[#111122] rounded-lg p-3 border border-[#2a2a4a] text-xs">
                        <div className="flex items-center gap-2 mb-1 text-[#64748b]">
                          <span>Chunk #{chunk.chunk_index + 1}</span>
                          <span>·</span>
                          <span>Page {chunk.page_number}</span>
                          <span>·</span>
                          <span>~{chunk.token_count} tokens</span>
                        </div>
                        <p className="text-[#94a3b8] line-clamp-3">{chunk.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setDeleteId(null)}>
          <div className="card max-w-sm w-full mx-4 border-red-500/30" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-[#e2e8f0] mb-2">Delete Document?</h3>
            <p className="text-sm text-[#64748b] mb-4">This will permanently delete the document and all its chunks.</p>
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
