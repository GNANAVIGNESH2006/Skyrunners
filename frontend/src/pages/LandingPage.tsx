import { useNavigate } from 'react-router-dom';
import {
  Zap, BookOpen, Shield, FileSearch, ArrowRight, MessageSquare,
  CheckCircle, XCircle, ChevronRight, Database, Brain, Layers,
} from 'lucide-react';

const features = [
  {
    icon: BookOpen,
    title: 'Document Grounded',
    desc: 'Answers are derived exclusively from your uploaded documents — no external knowledge.',
  },
  {
    icon: Shield,
    title: 'No Hallucinations',
    desc: 'When information is not in the documents, the AI clearly says "I don\'t know" instead of guessing.',
  },
  {
    icon: FileSearch,
    title: 'Source Citations',
    desc: 'Every answer references the exact document, page, and passage it came from.',
  },
  {
    icon: Database,
    title: 'Semantic Search',
    desc: 'Powered by vector embeddings and cosine similarity for intelligent retrieval.',
  },
  {
    icon: Brain,
    title: 'Context Aware',
    desc: 'Understands follow-up questions using conversation history for natural dialogue.',
  },
  {
    icon: Layers,
    title: 'Multi-Document',
    desc: 'Organize documents into knowledge bases. Ask questions across multiple documents at once.',
  },
];

const steps = [
  { num: '01', title: 'Upload Documents', desc: 'Upload PDFs, DOCX, TXT, or Markdown files to your knowledge base.' },
  { num: '02', title: 'AI Processing',    desc: 'Documents are chunked, embedded, and indexed for semantic search.' },
  { num: '03', title: 'Ask Questions',    desc: 'Ask natural language questions about your documents.' },
  { num: '04', title: 'Grounded Answers', desc: 'Get accurate answers with source citations — never hallucinated facts.' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0a14] text-[#e2e8f0] overflow-x-hidden">
      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav className="border-b border-[#2a2a4a] px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-bold text-base">KnowBase AI</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/dashboard')}
            className="btn-ghost text-sm"
          >
            Dashboard
          </button>
          <button
            onClick={() => navigate('/app/chat')}
            className="btn-primary text-sm"
          >
            Start Asking <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pt-24 pb-20 text-center relative">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-brand-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 text-brand-400 text-xs font-medium mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
            Hackathon Demo — Grounded AI
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-5 leading-tight">
            <span className="gradient-text">Ask Your Documents.</span>
            <br />
            <span className="text-[#e2e8f0]">Get Grounded Answers.</span>
          </h1>

          <p className="text-lg text-[#94a3b8] max-w-2xl mx-auto mb-8 leading-relaxed">
            KnowBase AI answers your questions using <em>only</em> the documents you upload.
            No hallucinations. Every answer cites its source. When information isn't available,
            the AI clearly says so.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/app/chat')}
              className="btn-primary text-base px-6 py-3 glow-purple-sm"
              id="hero-start-asking-btn"
            >
              <MessageSquare size={16} />
              Start Asking
            </button>
            <button
              onClick={() => navigate('/app/documents')}
              className="btn-secondary text-base px-6 py-3"
              id="hero-upload-btn"
            >
              <BookOpen size={16} />
              Upload Knowledge Base
            </button>
          </div>
        </div>
      </section>

      {/* ── Hallucination Demo Preview ────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Supported question */}
          <div className="card border-green-500/20 bg-green-500/5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={16} className="text-green-400" />
              <span className="text-sm font-semibold text-green-400">Supported Question</span>
            </div>
            <div className="bg-[#111122] rounded-lg p-3 mb-3 border border-[#2a2a4a]">
              <p className="text-xs text-[#94a3b8] mb-1">Question</p>
              <p className="text-sm text-[#e2e8f0]">"What is the minimum attendance requirement?"</p>
            </div>
            <div className="bg-[#111122] rounded-lg p-3 border border-[#2a2a4a]">
              <p className="text-xs text-[#94a3b8] mb-1">Answer</p>
              <p className="text-sm text-[#e2e8f0]">Students are required to maintain a minimum attendance of <strong>75%</strong> in each subject per semester.</p>
              <div className="mt-2 pt-2 border-t border-[#2a2a4a]">
                <p className="text-xs text-[#64748b]">📄 Attendance_Policy.txt · Page 1</p>
              </div>
            </div>
          </div>

          {/* Unsupported question */}
          <div className="card border-red-500/20 bg-red-500/5">
            <div className="flex items-center gap-2 mb-3">
              <XCircle size={16} className="text-red-400" />
              <span className="text-sm font-semibold text-red-400">Unsupported Question</span>
            </div>
            <div className="bg-[#111122] rounded-lg p-3 mb-3 border border-[#2a2a4a]">
              <p className="text-xs text-[#94a3b8] mb-1">Question</p>
              <p className="text-sm text-[#e2e8f0]">"What is the university's international scholarship amount?"</p>
            </div>
            <div className="bg-[#111122] rounded-lg p-3 border border-[#2a2a4a]">
              <p className="text-xs text-[#94a3b8] mb-1">Answer</p>
              <p className="text-sm text-[#e2e8f0]">I couldn't find this information in the provided documents.</p>
              <div className="mt-2 pt-2 border-t border-[#2a2a4a]">
                <p className="text-xs text-red-400/70">❌ No relevant content found — AI correctly refuses to answer</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Built for Accuracy, Not Impressiveness</h2>
          <p className="text-[#94a3b8] max-w-xl mx-auto">
            Every design decision prioritizes factual accuracy over confident-sounding answers.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card-hover">
              <div className="w-10 h-10 bg-brand-500/10 rounded-lg flex items-center justify-center mb-4 border border-brand-500/20">
                <Icon size={18} className="text-brand-400" />
              </div>
              <h3 className="font-semibold text-[#e2e8f0] mb-2">{title}</h3>
              <p className="text-sm text-[#64748b] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">How It Works</h2>
          <p className="text-[#94a3b8]">RAG pipeline — Retrieval Augmented Generation</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map(({ num, title, desc }, i) => (
            <div key={num} className="relative">
              <div className="card text-center">
                <div className="text-3xl font-black gradient-text mb-3">{num}</div>
                <h3 className="font-semibold text-[#e2e8f0] mb-2">{title}</h3>
                <p className="text-sm text-[#64748b]">{desc}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden lg:flex absolute top-1/2 -right-3 -translate-y-1/2 z-10">
                  <ChevronRight size={16} className="text-[#2a2a4a]" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-24 text-center">
        <div className="card glow-purple border-brand-500/30 bg-gradient-to-b from-brand-500/5 to-transparent p-10">
          <h2 className="text-3xl font-bold mb-4">Ready to ask your documents?</h2>
          <p className="text-[#94a3b8] mb-8">
            A demo knowledge base is pre-loaded. Start asking questions immediately — no setup required.
          </p>
          <button
            onClick={() => navigate('/app/chat')}
            className="btn-primary text-base px-8 py-3 glow-purple-sm"
            id="cta-start-btn"
          >
            <MessageSquare size={16} />
            Open AI Assistant
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#2a2a4a] px-6 py-6 text-center text-xs text-[#64748b]">
        <p>KnowBase AI — Hackathon Demo · DEMO DATA only · Does not represent any real institution</p>
      </footer>
    </div>
  );
}

