import { useLocation } from 'react-router-dom';
import { Bell, User } from 'lucide-react';

const routeTitles: Record<string, { title: string; subtitle: string }> = {
  '/app/dashboard':       { title: 'Dashboard',        subtitle: 'Overview of your knowledge bases' },
  '/app/knowledge-bases': { title: 'Knowledge Bases',  subtitle: 'Manage your document collections' },
  '/app/documents':       { title: 'Documents',         subtitle: 'Upload and manage documents' },
  '/app/chat':            { title: 'AI Assistant',      subtitle: 'Ask questions about your documents' },
  '/app/search':          { title: 'Semantic Search',   subtitle: 'Search across your knowledge base' },
  '/app/analytics':       { title: 'Analytics',         subtitle: 'Insights into your knowledge usage' },
  '/app/settings':        { title: 'Settings',          subtitle: 'Configure your KnowBase AI' },
};

export default function TopBar() {
  const location = useLocation();
  const info = routeTitles[location.pathname] ?? { title: 'KnowBase AI', subtitle: '' };

  return (
    <header className="bg-[#0d0d1f] border-b border-[#2a2a4a] px-6 py-4 flex items-center justify-between flex-shrink-0">
      <div>
        <h1 className="text-base font-semibold text-[#e2e8f0]">{info.title}</h1>
        {info.subtitle && <p className="text-xs text-[#64748b] mt-0.5">{info.subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button className="relative btn-ghost p-2">
          <Bell size={16} />
        </button>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1e1e36] border border-[#2a2a4a]">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
            <User size={12} className="text-white" />
          </div>
          <span className="text-xs font-medium text-[#e2e8f0]">Demo User</span>
        </div>
      </div>
    </header>
  );
}
