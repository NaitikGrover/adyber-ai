import React from 'react';
import { ExternalLink, Globe } from 'lucide-react';

export function SourceCitations({ sources = [] }) {
  if (!sources || sources.length === 0) return null;

  return (
    <div style={{ width: '100%', marginTop: 8 }}>
      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
        <Globe size={11} color="#00d2ff" /> WEB SOURCES & CITATIONS
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 60, overflowY: 'auto' }}>
        {sources.map((src, idx) => (
          <a
            key={idx}
            href={src.url}
            target="_blank"
            rel="noopener noreferrer"
            title={src.snippet || src.url}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              background: 'rgba(0, 210, 255, 0.12)',
              border: '1px solid rgba(0, 210, 255, 0.3)',
              borderRadius: 8,
              padding: '3px 8px',
              color: '#00d2ff',
              fontSize: 11,
              textDecoration: 'none',
              transition: 'background 0.2s'
            }}
          >
            <span>[{idx + 1}] {src.title || 'Source'}</span>
            <ExternalLink size={10} />
          </a>
        ))}
      </div>
    </div>
  );
}
