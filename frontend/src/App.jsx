import { useState } from 'react';
import AgentDashboard from './components/AgentDashboard';
import ReportViewer from './components/ReportViewer';
import KnowledgeBase from './components/KnowledgeBase';
import SettingsPanel from './components/SettingsPanel';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AgentDashboard onNavigateToReports={() => setActiveTab('reports')} />;
      case 'reports':
        return <ReportViewer />;
      case 'kb':
        return <KnowledgeBase />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return <AgentDashboard onNavigateToReports={() => setActiveTab('reports')} />;
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: '100vh', background: 'var(--bg-deep)' }}>
      {/* Sidebar Navigation */}
      <aside style={{
        background: 'rgba(15, 17, 28, 0.95)',
        borderRight: '1px solid var(--border-glass)',
        padding: '2rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '2.5rem',
        zIndex: 10
      }}>
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingLeft: '0.5rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1rem',
            color: '#fff',
            boxShadow: 'var(--shadow-neon)'
          }}>
            Ω
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', letterSpacing: '0.5px' }}>
              AGENCY ENGINE
            </span>
            <span style={{ fontSize: '0.62rem', color: 'var(--color-secondary)', fontWeight: 700, letterSpacing: '1px' }}>
              COMPETITIVE INTEL
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[
            { id: 'dashboard', label: 'Agent Workspace', icon: '🚀' },
            { id: 'reports', label: 'Briefing Center', icon: '📂' },
            { id: 'kb', label: 'Vector Store KB', icon: '🧠' },
            { id: 'settings', label: 'Credentials Config', icon: '⚙️' }
          ].map((tab) => {
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: active ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                  color: active ? '#fff' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  fontWeight: active ? 700 : 500,
                  fontSize: '0.85rem',
                  textAlign: 'left',
                  transition: 'var(--transition-smooth)',
                  borderLeft: active ? '3px solid var(--color-primary)' : '3px solid transparent'
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Diagnostic Meta Block */}
        <div className="glass-panel" style={{ marginTop: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
          <div style={{ fontWeight: 700, color: '#fff', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.4rem', marginBottom: '0.2rem' }}>
            System Metadata
          </div>
          <div>💻 OS: Windows (Native)</div>
          <div>⚙️ Engine: Node v24 + Python 3.13</div>
          <div style={{ color: 'var(--color-secondary)', fontWeight: 600 }}>● Sandbox Status: Online</div>
        </div>
      </aside>

      {/* Main Content Workspace Container */}
      <main style={{ padding: '2rem 3rem', display: 'flex', flexDirection: 'column', overflowY: 'auto', height: '100vh' }}>
        <div style={{ flex: 1 }}>
          {renderContent()}
        </div>
        
        {/* Sleek Footer */}
        <footer style={{
          marginTop: '2rem',
          borderTop: '1px solid var(--border-glass)',
          paddingTop: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
          color: 'var(--color-text-muted)'
        }}>
          <span>© 2026 Agency Engine Core Systems. Ingested under GRCh38 mapping architectures.</span>
          <div style={{ display: 'flex', gap: '1.25rem', fontWeight: 600 }}>
            <span>Local Time: 12:55 PM</span>
            <span style={{ color: 'var(--color-primary)' }}>v1.0.0 Stable</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
