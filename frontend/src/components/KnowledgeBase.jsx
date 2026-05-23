import React, { useState, useEffect } from 'react';

export default function KnowledgeBase() {
  const [facts, setFacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalFacts: 0,
    competitors: [],
    categories: {}
  });

  useEffect(() => {
    loadFacts();
  }, []);

  const loadFacts = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/facts');
      if (res.ok) {
        const data = await res.json();
        setFacts(data);
        calculateStats(data);
      }
    } catch (err) {
      console.error('Failed to load facts:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const comps = [...new Set(data.map(f => f.competitor))];
    const cats = {};
    data.forEach(f => {
      cats[f.category] = (cats[f.category] || 0) + 1;
    });
    setStats({
      totalFacts: data.length,
      competitors: comps,
      categories: cats
    });
  };

  const handleSearchSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      loadFacts();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/facts/search?query=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setFacts(data);
      }
    } catch (err) {
      console.error('Semantic search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearStore = async () => {
    if (!window.confirm('WARNING: Are you sure you want to permanently delete all ingested facts from the local vector database?')) {
      return;
    }
    try {
      const res = await fetch('http://127.0.0.1:8000/api/facts', { method: 'DELETE' });
      if (res.ok) {
        setFacts([]);
        setStats({ totalFacts: 0, competitors: [], categories: {} });
        alert('Local Vector Store cleared successfully.');
      }
    } catch (err) {
      console.error('Failed to clear database:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', background: 'linear-gradient(to right, #fff, #9ca3af)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Vector Knowledge Base
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
            Browse and semantically query competitor insights ingested by the Critic Agent.
          </p>
        </div>
        <button
          onClick={handleClearStore}
          disabled={facts.length === 0}
          style={{
            padding: '0.6rem 1.25rem',
            background: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid var(--color-error)',
            color: 'var(--color-error)',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            opacity: facts.length === 0 ? 0.5 : 1,
            transition: 'var(--transition-smooth)'
          }}
        >
          🗑️ Clear Vector Database
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Archived Fact Units</span>
          <span style={{ fontSize: '2.25rem', fontWeight: 800, color: '#fff' }}>{stats.totalFacts}</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--color-success)' }}>● Persistent SQLite Store</span>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Active Competitors</span>
          <span style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>{stats.competitors.length}</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
            {stats.competitors.join(', ') || 'None Ingested'}
          </span>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Feature Ingestions</span>
          <span style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--color-secondary)' }}>{stats.categories.feature || 0}</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Pricing shifts: {stats.categories.pricing || 0}</span>
        </div>
      </div>

      {/* Search Input Section */}
      <form onSubmit={handleSearchSubmit} className="glass-panel" style={{ padding: '1rem 1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <span style={{ fontSize: '1.25rem' }}>🔍</span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Query the database semantically (e.g., 'Which competitor is transitioning to consumption credits?')"
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            color: '#fff',
            fontSize: '0.95rem'
          }}
        />
        <button
          type="submit"
          style={{
            padding: '0.5rem 1.25rem',
            background: 'rgba(99, 102, 241, 0.2)',
            border: '1px solid var(--color-primary)',
            color: '#fff',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.88rem',
            fontWeight: 600
          }}
        >
          Vector Search
        </button>
      </form>

      {/* Facts Grid Display */}
      {loading ? (
        <div style={{ padding: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-glass)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'flow-line 1s linear infinite' }} />
          <span style={{ color: 'var(--color-text-muted)' }}>Querying Vector Store...</span>
        </div>
      ) : facts.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '1rem' }}>📭</span>
          <h3>No competitive fact records found</h3>
          <p style={{ marginTop: '0.5rem', fontSize: '0.88rem' }}>Run a competitor scan to crawl updates, audit files, and populate the database.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {facts.map((fact) => (
            <div key={fact.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
              
              {/* Badge Area */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: 'var(--color-primary)',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(99, 102, 241, 0.3)'
                }}>
                  {fact.competitor.toUpperCase()}
                </span>
                
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: getCategoryBg(fact.category),
                  color: getCategoryColor(fact.category),
                  padding: '0.2rem 0.5rem',
                  borderRadius: '6px'
                }}>
                  {fact.category.toUpperCase()}
                </span>
              </div>

              {/* Content */}
              <p style={{ fontSize: '0.9rem', color: '#e5e7eb', lineHeight: 1.5, flex: 1 }}>
                {fact.content}
              </p>

              {/* Metadata / Citation */}
              <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {fact.similarity !== undefined && (
                  <div style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Semantic Match:</span>
                    <span style={{ color: 'var(--color-secondary)', fontWeight: 700 }}>{(fact.similarity * 100).toFixed(1)}%</span>
                  </div>
                )}
                <div style={{ fontSize: '0.72rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Credibility Rate:</span>
                  <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>{((fact.confidence || 0.9) * 100).toFixed(0)}%</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  🔗 Source: <a href={fact.source_url} target="_blank" rel="noreferrer" style={{ color: 'var(--color-secondary)', textDecoration: 'none' }}>
                    {fact.source_url}
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getCategoryBg(cat) {
  switch (cat) {
    case 'pricing': return 'rgba(245, 158, 11, 0.15)';
    case 'feature': return 'rgba(6, 182, 212, 0.15)';
    case 'technology': return 'rgba(16, 185, 129, 0.15)';
    default: return 'rgba(255, 255, 255, 0.05)';
  }
}

function getCategoryColor(cat) {
  switch (cat) {
    case 'pricing': return 'var(--color-warning)';
    case 'feature': return 'var(--color-secondary)';
    case 'technology': return 'var(--color-success)';
    default: return 'var(--color-text-muted)';
  }
}
