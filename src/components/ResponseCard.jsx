import React, { useState, useEffect } from 'react';

function getFavicon(url) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return null;
  }
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return 'source';
  }
}

export default function ResponseCard({ 
  summary, 
  sources = [], 
  onClose, 
  onFollowUp,
  onTextSubmit 
}) {
  const [displayedText, setDisplayedText] = useState('');
  const [isStreamingDone, setIsStreamingDone] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [copied, setCopied] = useState(false);

  // Word-by-word streaming effect
  useEffect(() => {
    if (!summary) return;
    const words = summary.split(' ');
    setDisplayedText('');
    setIsStreamingDone(false);
    let index = 0;

    const timer = setInterval(() => {
      index++;
      setDisplayedText(words.slice(0, index).join(' '));
      if (index >= words.length) {
        clearInterval(timer);
        setIsStreamingDone(true);
      }
    }, 35);

    return () => clearInterval(timer);
  }, [summary]);

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onTextSubmit(inputText);
    setInputText('');
  };

  const followUpPills = [
    "Tell me more details",
    "Key takeaways",
    "Explain simply"
  ];

  return (
    <div className="response-card-container">
      {/* Header Bar */}
      <div className="response-card-header">
        <div className="response-card-badge">
          <span className="badge-dot" />
          ADY INTELLIGENCE
        </div>
        <button 
          className="response-card-close" 
          onClick={onClose}
          title="Close card"
        >
          &times;
        </button>
      </div>

      {/* Response Text */}
      <div className="response-card-body">
        <p className="response-card-text">
          {displayedText}
          {!isStreamingDone && <span className="response-card-cursor" />}
        </p>
      </div>

      {/* Sources & Action Bar */}
      {isStreamingDone && (
        <div className="response-card-actions">
          {/* Left: Quick Actions */}
          <div className="response-card-btn-group">
            <button 
              className="response-icon-btn" 
              onClick={handleCopy} 
              title={copied ? "Copied!" : "Copy"}
            >
              {copied ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              )}
            </button>
          </div>

          {/* Right: Sources Toggle Badge */}
          {sources && sources.length > 0 && (
            <button 
              className="response-sources-toggle"
              onClick={() => setSourcesOpen(prev => !prev)}
            >
              <div className="sources-avatar-stack">
                {sources.slice(0, 3).map((s, idx) => (
                  <img key={idx} src={getFavicon(s.url)} alt="" className="source-avatar-img" />
                ))}
              </div>
              <span>{sources.length} sources</span>
              <svg 
                width="12" 
                height="12" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                style={{ transform: sourcesOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
              >
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Expandable Sources Drawer */}
      {isStreamingDone && sourcesOpen && sources.length > 0 && (
        <div className="response-sources-drawer">
          {sources.map((s, idx) => (
            <a key={idx} href={s.url} target="_blank" rel="noreferrer" className="response-source-card">
              <img src={getFavicon(s.url)} alt="" className="source-card-icon" />
              <div className="source-card-info">
                <span className="source-card-title">{s.title || getDomain(s.url)}</span>
                <span className="source-card-domain">{getDomain(s.url)}</span>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Follow-up Prompts Pills */}
      {isStreamingDone && (
        <div className="response-followup-pills">
          {followUpPills.map((pill, idx) => (
            <button 
              key={idx} 
              className="followup-pill-btn"
              onClick={() => onFollowUp && onFollowUp(pill)}
            >
              {pill}
            </button>
          ))}
        </div>
      )}

      {/* Follow-up Input Bar */}
      {isStreamingDone && (
        <form className="response-card-form" onSubmit={handleSubmit}>
          <input 
            type="text" 
            placeholder="Ask a follow-up question..." 
            value={inputText}
            onChange={e => setInputText(e.target.value)}
          />
          <button type="submit" className="form-submit-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </form>
      )}
    </div>
  );
}
