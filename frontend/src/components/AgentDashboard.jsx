import React, { useState, useRef, useEffect } from 'react';

export default function AgentDashboard({ onNavigateToReports }) {
  const [niche, setNiche] = useState('AI Code Editors');
  const [competitorsInput, setCompetitorsInput] = useState('Cursor, Windsurf, GitHub Copilot');
  const [running, setRunning] = useState(false);
  
  // Real-time agent statuses
  const [agentStates, setAgentStates] = useState({
    researcher: 'idle', // 'idle' | 'active' | 'success'
    critic: 'idle',
    writer: 'idle'
  });

  const [logs, setLogs] = useState([]);
  const [researchFindings, setResearchFindings] = useState('');
  const [criticAuditLog, setCriticAuditLog] = useState('');
  const [finalReportFilename, setFinalReportFilename] = useState('');
  
  const terminalEndRef = useRef(null);

  useEffect(() => {
    // Scroll terminal to bottom
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const addLog = (agent, type, text) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { time, agent, type, text }]);
  };

  const handleStartAnalysis = async (e) => {
    e.preventDefault();
    if (running) return;

    const competitors = competitorsInput
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0);

    if (competitors.length === 0) {
      alert('Please specify at least one competitor.');
      return;
    }

    setRunning(true);
    setLogs([]);
    setResearchFindings('');
    setCriticAuditLog('');
    setFinalReportFilename('');
    setAgentStates({ researcher: 'idle', critic: 'idle', writer: 'idle' });

    addLog('orchestrator', 'started', `Initializing pipeline for niche: '${niche}'`);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche, competitors })
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      // Stream chunks using standard Fetch response reader
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Save the incomplete line back into the buffer
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const payload = JSON.parse(trimmed.slice(6));
              const { agent, status, message, data } = payload;

              // 1. Add item to terminal logs
              addLog(agent, status, message);

              // 2. Drive agent node visual states
              if (agent === 'researcher') {
                if (status === 'started') setAgentStates(prev => ({ ...prev, researcher: 'active' }));
                if (status === 'completed') {
                  setAgentStates(prev => ({ ...prev, researcher: 'success' }));
                  if (data?.findings) setResearchFindings(data.findings);
                }
              }
              if (agent === 'critic') {
                if (status === 'started') setAgentStates(prev => ({ ...prev, critic: 'active' }));
                if (status === 'progress' && data?.audit_log) {
                  setCriticAuditLog(data.audit_log);
                }
                if (status === 'completed') setAgentStates(prev => ({ ...prev, critic: 'success' }));
              }
              if (agent === 'writer') {
                if (status === 'started') setAgentStates(prev => ({ ...prev, writer: 'active' }));
                if (status === 'completed') {
                  setAgentStates(prev => ({ ...prev, writer: 'success' }));
                }
              }
              if (agent === 'orchestrator') {
                if (status === 'completed' && data?.filename) {
                  setFinalReportFilename(data.filename);
                }
              }

            } catch (err) {
              console.error('Error parsing SSE json line:', err, trimmed);
            }
          }
        }
      }

      addLog('orchestrator', 'success', 'All agents successfully concluded their operations.');

    } catch (err) {
      addLog('orchestrator', 'error', `Execution failed: ${err.message}`);
      setAgentStates({ researcher: 'error', critic: 'error', writer: 'error' });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '2rem', height: 'calc(100vh - 120px)', minHeight: '600px' }}>
      
      {/* Form Input Control */}
      <form onSubmit={handleStartAnalysis} className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', height: 'fit-content' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>Configure Campaign</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Target Market Niche</label>
          <input
            type="text"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            disabled={running}
            placeholder="e.g. AI Coding Assistants"
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Competitor Entities</label>
          <textarea
            value={competitorsInput}
            onChange={(e) => setCompetitorsInput(e.target.value)}
            disabled={running}
            placeholder="Cursor, Windsurf, GitHub Copilot"
            rows="3"
            style={{ ...inputStyle, resize: 'none', fontFamily: 'inherit' }}
          />
          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Separate names with commas.</span>
        </div>

        <button
          type="submit"
          disabled={running}
          style={{
            padding: '0.85rem 1.5rem',
            background: running ? 'rgba(255,255,255,0.05)' : 'linear-gradient(to right, var(--color-primary), var(--color-secondary))',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 700,
            cursor: running ? 'not-allowed' : 'pointer',
            boxShadow: running ? 'none' : 'var(--shadow-neon)',
            transition: 'var(--transition-smooth)'
          }}
        >
          {running ? 'Agents Operating...' : '🚀 Launch Multi-Agent Scan'}
        </button>

        {finalReportFilename && (
          <button
            type="button"
            onClick={onNavigateToReports}
            className="pulse-node-success"
            style={{
              padding: '0.85rem 1.5rem',
              background: 'rgba(16, 185, 129, 0.15)',
              color: 'var(--color-success)',
              border: '1px solid var(--color-success)',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'var(--transition-smooth)'
            }}
          >
            📄 Open Ingested Report
          </button>
        )}
      </form>

      {/* Main Execution Workspace */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', overflowY: 'auto', paddingRight: '0.5rem' }}>
        
        {/* Visual Graph Panel */}
        <div className="glass-panel" style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', minHeight: '230px', overflow: 'hidden' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', width: '100%', textAlign: 'left', marginBottom: '1.5rem', fontWeight: 600 }}>
            Interactive Multi-Agent Team Graph
          </h3>
          
          {/* Agent Nodes SVG Graph */}
          <div style={{ display: 'flex', width: '100%', justifyContent: 'space-around', alignItems: 'center', position: 'relative', zIndex: 2, flex: 1 }}>
            
            {/* Researcher */}
            <div className={`glass-panel ${agentStates.researcher === 'active' ? 'pulse-node-active' : agentStates.researcher === 'success' ? 'pulse-node-success' : ''}`} style={agentNodeStyle(agentStates.researcher)}>
              <span style={{ fontSize: '1.75rem' }}>🔍</span>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Researcher</div>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Web Crawler</span>
              <span style={statusLabelStyle(agentStates.researcher)}>
                {agentStates.researcher.toUpperCase()}
              </span>
            </div>

            {/* Glowing Flow SVG Wire 1 */}
            <svg style={{ position: 'absolute', top: '50%', left: '22%', width: '18%', height: '20px', zIndex: 1, pointerEvents: 'none' }}>
              <line x1="0" y1="10" x2="100%" y2="10" stroke={getWireColor(agentStates.researcher)} strokeWidth="3" />
              {agentStates.researcher === 'active' && (
                <line x1="0" y1="10" x2="100%" y2="10" stroke="var(--color-primary)" strokeWidth="3" className="animate-flow" />
              )}
            </svg>

            {/* Critic */}
            <div className={`glass-panel ${agentStates.critic === 'active' ? 'pulse-node-active' : agentStates.critic === 'success' ? 'pulse-node-success' : ''}`} style={agentNodeStyle(agentStates.critic)}>
              <span style={{ fontSize: '1.75rem' }}>⚖️</span>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Critic Auditor</div>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Deduplication DB</span>
              <span style={statusLabelStyle(agentStates.critic)}>
                {agentStates.critic.toUpperCase()}
              </span>
            </div>

            {/* Glowing Flow SVG Wire 2 */}
            <svg style={{ position: 'absolute', top: '50%', left: '57%', width: '18%', height: '20px', zIndex: 1, pointerEvents: 'none' }}>
              <line x1="0" y1="10" x2="100%" y2="10" stroke={getWireColor(agentStates.critic)} strokeWidth="3" />
              {agentStates.critic === 'active' && (
                <line x1="0" y1="10" x2="100%" y2="10" stroke="var(--color-primary)" strokeWidth="3" className="animate-flow" />
              )}
            </svg>

            {/* Writer */}
            <div className={`glass-panel ${agentStates.writer === 'active' ? 'pulse-node-active' : agentStates.writer === 'success' ? 'pulse-node-success' : ''}`} style={agentNodeStyle(agentStates.writer)}>
              <span style={{ fontSize: '1.75rem' }}>✍️</span>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Writer Agent</div>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Brief Compiler</span>
              <span style={statusLabelStyle(agentStates.writer)}>
                {agentStates.writer.toUpperCase()}
              </span>
            </div>

          </div>
        </div>

        {/* Live Terminal & Logs */}
        <div className="glass-panel" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', flex: 1, minHeight: '350px' }}>
          
          {/* Scroll Logs Terminal */}
          <div style={{ background: '#05060a', borderRadius: '12px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '0.75rem 1.25rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--color-secondary)', fontWeight: 700 }}>ENGINE_CONSOLE://ACTIVE_STREAM</span>
              <div style={{ display: 'flex', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: running ? 'var(--color-success)' : 'var(--color-text-muted)', display: 'inline-block' }} />
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-warning)', display: 'inline-block' }} />
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-error)', display: 'inline-block' }} />
              </div>
            </div>
            {/* Text Logs */}
            <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem', fontFamily: 'Fira Code, monospace', fontSize: '0.78rem' }}>
              {logs.length === 0 && (
                <div style={{ color: 'var(--color-text-muted)', padding: '2rem 1rem', textAlign: 'center' }}>
                  $ SYSTEM INACTIVE. TRIGGER WORKFLOW CAMPAIGN TO SPIN UP VIRTUAL CORE ENGINES.
                </div>
              )}
              {logs.map((log, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>[{log.time}]</span>
                    <span style={{ color: getAgentColor(log.agent), fontWeight: 700 }}>
                      [{log.agent.toUpperCase()}]
                    </span>
                    <span style={{
                      color: getStatusColor(log.type),
                      fontWeight: 700,
                      background: 'rgba(255,255,255,0.04)',
                      padding: '0.1rem 0.3rem',
                      borderRadius: '4px'
                    }}>
                      {log.type.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ color: '#e5e7eb', paddingLeft: '1rem', lineHeight: 1.4 }}>
                    &gt; {log.text}
                  </div>
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>
          </div>

          {/* Active Logs Artifact Viewer */}
          <div style={{ background: '#05060a', borderRadius: '12px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '0.75rem 1.25rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-glass)' }}>
              <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--color-primary)', fontWeight: 700 }}>ACTIVE_COMMITS_INSPECTOR</span>
            </div>
            <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.8rem' }}>
              {!researchFindings && !criticAuditLog && (
                <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '3rem 1rem' }}>
                  No active agent artifacts generated yet.
                </div>
              )}
              {researchFindings && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <h4 style={{ color: 'var(--color-secondary)', fontWeight: 700, borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.25rem' }}>
                    🔍 Researcher Agent Findings
                  </h4>
                  <pre style={{ whiteSpace: 'pre-wrap', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-glass)', fontSize: '0.72rem', color: '#d1d5db', fontFamily: 'Fira Code, monospace' }}>
                    {researchFindings}
                  </pre>
                </div>
              )}
              {criticAuditLog && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <h4 style={{ color: 'var(--color-success)', fontWeight: 700, borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.25rem' }}>
                    ⚖️ Critic De-duplication Log
                  </h4>
                  <pre style={{ whiteSpace: 'pre-wrap', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-glass)', fontSize: '0.72rem', color: '#d1d5db', fontFamily: 'Fira Code, monospace' }}>
                    {criticAuditLog}
                  </pre>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

const inputStyle = {
  padding: '0.75rem 1rem',
  background: 'rgba(0, 0, 0, 0.3)',
  border: '1px solid var(--border-glass)',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '0.9rem',
  outline: 'none',
  width: '100%',
  transition: 'var(--transition-smooth)'
};

const agentNodeStyle = (state) => {
  let border = 'var(--border-glass)';
  let shadow = 'none';
  if (state === 'active') {
    border = 'var(--color-primary)';
    shadow = 'var(--shadow-neon)';
  } else if (state === 'success') {
    border = 'var(--color-success)';
    shadow = 'var(--shadow-teal)';
  }
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '1.25rem',
    borderRadius: '14px',
    width: '140px',
    textAlign: 'center',
    zIndex: 2,
    borderColor: border,
    boxShadow: shadow,
    background: 'rgba(15, 17, 28, 0.95)'
  };
};

const statusLabelStyle = (state) => {
  let color = 'var(--color-text-muted)';
  if (state === 'active') color = 'var(--color-primary)';
  if (state === 'success') color = 'var(--color-success)';
  return {
    fontSize: '0.62rem',
    fontWeight: 800,
    marginTop: '0.4rem',
    padding: '0.15rem 0.4rem',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '6px',
    color
  };
};

function getWireColor(state) {
  if (state === 'active') return 'var(--color-primary)';
  if (state === 'success') return 'var(--color-success)';
  return 'var(--border-glass)';
}

function getAgentColor(agent) {
  switch (agent) {
    case 'researcher': return 'var(--color-secondary)';
    case 'critic': return 'var(--color-success)';
    case 'writer': return 'var(--color-primary)';
    default: return 'var(--color-text-muted)';
  }
}

function getStatusColor(type) {
  switch (type) {
    case 'started': return 'var(--color-primary)';
    case 'progress': return 'var(--color-secondary)';
    case 'completed': return 'var(--color-success)';
    case 'success': return 'var(--color-success)';
    case 'error': return 'var(--color-error)';
    default: return '#fff';
  }
}
