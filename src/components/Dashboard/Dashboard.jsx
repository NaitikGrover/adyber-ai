import React, { useState, useEffect, useRef } from 'react';
import logoImg from '/logo.png';
import { saveUserDataToFirebase } from '../../firebase';

const C = {
  bg:         '#0b0b0b',
  surface:    '#141414',
  surfaceAlt: '#1c1c1c',
  border:     '#2e2e2e',
  borderAlt:  '#262626',
  text:       '#ffffff',
  textSub:    '#888888',
  textMuted:  '#555555',
  accent:     '#ffffff',
  danger:     '#f87171',
  dangerBg:   '#2a0a0a',
  dangerBdr:  '#5c1a1a',
};

const inputBase = {
  width: '100%',
  height: 56,
  background: C.surface,
  border: '1px solid #2e2e2e',
  borderRadius: 12,
  padding: '0 20px',
  color: C.text,
  fontSize: 14,
  outline: 'none',
  transition: 'border-color 0.2s',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  display: 'block',
};
const textareaBase = {
  ...inputBase,
  height: 96,
  resize: 'none',
  padding: '14px 20px',
  lineHeight: 1.5,
};
const selectBase = {
  ...inputBase,
  cursor: 'pointer',
  appearance: 'none',
  WebkitAppearance: 'none',
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 16px center',
  paddingRight: 40,
};

function FocusInput({ style, as: Tag = 'input', children, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <Tag
      {...props}
      style={{ ...style, borderColor: focused ? '#ffffff' : '#2e2e2e' }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      {children}
    </Tag>
  );
}

const Label = ({ children }) => (
  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.textSub, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.7px' }}>
    {children}
  </label>
);

const Field = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column' }}>
    {label && <Label>{label}</Label>}
    {children}
  </div>
);

const PrimaryBtn = ({ onClick, children, danger = false }) => (
  <button
    onClick={onClick}
    style={{ height: 44, padding: '0 24px', borderRadius: 12, background: danger ? C.dangerBg : C.accent, border: danger ? ('1px solid ' + C.dangerBdr) : 'none', color: danger ? C.danger : '#000', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'opacity 0.15s', fontFamily: 'inherit' }}
    onMouseEnter={e => { e.currentTarget.style.opacity = '0.82'; }}
    onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
  >
    {children}
  </button>
);

const StatusLabel = ({ status, okMsg = 'Saved!' }) => {
  if (status === 'saving') return <span style={{ color: C.textSub, fontSize: 11 }}>Saving…</span>;
  if (status === 'ok')     return <span style={{ color: '#34d399', fontSize: 11 }}>✓ {okMsg}</span>;
  if (status === 'err')    return <span style={{ color: C.danger, fontSize: 11 }}>Something went wrong</span>;
  return null;
};

const Card = ({ children }) => (
  <div style={{ background: C.surfaceAlt, border: ('1px solid ' + C.borderAlt), borderRadius: 16, padding: 24 }}>
    {children}
  </div>
);

export default function Dashboard({ user, onClose, onResetOnboarding, onLogout }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [name, setName]               = useState('');
  const [email, setEmail]             = useState('');
  const [profileDesc, setProfileDesc] = useState('');
  const [language, setLanguage]       = useState('English');
  const [autoClosePanel, setAutoClosePanel] = useState(false);
  const [saveStatus, setSaveStatus]   = useState('');
  const [shortcutKey, setShortcutKey] = useState('Ctrl+Shift');
  const [keyStatus, setKeyStatus]     = useState('');
  const [apiMode, setApiMode]             = useState('free_key');
  const [apiProvider, setApiProvider]     = useState('nvidia');
  const [selectedModel, setSelectedModel] = useState('meta/llama-3.1-8b-instruct');
  const [geminiKey, setGeminiKey]         = useState('');
  const [openaiKey, setOpenaiKey]         = useState('');
  const [groqKey, setGroqKey]             = useState('');
  const [nvidiaKey, setNvidiaKey]         = useState('');
  const [ollamaUrl, setOllamaUrl]         = useState('http://localhost:11434');
  const [engineStatus, setEngineStatus]   = useState('');
  const [memoryStatus, setMemoryStatus]   = useState('');
  const [memoryData, setMemoryData]       = useState(null);

  // ── Profile Settings Popover ──────────────────────────────────────────────
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    }
    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileMenu]);

  // ── Auto-Updater state ────────────────────────────────────────────────────
  const [appVersion, setAppVersion]       = useState('...');
  const [updateStatus, setUpdateStatus]   = useState('idle');
  const [updateInfo, setUpdateInfo]       = useState(null);
  const [updateErrorMsg, setUpdateErrorMsg] = useState('');
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Load real app version from Electron
  useEffect(() => {
    window.electronAPI?.getAppVersion?.().then(v => {
      if (v) setAppVersion(v);
    }).catch(() => setAppVersion('1.0.0'));
  }, []);

  useEffect(() => {
    if (activeTab === 'memory') {
      const loadMemory = () => {
        fetch('http://localhost:8000/memory')
          .then(r => r.json())
          .then(data => setMemoryData(data))
          .catch(() => {});
      };
      loadMemory();
      const interval = setInterval(loadMemory, 2000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  useEffect(() => {
    if (window.electronAPI?.setOnboardingMode) window.electronAPI.setOnboardingMode();
    setName(user?.name || user?.username || '');
    setEmail(user?.userEmail || user?.email || '');
    setProfileDesc(user?.profileDescription || '');
    setLanguage(user?.language || 'English');
    fetch('http://localhost:8000/settings').then(r => r.json()).then(s => {
      if (s.hotkey)             setShortcutKey(s.hotkey);
      if (s.auto_close_panel !== undefined) setAutoClosePanel(s.auto_close_panel);
      if (s.mode)               setApiMode(s.mode);
      if (s.provider)           setApiProvider(s.provider);
      if (s.model)              setSelectedModel(s.model);
      if (s.gemini_api_key)     setGeminiKey(s.gemini_api_key);
      if (s.openai_api_key)     setOpenaiKey(s.openai_api_key);
      if (s.groq_api_key)       setGroqKey(s.groq_api_key);
      if (s.nvidia_api_key)     setNvidiaKey(s.nvidia_api_key);
      if (s.ollama_url)         setOllamaUrl(s.ollama_url);
    }).catch(() => {});
  }, [user]);

  // Subscribe to auto-updater IPC events from Electron main process
  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    const cleanupFns = [
      api.onUpdateAvailable?.((data) => {
        setUpdateInfo(data);
        setUpdateStatus('available');
      }),
      api.onUpdateNotAvailable?.(() => {
        setUpdateStatus('up-to-date');
        setTimeout(() => setUpdateStatus('idle'), 4000);
      }),
      api.onDownloadProgress?.((data) => {
        setDownloadProgress(data.percent || 0);
        setUpdateStatus('downloading');
      }),
      api.onUpdateDownloaded?.((data) => {
        setUpdateInfo(prev => ({ ...prev, ...data }));
        setUpdateStatus('downloaded');
        setDownloadProgress(100);
      }),
      api.onUpdateError?.((data) => {
        console.error('[Update Error]', data?.message);
        setUpdateErrorMsg(data?.message || 'Update check failed');
        setUpdateStatus('error');
        setTimeout(() => setUpdateStatus('idle'), 6000);
      }),
    ].filter(Boolean);

    return () => cleanupFns.forEach(fn => typeof fn === 'function' && fn());
  }, []);

  const handleSaveProfile = async () => {
    setSaveStatus('saving');
    try {
      await fetch('http://localhost:8000/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ auto_close_panel: autoClosePanel }) });
      await fetch('http://localhost:8000/save-onboarding-profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: name, name, profileDescription: profileDesc, language, shortcutKey }) });
      const saved = JSON.parse(localStorage.getItem('ady_user') || '{}');
      localStorage.setItem('ady_user', JSON.stringify({ ...saved, name, username: name, profileDescription: profileDesc, language }));
      if (user?.uid) {
        saveUserDataToFirebase(user.uid, {
          onboarded: true,
          profile: { name, username: name, profileDescription: profileDesc, language, shortcutKey },
          settings: { auto_close_panel: autoClosePanel },
          memory: { user_name: name, ai_name: 'Ady', facts: { 'User Profile/About': profileDesc || '' } }
        });
      }
      setSaveStatus('ok');
    } catch { setSaveStatus('err'); }
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const handleSaveShortcut = async (key) => {
    setShortcutKey(key); setKeyStatus('saving');
    try {
      await fetch('http://localhost:8000/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hotkey: key }) });
      if (user?.uid) saveUserDataToFirebase(user.uid, { settings: { hotkey: key } });
      setKeyStatus('ok');
    } catch { setKeyStatus('err'); }
    setTimeout(() => setKeyStatus(''), 3000);
  };

  const handleSaveEngine = async () => {
    setEngineStatus('saving');
    try {
      const payload = {
        mode: apiMode,
        provider: apiProvider,
        model: selectedModel,
        gemini_api_key: geminiKey,
        openai_api_key: openaiKey,
        groq_api_key: groqKey,
        nvidia_api_key: nvidiaKey,
        ollama_url: ollamaUrl,
        ollama_model: selectedModel || 'llama3'
      };
      await fetch('http://localhost:8000/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (user?.uid) saveUserDataToFirebase(user.uid, { settings: payload });
      setEngineStatus('ok');
    } catch { setEngineStatus('err'); }
    setTimeout(() => setEngineStatus(''), 3000);
  };

  const handleResetEngine = async () => {
    setEngineStatus('saving');
    setGeminiKey('');
    setOpenaiKey('');
    setGroqKey('');
    setNvidiaKey('');
    setApiMode('free_key');
    setApiProvider('nvidia');
    setSelectedModel('meta/llama-3.1-8b-instruct');

    const resetPayload = {
      mode: 'free_key',
      provider: 'nvidia',
      model: 'meta/llama-3.1-8b-instruct',
      gemini_api_key: '',
      openai_api_key: '',
      groq_api_key: '',
      nvidia_api_key: '',
      ollama_url: 'http://localhost:11434',
      ollama_model: 'llama3'
    };

    try {
      await fetch('http://localhost:8000/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resetPayload)
      });
      if (user?.uid) saveUserDataToFirebase(user.uid, { settings: resetPayload });
      setEngineStatus('reset_ok');
    } catch { setEngineStatus('err'); }
    setTimeout(() => setEngineStatus(''), 3000);
  };

  const handleWipeMemory = async () => {
    setMemoryStatus('saving');
    try {
      await fetch('http://localhost:8000/clear-memory', { method: 'POST' });
      if (user?.uid) saveUserDataToFirebase(user.uid, { memory: { user_name: name, ai_name: 'Ady', facts: {}, conversation_history: [] } });
      setMemoryStatus('ok');
    } catch { setMemoryStatus('err'); }
    setTimeout(() => setMemoryStatus(''), 4000);
  };

  const handleClearHistory = async () => {
    try {
      await fetch('http://localhost:8000/memory/history', { method: 'DELETE' });
      setMemoryData(prev => ({ ...prev, conversation_history: [] }));
      if (user?.uid && memoryData) {
        saveUserDataToFirebase(user.uid, { memory: { ...memoryData, conversation_history: [] } });
      }
    } catch {}
  };

  const handleDeleteChat = async (index) => {
    try {
      await fetch(`http://localhost:8000/memory/history/${index}`, { method: 'DELETE' });
      setMemoryData(prev => {
        const newHistory = [...prev.conversation_history];
        newHistory.splice(index, 1);
        const newData = { ...prev, conversation_history: newHistory };
        if (user?.uid) saveUserDataToFirebase(user.uid, { memory: newData });
        return newData;
      });
    } catch {}
  };

  const navItems = [
    { id: 'profile', label: 'Profile & Persona',  accent: '#34d399', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/> },
    { id: 'hotkey',  label: 'Shortcut Keys',       accent: '#60a5fa', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 0121 9z"/> },
    { id: 'engine',  label: 'AI Engine & Models',  accent: '#c084fc', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M13 10V3L4 14h7v7l9-11h-7z"/> },
    { id: 'memory',  label: 'AI Memory',            accent: '#fb923c', icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></> },
    { id: 'updates', label: 'App Updates',          accent: '#38bdf8', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/> },
  ];

  return (
    <div style={{ width: '100vw', height: '100vh', background: C.bg, display: 'flex', color: C.text, fontFamily: "'Inter', system-ui, sans-serif", overflow: 'hidden', position: 'relative' }}>

      {/* Floating Window Controls (Top-Right, Seamless without border line) */}
      <div style={{ position: 'absolute', top: 14, right: 20, display: 'flex', gap: 16, zIndex: 100, WebkitAppRegion: 'no-drag' }}>
        {[
          { fn: () => window.electronAPI?.windowMinimize(), d: 'M20 12H4', hover: '#fff' },
          { fn: () => window.electronAPI?.windowMaximize(), d: 'M4 4h16v16H4z', hover: '#fff' },
          { fn: () => window.electronAPI?.windowClose(),    d: 'M6 18L18 6M6 6l12 12', hover: '#f87171' },
        ].map((btn, i) => (
          <button key={i} onClick={btn.fn} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: 4, display: 'flex', transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = btn.hover}
            onMouseLeave={e => e.currentTarget.style.color = C.textMuted}
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d={btn.d}/></svg>
          </button>
        ))}
      </div>

      {/* Drag Area Bar for Top Window Movement */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 120, height: 42, WebkitAppRegion: 'drag', zIndex: 90 }} />

      {/* Sidebar */}
      <div style={{ width: 236, borderRight: ('1px solid ' + C.border), display: 'flex', flexDirection: 'column', padding: '18px 14px', flexShrink: 0, height: '100vh', boxSizing: 'border-box', position: 'relative', zIndex: 95 }}>
        
        {/* Brand Header (Seamless, Top Left) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px 24px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src={logoImg} alt="adyber" style={{ width: 20, height: 20, objectFit: 'contain' }} />
            <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: '-0.3px', color: '#fff' }}>adyber</span>
          </div>
          <span style={{ fontSize: 10, color: '#34d399', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', padding: '2px 8px', borderRadius: 20, fontFamily: 'monospace', fontWeight: 600 }}>
            v{appVersion}
          </span>
        </div>

        {/* Nav Items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, overflowY: 'auto' }}>
          {navItems.map(item => {
            const active = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: active ? C.surfaceAlt : 'transparent', border: ('1px solid ' + (active ? C.borderAlt : 'transparent')), borderRadius: 10, cursor: 'pointer', textAlign: 'left', color: active ? '#f1f5f9' : C.textSub, fontSize: 12, fontWeight: active ? 600 : 500, transition: 'all 0.15s', fontFamily: 'inherit' }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = C.surfaceAlt; e.currentTarget.style.color = '#ccc'; }}}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.textSub; }}}
              >
                <svg width="15" height="15" fill="none" stroke={active ? item.accent : C.textSub} viewBox="0 0 24 24">{item.icon}</svg>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Profile Section (Moved to Bottom with Popover Popup on Click) */}
        <div style={{ position: 'relative', marginTop: 'auto', paddingTop: 12 }} ref={profileMenuRef}>
          
          {/* Profile Settings Popover Popup */}
          {showProfileMenu && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              right: 0,
              marginBottom: 10,
              background: '#161616',
              border: '1px solid #2e2e2e',
              borderRadius: 14,
              boxShadow: '0 16px 40px rgba(0,0,0,0.7)',
              padding: 6,
              zIndex: 200,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              animation: 'popoverIn 0.15s ease-out'
            }}>
              
              {/* Profile Overview in Popup */}
              <div style={{ padding: '10px 12px', borderBottom: '1px solid #242424', marginBottom: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {name || 'User'}
                </div>
                <div style={{ fontSize: 11, color: C.textSub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
                  {email || 'Account Settings'}
                </div>
              </div>

              {/* Action: Open Floating AI Pill */}
              {onClose && (
                <button
                  onClick={() => { setShowProfileMenu(false); onClose(); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: 'transparent',
                    border: 'none',
                    color: '#e2e8f0',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s',
                    fontFamily: 'inherit'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#222'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', flexShrink: 0 }} />
                  <span>Floating AI Pill</span>
                </button>
              )}

              {/* Action: Reset Onboarding */}
              {onResetOnboarding && (
                <button
                  onClick={() => { setShowProfileMenu(false); onResetOnboarding(); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: 'transparent',
                    border: 'none',
                    color: C.textSub,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                    fontFamily: 'inherit'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#222'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.textSub; }}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Reset Onboarding</span>
                </button>
              )}

              {/* Divider */}
              {onLogout && <div style={{ height: 1, background: '#242424', margin: '4px 0' }} />}

              {/* Action: Sign Out */}
              {onLogout && (
                <button
                  onClick={() => { setShowProfileMenu(false); onLogout(); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: 'transparent',
                    border: 'none',
                    color: C.danger,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                    fontFamily: 'inherit'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#fca5a5'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.danger; }}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign Out</span>
                </button>
              )}

            </div>
          )}

          {/* Clickable Profile Card at the Bottom of Sidebar */}
          <button
            onClick={() => setShowProfileMenu(prev => !prev)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              background: showProfileMenu ? C.surfaceAlt : 'rgba(255,255,255,0.02)',
              border: ('1px solid ' + (showProfileMenu ? C.borderAlt : '#222')),
              borderRadius: 12,
              cursor: 'pointer',
              transition: 'all 0.15s',
              textAlign: 'left',
              fontFamily: 'inherit'
            }}
            onMouseEnter={e => { if (!showProfileMenu) { e.currentTarget.style.background = C.surfaceAlt; e.currentTarget.style.borderColor = C.borderAlt; }}}
            onMouseLeave={e => { if (!showProfileMenu) { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = '#222'; }}}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              {user?.userPhoto
                ? <img src={user.userPhoto} alt="avatar" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#262626', border: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: '#e2e8f0', flexShrink: 0 }}>
                    {(name || 'U').charAt(0).toUpperCase()}
                  </div>
              }
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {name || 'User'}
                </div>
                <div style={{ fontSize: 10, color: C.textSub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {email || 'Settings'}
                </div>
              </div>
            </div>

            {/* Subtle Chevron / Indicator */}
            <svg width="14" height="14" fill="none" stroke={C.textMuted} viewBox="0 0 24 24" style={{ transform: showProfileMenu ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>

      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: '48px 56px 40px 56px', overflowY: 'auto', minWidth: 0, height: '100vh', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: 540 }}>

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.4px' }}>Profile & AI Persona</h2>
              <p style={{ fontSize: 12, color: C.textSub, marginBottom: 32 }}>Customize your profile so Adyber knows who you are.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <Field label="Your Name">
                    <FocusInput as="input" type="text" style={inputBase} value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" />
                  </Field>
                  <Field label="About You / Role">
                    <FocusInput as="textarea" style={textareaBase} value={profileDesc} onChange={e => setProfileDesc(e.target.value)} placeholder="e.g. student, developer, designer…" />
                  </Field>
                  <Field label="Preferred Language">
                    <FocusInput as="select" style={selectBase} value={language} onChange={e => setLanguage(e.target.value)}>
                      {['English','Hindi','Spanish','French','German','Japanese'].map(l => <option key={l}>{l}</option>)}
                    </FocusInput>
                  </Field>
                  <Field label="Response Panel Behavior">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: '#f1f5f9' }}>
                      <input 
                        type="checkbox" 
                        checked={autoClosePanel} 
                        onChange={e => setAutoClosePanel(e.target.checked)} 
                        style={{ accentColor: '#10b981', width: 16, height: 16, cursor: 'pointer' }}
                      />
                      Auto-close response panel when AI finishes speaking
                    </label>
                  </Field>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4 }}>
                    <PrimaryBtn onClick={handleSaveProfile}>Save Profile</PrimaryBtn>
                    <StatusLabel status={saveStatus} />
                  </div>
                </div>
              </>
            )}

            {/* Hotkey Tab */}
            {activeTab === 'hotkey' && (
              <>
                <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.4px' }}>Shortcut Keys</h2>
                <p style={{ fontSize: 12, color: C.textSub, marginBottom: 32 }}>Choose the key combo that pops up your AI Pill.</p>
                <Card>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>Active Shortcut</div>
                      <div style={{ fontSize: 11, color: C.textSub }}>Hold to speak to Adyber</div>
                    </div>
                    <span style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.25)', color: '#60a5fa', fontFamily: 'monospace', fontWeight: 700, fontSize: 13, padding: '7px 16px', borderRadius: 10 }}>{shortcutKey}</span>
                  </div>
                  <div style={{ borderTop: ('1px solid ' + C.border), paddingTop: 20 }}>
                    <Label>Presets</Label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {['Ctrl+Shift', 'Ctrl+Space', 'Alt+Space', 'Ctrl+CapsLock'].map(k => {
                        const active = shortcutKey === k;
                        return (
                          <button key={k} onClick={() => handleSaveShortcut(k)}
                            style={{ background: active ? 'rgba(96,165,250,0.08)' : C.surface, border: ('1px solid ' + (active ? 'rgba(96,165,250,0.3)' : C.border)), color: active ? '#60a5fa' : C.textSub, borderRadius: 12, padding: '11px 16px', fontSize: 12, fontWeight: active ? 700 : 500, cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'monospace', transition: 'all 0.15s' }}
                            onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = '#444'; e.currentTarget.style.color = '#e2e8f0'; }}}
                            onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSub; }}}
                          >
                            {k}
                            {active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#60a5fa' }} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </Card>
                <div style={{ marginTop: 16 }}><StatusLabel status={keyStatus} okMsg="Hotkey updated!" /></div>
              </>
            )}

            {/* Engine Tab */}
            {activeTab === 'engine' && (
              <>
                <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.4px' }}>AI Engine & Model Configuration</h2>
                <p style={{ fontSize: 12, color: C.textSub, marginBottom: 24 }}>Choose your preferred AI Provider, Model, and API Credentials.</p>
                
                {/* Currently Active Banner */}
                <Card>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.7px' }}>Active AI Status</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, fontWeight: 600 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px #34d399' }} />
                      <span>{apiMode === 'local_ollama' ? 'Local Offline Ollama' : 'NVIDIA NIM API Key'}</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.textMuted, fontFamily: 'monospace' }}>
                      Model: <span style={{ color: C.text }}>{selectedModel || 'Default'}</span>
                    </div>
                  </div>
                </Card>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 24 }}>
                  <Field label="Execution Mode">
                    <FocusInput as="select" style={selectBase} value={apiMode} onChange={e => setApiMode(e.target.value)}>
                      <option value="free_key">API Key Mode</option>
                      <option value="local_ollama">100% Offline — Local Ollama</option>
                    </FocusInput>
                  </Field>

                  {apiMode === 'free_key' && (
                    <>
                      <Field label="NVIDIA Model Selection">
                        <FocusInput as="select" style={selectBase} value={selectedModel} onChange={e => setSelectedModel(e.target.value)}>
                          <option value="meta/llama-3.1-8b-instruct">NVIDIA Llama 3.1 8B Instruct (Fast & Efficient)</option>
                          <option value="meta/llama-3.1-70b-instruct">NVIDIA Llama 3.1 70B Instruct (High Performance)</option>
                          <option value="nvidia/nemotron-4-340b-instruct">NVIDIA Nemotron-4 340B (Max Reasoning)</option>
                        </FocusInput>
                      </Field>

                      <Field label="NVIDIA NIM API Key">
                        <FocusInput as="input" type="password" style={{ ...inputBase, fontFamily: 'monospace', fontSize: 13 }}
                          value={nvidiaKey}
                          onChange={e => setNvidiaKey(e.target.value)}
                          placeholder="Paste your NVIDIA NIM API Key here…" />
                        <div style={{ marginTop: 6, fontSize: 12 }}>
                          <a 
                            href="https://build.nvidia.com/" 
                            target="_blank" 
                            rel="noreferrer" 
                            style={{ color: '#60a5fa', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 500 }}
                            onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                            onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                          >
                            Get your free NVIDIA NIM API Key ↗
                          </a>
                        </div>
                      </Field>
                    </>
                  )}



                  {apiMode === 'local_ollama' && (
                    <>
                      <Field label="Ollama Server URL">
                        <FocusInput as="input" type="text" style={{ ...inputBase, fontFamily: 'monospace', fontSize: 13 }} value={ollamaUrl} onChange={e => setOllamaUrl(e.target.value)} />
                      </Field>
                      <Field label="Local Ollama Model">
                        <FocusInput as="select" style={selectBase} value={selectedModel} onChange={e => setSelectedModel(e.target.value)}>
                          <option value="llama3">Llama 3 (Ollama Local)</option>
                          <option value="mistral">Mistral 7B (Ollama Local)</option>
                          <option value="phi3">Phi-3 (Ollama Local)</option>
                          <option value="qwen2.5">Qwen 2.5 (Ollama Local)</option>
                        </FocusInput>
                      </Field>
                    </>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                    <PrimaryBtn onClick={handleSaveEngine}>Save Engine Settings</PrimaryBtn>
                    <button onClick={handleResetEngine}
                      style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', borderRadius: 12, padding: '12px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)'}>
                      Reset API Keys & Settings
                    </button>
                    <StatusLabel status={engineStatus === 'reset_ok' ? 'ok' : engineStatus} okMsg={engineStatus === 'reset_ok' ? 'Engine & API Keys Reset!' : 'Engine saved!'} />
                  </div>
                </div>
              </>
            )}

            {/* Memory Tab */}
            {activeTab === 'memory' && (
              <>
                <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.4px' }}>AI Memory & Knowledge</h2>
                <p style={{ fontSize: 12, color: C.textSub, marginBottom: 32 }}>Manage persistent facts and conversation history stored in Adyber's brain.</p>
                <Card>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>Long-Term Memory</div>
                      <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.6, maxWidth: 280 }}>
                        Wipe everything Adyber has learned — name, facts, preferences, and all conversation history. The AI will start completely fresh.
                      </div>
                    </div>
                    <PrimaryBtn onClick={handleWipeMemory} danger>Wipe Memory</PrimaryBtn>
                  </div>
                  {memoryStatus && (
                    <div style={{ marginTop: 20, paddingTop: 20, borderTop: ('1px solid ' + C.border) }}>
                      <StatusLabel status={memoryStatus} okMsg="Memory wiped! Adyber has a fresh brain." />
                    </div>
                  )}
                </Card>

                {memoryData?.conversation_history?.length > 0 && (
                  <div style={{ marginTop: 40 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#e2e8f0' }}>Previous Chats</h3>
                      <button onClick={handleClearHistory} style={{ background: 'none', border: 'none', color: C.textSub, fontSize: 12, cursor: 'pointer', transition: 'color 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#f87171'} onMouseLeave={e => e.currentTarget.style.color = C.textSub}>
                        Clear All
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {[...memoryData.conversation_history].reverse().map((chat, idx) => {
                        const originalIndex = memoryData.conversation_history.length - 1 - idx;
                        return (
                        <div key={idx} style={{ background: C.surfaceAlt, border: ('1px solid ' + C.borderAlt), borderRadius: 12, padding: 16, position: 'relative' }}>
                          <button onClick={() => handleDeleteChat(originalIndex)} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: 4, display: 'flex', transition: 'color 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.color = '#f87171'} onMouseLeave={e => e.currentTarget.style.color = C.textMuted}>
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                          </button>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                            <div style={{ display: 'flex', gap: 8, paddingRight: 24 }}>
                              {chat.date && <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 12, color: C.textSub }}>{chat.date}</span>}
                              {chat.time && <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 12, color: C.textSub }}>{chat.time}</span>}
                              {chat.tool && chat.tool !== 'none' && <span style={{ fontSize: 10, background: 'rgba(96,165,250,0.1)', color: '#60a5fa', padding: '2px 8px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 4 }}>⚡ {chat.tool}</span>}
                            </div>
                          </div>
                          
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#34d399', marginBottom: 4 }}>You said:</div>
                            <div style={{ fontSize: 13, color: '#f1f5f9', lineHeight: 1.5 }}>{chat.user}</div>
                          </div>
                          
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', marginBottom: 4 }}>Adyber replied:</div>
                            <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.5 }}>{chat.assistant}</div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Updates Tab */}
            {activeTab === 'updates' && (
              <>
                <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.4px' }}>App Updates</h2>
                <p style={{ fontSize: 12, color: C.textSub, marginBottom: 32 }}>Keep Adyber up to date with the latest features, fixes, and improvements.</p>

                {/* Current version card */}
                <Card>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 13, color: C.textSub, marginBottom: 6 }}>Installed Version</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-1px' }}>v{appVersion}</span>
                        {updateStatus === 'up-to-date' && (
                          <span style={{ fontSize: 11, color: '#34d399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
                            ✓ Up to date
                          </span>
                        )}
                        {updateStatus === 'available' && updateInfo?.version && (
                          <span style={{ fontSize: 11, color: '#38bdf8', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
                            ↑ v{updateInfo.version} available
                          </span>
                        )}
                        {updateStatus === 'downloaded' && (
                          <span style={{ fontSize: 11, color: '#a78bfa', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
                            ✓ Ready to install
                          </span>
                        )}
                        {updateStatus === 'error' && (
                          <span style={{ fontSize: 11, color: C.danger, background: C.dangerBg, border: ('1px solid ' + C.dangerBdr), padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
                            ✗ Update failed
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>
                        Adyber AI Desktop — NaitikGrover/adyber-ai
                      </div>
                    </div>

                    {/* Action button — changes based on state */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
                      {(updateStatus === 'idle' || updateStatus === 'up-to-date' || updateStatus === 'error') && (
                        <PrimaryBtn onClick={() => {
                          setUpdateStatus('checking');
                          window.electronAPI?.checkForUpdates?.();
                        }}>
                          {updateStatus === 'checking' ? 'Checking...' : 'Check for Updates'}
                        </PrimaryBtn>
                      )}

                      {updateStatus === 'checking' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.textSub, fontSize: 13 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                            style={{ animation: 'spin 1s linear infinite' }}>
                            <path d="M21 12a9 9 0 11-6.219-8.56"/>
                          </svg>
                          Checking...
                        </div>
                      )}

                      {updateStatus === 'available' && (
                        <PrimaryBtn onClick={() => {
                          window.electronAPI?.downloadUpdate?.();
                          setUpdateStatus('downloading');
                          setDownloadProgress(0);
                        }}>
                          Download & Install
                        </PrimaryBtn>
                      )}

                      {updateStatus === 'downloading' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#38bdf8', fontSize: 13, fontWeight: 600 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                            style={{ animation: 'spin 1s linear infinite' }}>
                            <path d="M21 12a9 9 0 11-6.219-8.56"/>
                          </svg>
                          Downloading...
                        </div>
                      )}

                      {updateStatus === 'downloaded' && (
                        <PrimaryBtn onClick={() => window.electronAPI?.quitAndInstall?.()}>
                          🔄 Restart Now
                        </PrimaryBtn>
                      )}
                    </div>
                  </div>

                  {/* Download progress bar */}
                  {updateStatus === 'downloading' && (
                    <div style={{ marginTop: 24, paddingTop: 20, borderTop: ('1px solid ' + C.border) }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: 12, color: C.textSub }}>Downloading update...</span>
                        <span style={{ fontSize: 12, color: '#38bdf8', fontWeight: 700, fontFamily: 'monospace' }}>{downloadProgress}%</span>
                      </div>
                      <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${downloadProgress}%`,
                          background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
                          borderRadius: 4,
                          transition: 'width 0.3s ease',
                          boxShadow: '0 0 10px rgba(56,189,248,0.5)'
                        }} />
                      </div>
                    </div>
                  )}

                  {/* Post-download install message */}
                  {updateStatus === 'downloaded' && updateInfo?.version && (
                    <div style={{ marginTop: 20, paddingTop: 20, borderTop: ('1px solid ' + C.border) }}>
                      <div style={{ fontSize: 12, color: '#a78bfa', lineHeight: 1.6 }}>
                        <strong style={{ color: '#fff' }}>v{updateInfo.version}</strong> is ready to install.
                        Click <strong>Restart Now</strong> to apply the update instantly.
                        Your settings and memory are preserved.
                      </div>
                    </div>
                  )}

                  {/* Update available release notes */}
                  {updateStatus === 'available' && updateInfo?.version && (
                    <div style={{ marginTop: 20, paddingTop: 20, borderTop: ('1px solid ' + C.border) }}>
                      <div style={{ fontSize: 12, color: C.textSub, marginBottom: 8 }}>What's new in <span style={{ color: '#38bdf8', fontWeight: 700 }}>v{updateInfo.version}</span></div>
                      {updateInfo.releaseNotes ? (
                        <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.7, maxHeight: 100, overflow: 'auto' }}>
                          {typeof updateInfo.releaseNotes === 'string'
                            ? updateInfo.releaseNotes.replace(/<[^>]+>/g, '').trim()
                            : 'See GitHub releases for full changelog.'}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: C.textSub }}>
                          <a href="https://github.com/NaitikGrover/adyber-ai/releases"
                            target="_blank" rel="noreferrer"
                            style={{ color: '#38bdf8', textDecoration: 'none' }}>
                            View changelog on GitHub →
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </Card>

                {/* Info note */}
                <div style={{ marginTop: 24, padding: '14px 18px', background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.12)', borderRadius: 12 }}>
                  <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.6 }}>
                    <span style={{ color: '#38bdf8', fontWeight: 600 }}>How updates work:</span> Adyber automatically checks for updates when you open the app.
                    Updates are downloaded in the background and installed when you restart. Your AI memory, settings, and API keys are never affected.
                  </div>
                </div>

                <style>{`
                  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                  @keyframes popoverIn {
                    from { opacity: 0; transform: translateY(6px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                  }
                `}</style>
              </>
            )}

          </div>
        </div>
      </div>
    );
}

