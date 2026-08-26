import React, { useState, useEffect, useRef } from 'react';
import logoImg from '/logo.png';
import { saveUserDataToFirebase } from '../../firebase';

// 3 Curated Themes (Linear Violet default, Midnight Dark, Flow Light)
const THEMES = {
  linear_violet: {
    name: 'Linear Violet',
    badge: 'Default',
    preview: ['#08090b', '#101217', '#a855f7'],
    shellBg: '#08090b',
    panelBg: '#101217',
    cardBg: '#151821',
    cardHover: '#1c202d',
    inputBg: '#0b0d12',
    border: 'rgba(255, 255, 255, 0.08)',
    borderInput: 'rgba(255, 255, 255, 0.12)',
    text: '#f8fafc',
    textSub: '#94a3b8',
    textMuted: '#64748b',
    accent: '#ffffff',
    accentText: '#000000',
    heroBg: 'linear-gradient(135deg, #090a0d 0%, #151821 100%)',
    heroTitleColor: '#ffffff',
    heroAccent: '#a855f7',
    heroFont: "'Playfair Display', Georgia, serif",
    heroStyle: 'italic',
    danger: '#ef4444',
    isLight: false
  },
  monochrome: {
    name: 'Midnight Dark',
    badge: 'Monochrome',
    preview: ['#0b0b0b', '#141414', '#ffffff'],
    shellBg: '#0b0b0b',
    panelBg: '#141414',
    cardBg: '#1c1c1c',
    cardHover: '#222222',
    inputBg: '#141414',
    border: '#262626',
    borderInput: '#2e2e2e',
    text: '#ffffff',
    textSub: '#888888',
    textMuted: '#555555',
    accent: '#ffffff',
    accentText: '#000000',
    heroBg: '#1c1c1c',
    heroTitleColor: '#ffffff',
    heroAccent: '#ffffff',
    heroFont: "'Inter', sans-serif",
    heroStyle: 'normal',
    danger: '#f87171',
    isLight: false
  },
  flow_light: {
    name: 'Daylight Clean',
    badge: 'Light Theme',
    preview: ['#f4f4f5', '#ffffff', '#0f172a'],
    shellBg: '#f4f4f5',
    panelBg: '#ffffff',
    cardBg: '#f8fafc',
    cardHover: '#f1f5f9',
    inputBg: '#ffffff',
    border: '#e2e8f0',
    borderInput: '#cbd5e1',
    text: '#0f172a',
    textSub: '#64748b',
    textMuted: '#94a3b8',
    accent: '#0f172a',
    accentText: '#ffffff',
    heroBg: '#f1f5f9',
    heroTitleColor: '#0f172a',
    heroAccent: '#0f172a',
    heroFont: "'Inter', sans-serif",
    heroStyle: 'normal',
    danger: '#dc2626',
    isLight: true
  }
};

export default function Dashboard({ user, onClose, onResetOnboarding, onLogout }) {
  const [themeKey, setThemeKey] = useState(() => localStorage.getItem('ady_theme') || 'linear_violet');
  const [activeNav, setActiveNav] = useState('activity'); // 'activity', 'memory', 'engine', 'knowledge', 'hotkey', 'style', 'settings'
  const [searchFilter, setSearchFilter] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const C = THEMES[themeKey] || THEMES.linear_violet;

  const handleSelectTheme = (key) => {
    setThemeKey(key);
    localStorage.setItem('ady_theme', key);
  };

  // User Profile state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profileDesc, setProfileDesc] = useState('');
  const [language, setLanguage] = useState('English');
  const [autoClosePanel, setAutoClosePanel] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  // Hotkey state
  const [shortcutKey, setShortcutKey] = useState('Ctrl+Shift');
  const [keyStatus, setKeyStatus] = useState('');

  // AI Engine state
  const [apiMode, setApiMode] = useState('free_key');
  const [apiProvider, setApiProvider] = useState('nvidia');
  const [selectedModel, setSelectedModel] = useState('meta/llama-3.1-8b-instruct');
  const [nvidiaKey, setNvidiaKey] = useState('');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [engineStatus, setEngineStatus] = useState('');

  // Memory & Activity state
  const [memoryData, setMemoryData] = useState(null);

  // Profile Popover Menu
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);

  // Auto-Updater state
  const [appVersion, setAppVersion] = useState('1.1.0');
  const [updateStatus, setUpdateStatus] = useState('idle');
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    }
    if (showProfileMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileMenu]);

  useEffect(() => {
    window.electronAPI?.getAppVersion?.().then(v => {
      if (v) setAppVersion(v);
    }).catch(() => setAppVersion('1.1.0'));
  }, []);

  const loadMemory = () => {
    fetch('http://localhost:8000/memory')
      .then(r => r.json())
      .then(data => setMemoryData(data))
      .catch(() => {});
  };

  useEffect(() => {
    loadMemory();
    const interval = setInterval(loadMemory, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (window.electronAPI?.setOnboardingMode) window.electronAPI.setOnboardingMode();
    setName(user?.name || user?.username || '');
    setEmail(user?.userEmail || user?.email || '');
    setProfileDesc(user?.profileDescription || '');
    setLanguage(user?.language || 'English');
    fetch('http://localhost:8000/settings').then(r => r.json()).then(s => {
      if (s.hotkey) setShortcutKey(s.hotkey);
      if (s.auto_close_panel !== undefined) setAutoClosePanel(s.auto_close_panel);
      if (s.mode) setApiMode(s.mode);
      if (s.provider) setApiProvider(s.provider);
      if (s.model) setSelectedModel(s.model);
      if (s.nvidia_api_key) setNvidiaKey(s.nvidia_api_key);
      if (s.ollama_url) setOllamaUrl(s.ollama_url);
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;
    const cleanup = [
      api.onUpdateAvailable?.((data) => { setUpdateInfo(data); setUpdateStatus('available'); }),
      api.onUpdateNotAvailable?.(() => { setUpdateStatus('up-to-date'); setTimeout(() => setUpdateStatus('idle'), 4000); }),
      api.onDownloadProgress?.((data) => { setDownloadProgress(data.percent || 0); setUpdateStatus('downloading'); }),
      api.onUpdateDownloaded?.((data) => { setUpdateInfo(prev => ({ ...prev, ...data })); setUpdateStatus('downloaded'); }),
      api.onUpdateError?.(() => { setUpdateStatus('error'); setTimeout(() => setUpdateStatus('idle'), 6000); })
    ].filter(Boolean);
    return () => cleanup.forEach(fn => fn && fn());
  }, []);

  const handleSaveProfile = async () => {
    setSaveStatus('saving');
    try {
      await fetch('http://localhost:8000/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ auto_close_panel: autoClosePanel }) });
      await fetch('http://localhost:8000/save-onboarding-profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: name, name, profileDescription: profileDesc, language, shortcutKey, theme: themeKey }) });
      const saved = JSON.parse(localStorage.getItem('ady_user') || '{}');
      localStorage.setItem('ady_user', JSON.stringify({ ...saved, name, username: name, profileDescription: profileDesc, language, theme: themeKey }));
      if (user?.uid) {
        saveUserDataToFirebase(user.uid, {
          onboarded: true,
          profile: { name, username: name, profileDescription: profileDesc, language, shortcutKey, theme: themeKey },
          settings: { auto_close_panel: autoClosePanel, theme: themeKey },
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

  const handleDeleteHistoryItem = async (index) => {
    try {
      await fetch(`http://localhost:8000/memory/history/${index}`, { method: 'DELETE' });
      setMemoryData(prev => {
        if (!prev) return prev;
        const newHistory = [...(prev.conversation_history || [])];
        newHistory.splice(index, 1);
        const newData = { ...prev, conversation_history: newHistory };
        if (user?.uid) saveUserDataToFirebase(user.uid, { memory: newData });
        return newData;
      });
    } catch {}
  };

  const handleCopyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const inputStyle = {
    width: '100%',
    height: 44,
    background: C.inputBg,
    border: `1px solid ${C.borderInput}`,
    borderRadius: 10,
    padding: '0 14px',
    color: C.text,
    fontSize: 13,
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease',
  };

  const rawHistory = memoryData?.conversation_history || [];
  const filteredHistory = rawHistory.filter(item => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return (item.user && item.user.toLowerCase().includes(q)) || (item.assistant && item.assistant.toLowerCase().includes(q));
  });

  const totalQueries = rawHistory.length;
  const factsCount = Object.keys(memoryData?.facts || {}).length;

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: C.shellBg,
      display: 'flex',
      color: C.text,
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      overflow: 'hidden',
      userSelect: 'none',
      position: 'relative',
      transition: 'background 0.25s ease'
    }}>

      {/* Top Drag & Seamless Header */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        WebkitAppRegion: 'drag',
        zIndex: 100
      }}>
        {/* Left window control icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, WebkitAppRegion: 'no-drag' }}>
          <button
            onClick={() => setActiveNav('activity')}
            style={{ background: 'none', border: 'none', color: C.textSub, cursor: 'pointer', display: 'flex', padding: 2 }}
            title="Toggle Sidebar"
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 6h16M4 12h16M4 18h7"/></svg>
          </button>
          <button
            onClick={() => setShowProfileMenu(prev => !prev)}
            style={{ background: 'none', border: 'none', color: C.textSub, cursor: 'pointer', display: 'flex', padding: 2 }}
            title="Profile Menu"
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
          </button>
        </div>

        {/* Right window actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, WebkitAppRegion: 'no-drag' }}>
          <button
            onClick={() => setActiveNav('settings')}
            style={{ background: 'none', border: 'none', color: updateStatus === 'available' ? '#38bdf8' : C.textSub, cursor: 'pointer', display: 'flex', padding: 2 }}
            title={updateStatus === 'available' ? 'Update Available!' : 'Settings'}
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
          </button>
          <button onClick={() => window.electronAPI?.windowMinimize()} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: 2 }} title="Minimize">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"/></svg>
          </button>
          <button onClick={() => window.electronAPI?.windowMaximize()} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: 2 }} title="Maximize">
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4h16v16H4z"/></svg>
          </button>
          <button onClick={() => window.electronAPI?.windowClose()} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: 2 }} title="Close">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      {/* Left Sidebar (Tailored for Adyber Voice Assistant) */}
      <div style={{
        width: 220,
        background: 'transparent',
        border: 'none',
        display: 'flex',
        flexDirection: 'column',
        padding: '48px 12px 14px 14px',
        flexShrink: 0,
        height: '100vh',
        boxSizing: 'border-box'
      }}>
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 6px 18px 6px' }}>
          <img src={logoImg} alt="Adyber" style={{ width: 22, height: 22, objectFit: 'contain' }} />
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.4px', color: C.text }}>Adyber</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.textSub, background: C.cardBg, border: `1px solid ${C.border}`, padding: '1px 6px', borderRadius: 4 }}>
            Ady
          </span>
        </div>

        {/* Main Assistant Nav Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {[
            { id: 'activity',  label: 'Voice & Activity', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/> },
            { id: 'memory',    label: 'Long-Term Memory', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/> },
            { id: 'engine',    label: 'AI Engine & Models', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M13 10V3L4 14h7v7l9-11h-7z"/> },
            { id: 'knowledge', label: 'Web & Domains', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/> },
            { id: 'hotkey',    label: 'Shortcut Keys', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/> },
            { id: 'style',     label: 'Appearance & Themes', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M7 21a4 4 0 01-4-4 5 5 0 012.38-4.27 4.97 4.97 0 012.62-.73c1.76 0 3.37.91 4.3 2.3A5 5 0 0119 17a4 4 0 01-4 4H7zM12 3v4m0 0l-2-2m2 2l2-2"/> }
          ].map(item => {
            const active = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: active ? C.cardBg : 'transparent',
                  border: `1px solid ${active ? C.border : 'transparent'}`,
                  color: active ? C.text : C.textSub,
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  fontFamily: 'inherit'
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = C.cardHover; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {item.icon}
                </svg>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Bottom Engine Status Card */}
        <div style={{
          background: C.cardBg,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: '12px',
          marginBottom: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>AI Status</div>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
          </div>
          <div style={{ fontSize: 10.5, color: C.textSub, marginTop: 4, lineHeight: 1.4 }}>
            {apiMode === 'local_ollama' ? 'Local Ollama (Offline)' : 'NVIDIA NIM (0.4s Ultra-Fast)'}
          </div>
          <button
            onClick={() => setActiveNav('engine')}
            style={{
              width: '100%',
              marginTop: 8,
              height: 28,
              borderRadius: 6,
              background: C.shellBg,
              border: `1px solid ${C.border}`,
              color: C.text,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Configure Engine
          </button>
        </div>

        {/* Bottom Links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <button
            onClick={() => onClose && onClose()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 10px',
              borderRadius: 6,
              background: 'transparent',
              border: 'none',
              color: C.textSub,
              fontSize: 12,
              cursor: 'pointer',
              textAlign: 'left'
            }}
            onMouseEnter={e => e.currentTarget.style.color = C.text}
            onMouseLeave={e => e.currentTarget.style.color = C.textSub}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
            <span>Open Floating AI Pill</span>
          </button>

          <button
            onClick={() => setActiveNav('settings')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              borderRadius: 6,
              background: activeNav === 'settings' ? C.cardBg : 'transparent',
              border: `1px solid ${activeNav === 'settings' ? C.border : 'transparent'}`,
              color: activeNav === 'settings' ? C.text : C.textSub,
              fontSize: 12,
              cursor: 'pointer',
              textAlign: 'left'
            }}
            onMouseEnter={e => e.currentTarget.style.color = C.text}
            onMouseLeave={e => e.currentTarget.style.color = activeNav === 'settings' ? C.text : C.textSub}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              <span>Settings</span>
            </div>
            {updateStatus === 'available' && (
              <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                1
              </span>
            )}
          </button>
        </div>

      </div>

      {/* DISTINCT ELEVATED MAIN DASHBOARD PANEL */}
      <div style={{
        flex: 1,
        margin: '42px 14px 14px 0',
        background: C.panelBg,
        borderRadius: 18,
        border: `1px solid ${C.border}`,
        boxShadow: C.isLight ? '0 4px 20px rgba(0, 0, 0, 0.08)' : '0 8px 32px rgba(0, 0, 0, 0.4)',
        overflowY: 'auto',
        padding: '30px 36px',
        boxSizing: 'border-box',
        position: 'relative',
        transition: 'background 0.25s ease'
      }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>

          {/* VIEW: Voice & Activity (Main Assistant Dashboard) */}
          {activeNav === 'activity' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              
              {/* Greeting */}
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0, letterSpacing: '-0.4px' }}>
                  Welcome back, {name || 'Naitik'}
                </h1>
              </div>

              {/* Hero Row: Wide Assistant Card + Right Stats Card */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 190px', gap: 16 }}>
                
                {/* Wide Assistant Banner */}
                <div style={{
                  background: C.heroBg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 14,
                  padding: '24px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  position: 'relative'
                }}>
                  <h2 style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: C.heroTitleColor,
                    margin: '0 0 6px 0',
                    letterSpacing: '-0.3px',
                    fontFamily: C.heroFont,
                    fontStyle: C.heroStyle
                  }}>
                    Your Always-On <span style={{ fontStyle: 'normal', color: C.heroAccent }}>AI Assistant</span>
                  </h2>
                  <p style={{ fontSize: 12, color: C.textSub, margin: '0 0 16px 0', maxWidth: 400, lineHeight: 1.4 }}>
                    Trigger Ady anytime via <span style={{ color: C.text, fontFamily: 'monospace', fontWeight: 600 }}>{shortcutKey}</span>. Ask questions, search the live web with citations, or control apps hands-free.
                  </p>
                  <div>
                    <button
                      onClick={() => onClose && onClose()}
                      style={{
                        padding: '8px 20px',
                        background: C.accent,
                        border: 'none',
                        borderRadius: 12,
                        color: C.accentText,
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'opacity 0.15s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    >
                      Start Voice Chat
                    </button>
                  </div>
                </div>

                {/* Right Assistant Stats Card */}
                <div style={{
                  background: C.cardBg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 14,
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: 12
                }}>
                  <div>
                    <span style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: '-0.5px' }}>
                      0.4s
                    </span>
                    <span style={{ fontSize: 11, color: C.textSub, marginLeft: 6 }}>response time</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: '-0.5px' }}>
                      {totalQueries}
                    </span>
                    <span style={{ fontSize: 11, color: C.textSub, marginLeft: 6 }}>voice queries</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: '-0.5px' }}>
                      {factsCount}
                    </span>
                    <span style={{ fontSize: 11, color: C.textSub, marginLeft: 6 }}>learned facts</span>
                  </div>
                </div>

              </div>

              {/* Activity Timeline ("RECENT CONVERSATIONS") */}
              <div style={{
                background: C.cardBg,
                border: `1px solid ${C.border}`,
                borderRadius: 14,
                padding: '18px 22px'
              }}>
                {/* Header Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.textSub, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                    RECENT CONVERSATIONS
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="Search chats..."
                        value={searchFilter}
                        onChange={e => setSearchFilter(e.target.value)}
                        style={{
                          height: 28,
                          background: C.panelBg,
                          border: `1px solid ${C.border}`,
                          borderRadius: 14,
                          padding: '0 10px 0 26px',
                          color: C.text,
                          fontSize: 11,
                          outline: 'none',
                          width: 140
                        }}
                      />
                      <svg width="12" height="12" fill="none" stroke={C.textSub} viewBox="0 0 24 24" style={{ position: 'absolute', left: 8, top: 8 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Timeline Entries */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {filteredHistory.length === 0 ? (
                    <div style={{ padding: '36px 0', textAlign: 'center', color: C.textSub, fontSize: 12 }}>
                      No voice prompts recorded yet. Press <span style={{ color: C.text, fontFamily: 'monospace', fontWeight: 600 }}>{shortcutKey}</span> to start talking to Ady!
                    </div>
                  ) : (
                    [...filteredHistory].reverse().map((item, idx) => {
                      const originalIndex = rawHistory.length - 1 - idx;
                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '70px 1fr auto',
                            alignItems: 'flex-start',
                            padding: '14px 0',
                            borderBottom: idx < filteredHistory.length - 1 ? `1px solid ${C.border}` : 'none',
                            gap: 12
                          }}
                        >
                          <div style={{ fontSize: 11, color: C.textSub, paddingTop: 2 }}>
                            {item.time || '12:00 pm'}
                          </div>

                          <div>
                            <div style={{ fontSize: 13, color: C.text, fontWeight: 500, lineHeight: 1.4 }}>
                              💬 {item.user}
                            </div>
                            {item.assistant && (
                              <div style={{ fontSize: 12, color: C.textSub, marginTop: 4, lineHeight: 1.4, paddingLeft: 16, borderLeft: `2px solid ${C.border}` }}>
                                🤖 {item.assistant}
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button
                              onClick={() => handleCopyText(item.user, idx)}
                              style={{ background: 'none', border: 'none', color: copiedId === idx ? '#10b981' : C.textSub, cursor: 'pointer', padding: 4 }}
                              title="Copy prompt"
                            >
                              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                            </button>
                            <button
                              onClick={() => handleDeleteHistoryItem(originalIndex)}
                              style={{ background: 'none', border: 'none', color: C.textSub, cursor: 'pointer', padding: 4 }}
                              title="Delete conversation"
                            >
                              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          )}

          {/* VIEW: Long-Term Memory */}
          {activeNav === 'memory' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: C.text }}>Long-Term Memory</h2>
              <p style={{ fontSize: 13, color: C.textSub, margin: 0 }}>Persistent facts, user preferences, and personalized details Ady has remembered.</p>

              <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>Learned Facts & Preferences</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {Object.entries(memoryData?.facts || {}).map(([k, v], i) => (
                    <div key={i} style={{ background: C.panelBg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 14px' }}>
                      <div style={{ fontSize: 11, color: C.textSub, fontWeight: 600 }}>{k}</div>
                      <div style={{ fontSize: 13, color: C.text, marginTop: 4, fontWeight: 500 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: AI Engine & Models */}
          {activeNav === 'engine' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: C.text }}>AI Engine & Models</h2>
              <p style={{ fontSize: 13, color: C.textSub, margin: 0 }}>Configure high-speed NVIDIA NIM Cloud (0.4s) or 100% Offline Local Ollama.</p>

              <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textSub, marginBottom: 6 }}>EXECUTION MODE</label>
                  <select style={inputStyle} value={apiMode} onChange={e => setApiMode(e.target.value)}>
                    <option value="free_key">NVIDIA NIM Cloud API Key (Ultra-Fast 0.4s)</option>
                    <option value="local_ollama">100% Offline Local Ollama</option>
                  </select>
                </div>

                {apiMode === 'free_key' ? (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textSub, marginBottom: 6 }}>MODEL</label>
                      <select style={inputStyle} value={selectedModel} onChange={e => setSelectedModel(e.target.value)}>
                        <option value="meta/llama-3.1-8b-instruct">meta/llama-3.1-8b-instruct (Fast & Accurate)</option>
                        <option value="meta/llama-3.1-70b-instruct">meta/llama-3.1-70b-instruct (High Reasoning)</option>
                        <option value="nvidia/nemotron-4-340b-instruct">nvidia/nemotron-4-340b-instruct (Max Capacity)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textSub, marginBottom: 6 }}>NVIDIA NIM API KEY</label>
                      <input type="password" style={inputStyle} value={nvidiaKey} onChange={e => setNvidiaKey(e.target.value)} placeholder="nvapi-..." />
                    </div>
                  </>
                ) : (
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textSub, marginBottom: 6 }}>OLLAMA URL</label>
                    <input type="text" style={inputStyle} value={ollamaUrl} onChange={e => setOllamaUrl(e.target.value)} />
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
                  <button
                    onClick={handleSaveEngine}
                    style={{ height: 38, padding: '0 22px', borderRadius: 10, background: C.accent, border: 'none', color: C.accentText, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Save Engine
                  </button>
                  {engineStatus === 'ok' && <span style={{ color: '#10b981', fontSize: 12 }}>✓ Engine Saved!</span>}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: Web & Domains */}
          {activeNav === 'knowledge' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: C.text }}>Web Search & Domain Shortcuts</h2>
              <p style={{ fontSize: 13, color: C.textSub, margin: 0 }}>Learned website URLs and dynamic web tools saved by Ady.</p>

              <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.entries(memoryData?.facts || {})
                    .filter(([k]) => k.startsWith('Website URL'))
                    .map(([k, v], i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                        <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{k.replace('Website URL (', '').replace(')', '')}</span>
                        <a href={v} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: C.text, textDecoration: 'underline' }}>{v} ↗</a>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: Shortcut Keys */}
          {activeNav === 'hotkey' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: C.text }}>Shortcut Keys</h2>
              <p style={{ fontSize: 13, color: C.textSub, margin: 0 }}>Configure the universal push-to-talk key combination to summon Ady.</p>

              <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {['Ctrl+Shift', 'Ctrl+Space', 'Alt+Space', 'Ctrl+CapsLock'].map(k => (
                    <button
                      key={k}
                      onClick={() => handleSaveShortcut(k)}
                      style={{
                        padding: '12px',
                        borderRadius: 10,
                        background: shortcutKey === k ? C.panelBg : C.cardBg,
                        border: `1px solid ${shortcutKey === k ? (C.isLight ? '#0f172a' : '#ffffff') : C.border}`,
                        color: shortcutKey === k ? C.text : C.textSub,
                        fontSize: 13,
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <span>{k}</span>
                      {shortcutKey === k && <span>✓</span>}
                    </button>
                  ))}
                </div>
                {keyStatus === 'ok' && <div style={{ marginTop: 12, color: '#10b981', fontSize: 12 }}>✓ Hotkey updated to {shortcutKey}!</div>}
              </div>
            </div>
          )}

          {/* VIEW: Appearance & Themes */}
          {activeNav === 'style' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: C.text }}>Appearance & Themes</h2>
              <p style={{ fontSize: 13, color: C.textSub, margin: 0 }}>Choose your preferred color aesthetic for Adyber.</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                {Object.entries(THEMES).map(([key, item]) => {
                  const active = themeKey === key;
                  return (
                    <button
                      key={key}
                      onClick={() => handleSelectTheme(key)}
                      style={{
                        padding: 16,
                        borderRadius: 14,
                        background: item.panelBg,
                        border: `2px solid ${active ? (item.isLight ? '#0f172a' : '#ffffff') : item.border}`,
                        boxShadow: active ? '0 0 16px rgba(255,255,255,0.1)' : 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        transition: 'transform 0.15s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: item.text }}>{item.name}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: item.textSub, background: item.cardBg, padding: '2px 6px', borderRadius: 4, border: `1px solid ${item.border}` }}>
                          {item.badge}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {item.preview.map((color, i) => (
                          <span key={i} style={{ width: 18, height: 18, borderRadius: '50%', background: color, border: '1px solid rgba(128,128,128,0.3)' }} />
                        ))}
                      </div>

                      {active && (
                        <div style={{ fontSize: 11, fontWeight: 700, color: item.isLight ? '#0f172a' : '#ffffff' }}>
                          ✓ Active Theme
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW: Settings & Profile */}
          {activeNav === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: C.text }}>Settings & Persona</h2>
              <p style={{ fontSize: 13, color: C.textSub, margin: 0 }}>Configure personal profile, theme appearance, voice language, and app auto-updates.</p>

              <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textSub, marginBottom: 6 }}>YOUR NAME</label>
                  <input type="text" style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Your Name" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textSub, marginBottom: 6 }}>ABOUT YOU / AI INSTRUCTIONS</label>
                  <textarea style={{ ...inputStyle, height: 70, padding: '10px 14px', resize: 'none' }} value={profileDesc} onChange={e => setProfileDesc(e.target.value)} placeholder="Tell Ady about your role, background, or response preferences..." />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textSub, marginBottom: 6 }}>VOICE LANGUAGE</label>
                  <select style={inputStyle} value={language} onChange={e => setLanguage(e.target.value)}>
                    {['English', 'Hindi', 'Spanish', 'French', 'German', 'Japanese'].map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" checked={autoClosePanel} onChange={e => setAutoClosePanel(e.target.checked)} style={{ width: 16, height: 16 }} />
                  <span style={{ fontSize: 12.5, color: C.text }}>Auto-close response panel when AI finishes speaking</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
                  <button onClick={handleSaveProfile} style={{ height: 38, padding: '0 22px', borderRadius: 10, background: C.accent, border: 'none', color: C.accentText, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                    Save Profile
                  </button>
                  {saveStatus === 'ok' && <span style={{ color: '#10b981', fontSize: 12 }}>✓ Saved!</span>}
                </div>
              </div>

              {/* Updates Card */}
              <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Installed Version: v{appVersion}</div>
                  <div style={{ fontSize: 11.5, color: C.textSub, marginTop: 2 }}>Automatic updates enabled from GitHub Releases</div>
                </div>
                <button
                  onClick={() => { setUpdateStatus('checking'); window.electronAPI?.checkForUpdates?.(); }}
                  style={{ height: 34, padding: '0 18px', borderRadius: 8, background: C.panelBg, border: `1px solid ${C.border}`, color: C.text, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                >
                  {updateStatus === 'checking' ? 'Checking...' : 'Check for Updates'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
