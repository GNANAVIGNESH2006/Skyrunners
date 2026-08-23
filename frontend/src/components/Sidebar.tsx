import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, FileText, MessageSquare,
  Search, BarChart3, Settings, Zap, ChevronRight,
} from 'lucide-react';

const navItems = [
  { to: '/app/dashboard',       icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/knowledge-bases', icon: BookOpen,        label: 'Knowledge Bases' },
  { to: '/app/documents',       icon: FileText,        label: 'Documents' },
  { to: '/app/chat',            icon: MessageSquare,   label: 'AI Assistant' },
  { to: '/app/search',          icon: Search,          label: 'Search' },
  { to: '/app/analytics',       icon: BarChart3,       label: 'Analytics' },
  { to: '/app/settings',        icon: Settings,        label: 'Settings' },
];

export default function Sidebar() {
  const navigate = useNavigate();

  return (
    <div className="w-64 flex-shrink-0 bg-[#0d0d1f] border-r border-[#2a2a4a] flex flex-col">
      {/* Logo */}
      <div
        className="px-5 py-5 border-b border-[#2a2a4a] cursor-pointer"
        onClick={() => navigate('/')}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-[#e2e8f0]">KnowBase AI</div>
            <div className="text-[10px] text-[#64748b]">Knowledge Assistant</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider px-2 mb-3">
          Main Menu
        </div>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              isActive ? 'nav-item-active' : 'nav-item'
            }
          >
            <Icon size={16} className="flex-shrink-0" />
            <span className="flex-1">{label}</span>
            {/* Active indicator */}
          </NavLink>
        ))}
      </nav>

      {/* Bottom status */}
      <div className="px-4 py-4 border-t border-[#2a2a4a]">
        <div className="card p-3 text-xs">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            <span className="text-[#94a3b8] font-medium">System Online</span>
          </div>
          <div className="text-[#64748b]">Demo Knowledge Base loaded</div>
        </div>
      </div>
    </div>
  );
}
