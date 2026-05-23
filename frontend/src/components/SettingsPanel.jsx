/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react';

export default function SettingsPanel() {
  const [keys, setKeys] = useState({
    GEMINI_API_KEY: '',
    OPENAI_API_KEY: '',
    TAVILY_API_KEY: ''
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [health, setHealth] = useState({ status: 'unknown', timestamp: '' });

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/settings');
      if (res.ok) {
        const data = await res.json();
        setKeys(data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  }, []);

  const checkBackendHealth = useCallback(async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/health');
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      } else {
        setHealth({ status: 'unhealthy', timestamp: '' });
      }
    } catch {
      setHealth({ status: 'offline', timestamp: '' });
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    checkBackendHealth();
  }, [fetchSettings, checkBackendHealth]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setKeys((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const res = await fetch('http://127.0.0.1:8000/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(keys)
      });
      if (res.ok) {
        setStatus({ type: 'success', message: 'API keys updated successfully!' });
        fetchSettings(); // Refresh keys display
      } else {
        setStatus({ type: 'error', message: 'Failed to update settings.' });
      }
    } catch {
      setStatus({ type: 'error', message: 'Could not connect to backend server.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', background: 'linear-gradient(to right, #fff, #9ca3af)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          System Settings & Integrations
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          Configure your cognitive engine credentials. If no keys are specified, the system executes in high-fidelity simulated demo mode.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* Keys Form Panel */}
        <form onSubmit={handleSave} className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>API Configurations</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
              Google Gemini API Key
            </label>
            <input
              type="password"
              name="GEMINI_API_KEY"
              value={keys.GEMINI_API_KEY}
              onChange={handleInputChange}
              placeholder={keys.GEMINI_API_KEY ? "••••••••••••••••" : "Enter Gemini API Key"}
              style={{ padding: '0.75rem 1rem', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Primary engine model used for agent reasoning and report formatting.
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
              OpenAI API Key (Secondary / Fallback)
            </label>
            <input
              type="password"
              name="OPENAI_API_KEY"
              value={keys.OPENAI_API_KEY}
              onChange={handleInputChange}
              placeholder={keys.OPENAI_API_KEY ? "••••••••••••••••" : "Enter OpenAI API Key"}
              style={{ padding: '0.75rem 1rem', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
              Tavily API Key (Market Search)
            </label>
            <input
              type="password"
              name="TAVILY_API_KEY"
              value={keys.TAVILY_API_KEY}
              onChange={handleInputChange}
              placeholder={keys.TAVILY_API_KEY ? "••••••••••••••••" : "Enter Tavily API Key"}
              style={{ padding: '0.75rem 1rem', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Enables structured competitive web crawling. If empty, DuckDuckGo search is utilized.
            </span>
          </div>

          {status.message && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              background: status.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
              border: `1px solid ${status.type === 'success' ? 'var(--color-success)' : 'var(--color-error)'}`,
              color: status.type === 'success' ? 'var(--color-success)' : 'var(--color-error)'
            }}>
              {status.message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '0.85rem 1.5rem',
              background: 'linear-gradient(to right, var(--color-primary), var(--color-secondary))',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'var(--transition-smooth)'
            }}
          >
            {loading ? 'Saving Settings...' : 'Save Configurations'}
          </button>
        </form>

        {/* Health Diagnostic Panel */}
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', height: 'fit-content' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-secondary)' }}>System Diagnostics</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Backend Engine Status:</span>
              <span style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                padding: '0.25rem 0.6rem',
                borderRadius: '12px',
                background: health.status === 'healthy' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                color: health.status === 'healthy' ? 'var(--color-success)' : 'var(--color-error)',
                border: `1px solid ${health.status === 'healthy' ? 'var(--color-success)' : 'var(--color-error)'}`
              }}>
                {health.status.toUpperCase()}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Execution Mode:</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>
                {keys.GEMINI_API_KEY || keys.OPENAI_API_KEY ? '🔴 Live Production LLM' : '⚙️ Local Simulation Sandbox'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Search Provider:</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>
                {keys.TAVILY_API_KEY ? 'Tavily Search API' : 'DuckDuckGo Engine'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Database Ingestion:</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>
                Active (SQLite Persistent)
              </span>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button
              onClick={checkBackendHealth}
              style={{
                padding: '0.65rem 1rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-glass)',
                borderRadius: '8px',
                color: 'var(--color-text-main)',
                fontSize: '0.85rem',
                cursor: 'pointer',
                fontWeight: 500,
                textAlign: 'center'
              }}
            >
              Force Diagnostics Check
            </button>
            {health.timestamp && (
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                Last Checked: {new Date(health.timestamp).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
