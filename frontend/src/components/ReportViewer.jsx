import React, { useState, useEffect } from 'react';

// Custom lightweight high-fidelity markdown-to-HTML converter
function parseMarkdown(md) {
  if (!md) return '';
  
  let html = md;

  // Escape HTML entities to prevent XSS
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (```lang ... ```)
  html = html.replace(/```(?:[a-zA-Z0-9]+)?\n([\s\S]*?)\n```/g, (match, code) => {
    return `<pre><code>${code}</code></pre>`;
  });

  // Inline code (`code`)
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Blockquotes (> text)
  html = html.replace(/^\s*&gt;\s+(.*)$/gm, '<blockquote>$1</blockquote>');

  // Tables
  // Header: | col1 | col2 |
  // Separator: | --- | --- |
  // Row: | val1 | val2 |
  const lines = html.split('\n');
  let inTable = false;
  let tableRows = [];
  let parsedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      tableRows.push(line);
    } else {
      if (inTable) {
        // Parse tableRows into HTML Table
        const parsedTable = parseTableHTML(tableRows);
        parsedLines.push(parsedTable);
        inTable = false;
        tableRows = [];
      }
      parsedLines.push(lines[i]);
    }
  }
  if (inTable) {
    parsedLines.push(parseTableHTML(tableRows));
  }
  html = parsedLines.join('\n');

  // Headers (# H1, ## H2, ### H3)
  html = html.replace(/^\s*#\s+(.*)$/gm, '<h1>$1</h1>');
  html = html.replace(/^\s*##\s+(.*)$/gm, '<h2>$1</h2>');
  html = html.replace(/^\s*###\s+(.*)$/gm, '<h3>$1</h3>');

  // Bullet Lists (* or -)
  html = html.replace(/^\s*[-*]\s+(.*)$/gm, '<li>$1</li>');
  // Wrap consecutive <li> elements in <ul>
  html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
  // Fix nested double <ul> tags
  html = html.replace(/<\/ul>\s*<ul>/g, '');

  // Bold (**text**)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italics (*text*)
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Paragraphs (double newlines, except around structured tags)
  html = html.replace(/\n\n([^<]+)\n\n/g, '<p>$1</p>');

  // Clean trailing empty lines
  return html;
}

function parseTableHTML(rows) {
  if (rows.length < 1) return '';
  
  let html = '<table>';
  
  // Parse Headers
  const headers = rows[0]
    .split('|')
    .slice(1, -1)
    .map(h => h.trim());
    
  html += '<thead><tr>';
  headers.forEach(h => {
    html += `<th>${h}</th>`;
  });
  html += '</tr></thead><tbody>';

  // Parse Rows (skip header row, and separator row usually containing ---)
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r].trim();
    if (row.includes('---')) continue; // Skip separator line
    
    const cols = row
      .split('|')
      .slice(1, -1)
      .map(c => c.trim());
      
    if (cols.length === 0) continue;
    
    html += '<tr>';
    cols.forEach(c => {
      // Inline formatting for table cells
      let cellHtml = c.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      cellHtml = cellHtml.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      html += `<td>${cellHtml}</td>`;
    });
    html += '</tr>';
  }
  
  html += '</tbody></table>';
  return html;
}

export default function ReportViewer() {
  const [reports, setReports] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [selectedContent, setSelectedContent] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async (selectFirst = true) => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/reports');
      if (res.ok) {
        const data = await res.json();
        setReports(data);
        if (selectFirst && data.length > 0) {
          handleSelectReport(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    }
  };

  const handleSelectReport = async (id) => {
    setSelectedReportId(id);
    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/reports/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedContent(data);
      }
    } catch (err) {
      console.error('Failed to fetch report content:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this competitive intelligence report?')) {
      return;
    }

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/reports/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const updated = reports.filter(r => r.id !== id);
        setReports(updated);
        if (selectedReportId === id) {
          if (updated.length > 0) {
            handleSelectReport(updated[0].id);
          } else {
            setSelectedContent(null);
            setSelectedReportId(null);
          }
        }
      }
    } catch (err) {
      console.error('Failed to delete report:', err);
    }
  };

  const copyToClipboard = () => {
    if (selectedContent?.content) {
      navigator.clipboard.writeText(selectedContent.content);
      alert('Report copied to clipboard in raw markdown format!');
    }
  };

  const downloadReport = () => {
    if (selectedContent) {
      const element = document.createElement("a");
      const file = new Blob([selectedContent.content], {type: 'text/markdown'});
      element.href = URL.createObjectURL(file);
      element.download = selectedContent.id;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem', height: 'calc(100vh - 120px)', minHeight: '500px' }}>
      
      {/* Reports Sidebar List */}
      <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary)', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem' }}>
          Intelligence Briefs ({reports.length})
        </h2>
        {reports.length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            No reports compiled yet. Launch a multi-agent run to generate market briefings.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {reports.map((r) => {
              const active = r.id === selectedReportId;
              return (
                <div
                  key={r.id}
                  onClick={() => handleSelectReport(r.id)}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    background: active ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border-glass)'}`,
                    transition: 'var(--transition-smooth)',
                    position: 'relative'
                  }}
                >
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff', paddingRight: '1.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.title}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{new Date(r.created_at).toLocaleDateString()}</span>
                    <span>{(r.size_bytes / 1024).toFixed(1)} KB</span>
                  </div>
                  <button
                    onClick={(e) => handleDelete(r.id, e)}
                    style={{
                      position: 'absolute',
                      top: '0.75rem',
                      right: '0.75rem',
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-text-muted)',
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                    title="Delete Report"
                  >
                    🗑️
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Content Viewer Panel */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-glass)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'flow-line 1s linear infinite' }} />
            <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Retrieving report content...</span>
          </div>
        ) : selectedContent ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header Toolbar */}
            <div style={{ padding: '1rem 2rem', background: 'rgba(0, 0, 0, 0.2)', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                  {reports.find(r => r.id === selectedReportId)?.title || "Report Viewer"}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  ID: {selectedContent.id}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={copyToClipboard} style={toolbarButtonStyle}>
                  📋 Copy Markdown
                </button>
                <button onClick={downloadReport} style={{ ...toolbarButtonStyle, background: 'linear-gradient(to right, var(--color-primary), var(--color-secondary))', color: '#fff', border: 'none' }}>
                  📥 Download Report
                </button>
              </div>
            </div>
            {/* Scroller Area */}
            <div style={{ flex: 1, padding: '2.5rem', overflowY: 'auto' }}>
              <div
                className="markdown-body"
                dangerouslySetInnerHTML={{ __html: parseMarkdown(selectedContent.content) }}
              />
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: 'var(--color-text-muted)' }}>
            <span style={{ fontSize: '3rem' }}>📄</span>
            <span style={{ fontSize: '0.95rem' }}>Select an intelligence report from the left sidebar to render it.</span>
          </div>
        )}
      </div>
    </div>
  );
}

const toolbarButtonStyle = {
  padding: '0.5rem 1rem',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid var(--border-glass)',
  borderRadius: '6px',
  color: 'var(--color-text-main)',
  fontSize: '0.82rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'var(--transition-smooth)'
};
