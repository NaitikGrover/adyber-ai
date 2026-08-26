import React, { useState, useEffect, useRef } from 'react';
import logoImg from '/logo.png';
import { saveUserDataToFirebase } from '../../firebase';

// Exact Palette from OnboardingFlow.jsx (Clean Monochrome Dark Theme)
const C = {
  shellBg: '#0b0b0b',
  panelBg: '#141414',
  cardBg: '#1c1c1c',
  cardHover: '#222222',
  inputBg: '#141414',
  border: '#262626',
  borderInput: '#2e2e2e',
  borderFocus: '#ffffff',
  text: '#ffffff',
  textSub: '#888888',
  textMuted: '#555555',
  accent: '#ffffff',
  accentText: '#000000',
  danger: '#f87171',
  dangerBg: '#2a0a0a',
  dangerBorder: '#5c1a1a',
  emerald: '#34d399',
  sky: '#60a5fa',
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

export default function Dashboard({ user, onClose, onResetOnboarding, onLogout }) {
  const [activeNav, setActiveNav] = useState('dictation');
  const [searchFilter, setSearchFilter] = useState('');
  const [copiedId, setCopiedId] = useState(null);

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

  const rawHistory = memoryData?.conversation_history || [];
  const filteredHistory = rawHistory.filter(item => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return (item.user && item.user.toLowerCase().includes(q)) || (item.assistant && item.assistant.toLowerCase().includes(q));
  });

  const totalWords = rawHistory.reduce((acc, cur) => acc + (cur.user?.split(' ')?.length || 0) + (cur.assistant?.split(' ')?.length || 0), 0);
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
      position: 'relative'
    }}>

      {/* Top Drag & Seamless Header (United with Outer Shell) */}
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
            onClick={() => setActiveNav('dictation')}
            style={{ background: 'none', border: 'none', color: C.textSub, cursor: 'pointer', display: 'flex', padding: 2 }}
            title="Toggle Sidebar"
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 6h16M4 12h16M4 18h7"/></svg>
          </button>
          <button
            onClick={() => setShowProfileMenu(prev => !prev)}
            style={{ background: 'none', border: 'none', color: C.textSub, cursor: 'pointer', display: 'flex', padding: 2 }}
            title="Profile"
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
          </button>
        </div>

        {/* Right window actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, WebkitAppRegion: 'no-drag' }}>
          <button
            onClick={() => setActiveNav('settings')}
            style={{ background: 'none', border: 'none', color: updateStatus === 'available' ? C.sky : C.textSub, cursor: 'pointer', display: 'flex', padding: 2 }}
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

      {/* Left Sidebar (United seamlessly with Shell Background) */}
      <div style={{
        width: 215,
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <span style={{ width: 3, height: 14, background: '#fff', borderRadius: 2 }} />
            <span style={{ width: 3, height: 18, background: '#fff', borderRadius: 2 }} />
            <span style={{ width: 3, height: 10, background: '#fff', borderRadius: 2 }} />
          </div>
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.4px', color: '#fff' }}>Flow</span>
          <span style={{ fontSize: 10, color: C.textMuted, marginLeft: 2, background: '#1c1c1c', border: `1px solid ${C.border}`, padding: '1px 5px', borderRadius: 4 }}>Ady</span>
        </div>

        {/* Main Nav Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {[
            { id: 'dictation', label: 'Dictation', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/> },
            { id: 'memory',    label: 'Notetaker',  icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM12 4v1m0 14v1m8-8h-1M5 12H4m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707"/> },
            { id: 'engine',    label: 'Insights',   icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/> },
            { id: 'knowledge', label: 'Dictionary', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/> },
            { id: 'hotkey',    label: 'Snippets',   icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879a3 3 0 11-4.242-4.242L10.5 8.5M8 12a3 3 0 10-4.242-4.242L6.636 10.636"/> },
            { id: 'style',     label: 'Style',      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 6h16M4 12h10M4 18h6"/> },
            { id: 'transforms',label: 'Transforms', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M13 10V3L4 14h7v7l9-11h-7z"/> },
            { id: 'scratchpad',label: 'Scratchpad', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/> }
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
                  padding: '7px 10px',
                  borderRadius: 8,
                  background: active ? '#1c1c1c' : 'transparent',
                  border: `1px solid ${active ? C.border : 'transparent'}`,
                  color: active ? '#ffffff' : C.textSub,
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  fontFamily: 'inherit'
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#141414'; }}
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

        {/* Bottom Tier Status Card */}
        <div style={{
          background: C.cardBg,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: '12px',
          marginBottom: 12
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>Unlimited AI Engine</div>
          <div style={{ fontSize: 10.5, color: C.textSub, marginTop: 4, lineHeight: 1.4 }}>
            NVIDIA NIM Cloud & Local Ollama active.
          </div>
          <button
            onClick={() => setActiveNav('engine')}
            style={{
              width: '100%',
              marginTop: 8,
              height: 28,
              borderRadius: 6,
              background: '#0b0b0b',
              border: `1px solid ${C.border}`,
              color: '#fff',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Manage Engine
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
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = C.textSub}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.emerald }} />
            <span>Open Floating Pill</span>
          </button>

          <button
            onClick={() => setActiveNav('settings')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              borderRadius: 6,
              background: activeNav === 'settings' ? '#1c1c1c' : 'transparent',
              border: `1px solid ${activeNav === 'settings' ? C.border : 'transparent'}`,
              color: activeNav === 'settings' ? '#fff' : C.textSub,
              fontSize: 12,
              cursor: 'pointer',
              textAlign: 'left'
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = activeNav === 'settings' ? '#fff' : C.textSub}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              <span>Settings</span>
            </div>
            {updateStatus === 'available' && (
              <span style={{ width: 16, height: 16, borderRadius: '50%', background: C.danger, color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                1
              </span>
            )}
          </button>
        </div>

      </div>

      {/* DISTINCT ELEVATED MAIN DASHBOARD PANEL (#141414 with #262626 border) */}
      <div style={{
        flex: 1,
        margin: '42px 14px 14px 0',
        background: C.panelBg,
        borderRadius: 18,
        border: `1px solid ${C.border}`,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        overflowY: 'auto',
        padding: '30px 36px',
        boxSizing: 'border-box',
        position: 'relative'
      }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>

          {/* VIEW: Dictation & Activity (Main Flow Dashboard in Clean Monochrome) */}
          {(activeNav === 'dictation' || activeNav === 'transforms' || activeNav === 'scratchpad') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              
              {/* Greeting */}
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.4px' }}>
                  Welcome back, {name || 'Naitik'}
                </h1>
              </div>

              {/* Hero Row: Wide Card + Right Stats Card */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 190px', gap: 16 }}>
                
                {/* Wide Banner */}
                <div style={{
                  background: C.cardBg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 14,
                  padding: '24px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  position: 'relative'
                }}>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 6px 0', letterSpacing: '-0.3px' }}>
                    Make Flow sound like you
                  </h2>
                  <p style={{ fontSize: 12, color: C.textSub, margin: '0 0 16px 0', maxWidth: 380 }}>
                    Configure custom AI persona, preferred hotkeys ({shortcutKey}), and voice automation.
                  </p>
                  <div>
                    <button
                      onClick={() => setActiveNav('settings')}
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
                      Start now
                    </button>
                  </div>
                </div>

                {/* Right Stats Card */}
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
                    <span style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
                      {(totalWords / 1000).toFixed(1)}K
                    </span>
                    <span style={{ fontSize: 11, color: C.textSub, marginLeft: 6 }}>total words</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
                      0.4s
                    </span>
                    <span style={{ fontSize: 11, color: C.textSub, marginLeft: 6 }}>AI latency</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
                      {factsCount}
                    </span>
                    <span style={{ fontSize: 11, color: C.textSub, marginLeft: 6 }}>learned facts</span>
                  </div>
                </div>

              </div>

              {/* Activity Timeline ("TODAY") Matching Flow Reference Layout */}
              <div style={{
                background: C.cardBg,
                border: `1px solid ${C.border}`,
                borderRadius: 14,
                padding: '18px 22px'
              }}>
                {/* Header Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.textSub, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                    TODAY
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="Search timeline..."
                        value={searchFilter}
                        onChange={e => setSearchFilter(e.target.value)}
                        style={{
                          height: 28,
                          background: '#141414',
                          border: `1px solid ${C.border}`,
                          borderRadius: 14,
                          padding: '0 10px 0 26px',
                          color: '#fff',
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
                    <div style={{ padding: '32px 0', textAlign: 'center', color: C.textSub, fontSize: 12 }}>
                      No voice prompts recorded yet today. Hold <span style={{ color: '#fff', fontFamily: 'monospace' }}>{shortcutKey}</span> and speak to Ady!
                    </div>
                  ) : (
                    [...filteredHistory].reverse().map((item, idx) => {
                      const originalIndex = rawHistory.length - 1 - idx;
                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '80px 1fr auto',
                            alignItems: 'center',
                            padding: '14px 0',
                            borderBottom: idx < filteredHistory.length - 1 ? `1px solid ${C.border}` : 'none'
                          }}
                        >
                          <div style={{ fontSize: 11.5, color: C.textSub }}>
                            {item.time || '12:00 pm'}
                          </div>

                          <div style={{ paddingRight: 16 }}>
                            <div style={{ fontSize: 13, color: '#ffffff', lineHeight: 1.4 }}>
                              {item.user}
                            </div>
                            {item.assistant && (
                              <div style={{ fontSize: 12, color: C.textSub, marginTop: 4, lineHeight: 1.4 }}>
                                {item.assistant}
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button
                              onClick={() => handleCopyText(item.user, idx)}
                              style={{ background: 'none', border: 'none', color: copiedId === idx ? C.emerald : C.textSub, cursor: 'pointer', padding: 4 }}
                              title="Copy prompt"
                            >
                              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                            </button>
                            <button
                              onClick={() => handleDeleteHistoryItem(originalIndex)}
                              style={{ background: 'none', border: 'none', color: C.textSub, cursor: 'pointer', padding: 4 }}
                              title="Delete entry"
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

          {/* VIEW: Memory & Insights */}
          {activeNav === 'memory' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#fff' }}>Notetaker & Long-Term Memory</h2>
              <p style={{ fontSize: 13, color: C.textSub, margin: 0 }}>Persistent facts, user preferences, and learned web URLs saved in memory.</p>

              <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 12 }}>Learned Facts</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {Object.entries(memoryData?.facts || {}).map(([k, v], i) => (
                    <div key={i} style={{ background: '#141414', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 11, color: C.textSub, fontWeight: 600 }}>{k}</div>
                      <div style={{ fontSize: 12.5, color: '#fff', marginTop: 2 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: AI Engine & Models */}
          {activeNav === 'engine' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#fff' }}>AI Engine & Models</h2>
              <p style={{ fontSize: 13, color: C.textSub, margin: 0 }}>Configure high-speed NVIDIA NIM Cloud or 100% Offline Local Ollama.</p>

              <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textSub, marginBottom: 6 }}>EXECUTION MODE</label>
                  <select style={inputStyle} value={apiMode} onChange={e => setApiMode(e.target.value)}>
                    <option value="free_key">NVIDIA NIM Cloud API Key (Fast 0.4s)</option>
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
                  {engineStatus === 'ok' && <span style={{ color: C.emerald, fontSize: 12 }}>✓ Engine Saved!</span>}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: Snippets & Hotkeys */}
          {activeNav === 'hotkey' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#fff' }}>Snippets & Shortcut Keys</h2>
              <p style={{ fontSize: 13, color: C.textSub, margin: 0 }}>Configure the universal push-to-talk key combo.</p>

              <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {['Ctrl+Shift', 'Ctrl+Space', 'Alt+Space', 'Ctrl+CapsLock'].map(k => (
                    <button
                      key={k}
                      onClick={() => handleSaveShortcut(k)}
                      style={{
                        padding: '12px',
                        borderRadius: 10,
                        background: shortcutKey === k ? '#141414' : C.cardBg,
                        border: `1px solid ${shortcutKey === k ? '#ffffff' : C.border}`,
                        color: shortcutKey === k ? '#ffffff' : C.textSub,
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
                {keyStatus === 'ok' && <div style={{ marginTop: 12, color: C.emerald, fontSize: 12 }}>✓ Hotkey updated to {shortcutKey}!</div>}
              </div>
            </div>
          )}

          {/* VIEW: Dictionary / Knowledge Base */}
          {activeNav === 'knowledge' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#fff' }}>Dictionary & Knowledge Base</h2>
              <p style={{ fontSize: 13, color: C.textSub, margin: 0 }}>Discovered domains and web service shortcuts remembered by Ady.</p>

              <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.entries(memoryData?.facts || {})
                    .filter(([k]) => k.startsWith('Website URL'))
                    .map(([k, v], i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                        <span style={{ fontSize: 12.5, color: '#fff' }}>{k.replace('Website URL (', '').replace(')', '')}</span>
                        <a href={v} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#fff', textDecoration: 'underline' }}>{v} ↗</a>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: Settings & Profile */}
          {(activeNav === 'settings' || activeNav === 'style') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#fff' }}>Settings & Persona</h2>
              <p style={{ fontSize: 13, color: C.textSub, margin: 0 }}>Configure personal profile, voice language, and app auto-updates.</p>

              <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textSub, marginBottom: 6 }}>NAME</label>
                  <input type="text" style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Your Name" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textSub, marginBottom: 6 }}>ABOUT YOU</label>
                  <textarea style={{ ...inputStyle, height: 70, padding: '10px 14px', resize: 'none' }} value={profileDesc} onChange={e => setProfileDesc(e.target.value)} placeholder="Role and background..." />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.textSub, marginBottom: 6 }}>LANGUAGE</label>
                  <select style={inputStyle} value={language} onChange={e => setLanguage(e.target.value)}>
                    {['English', 'Hindi', 'Spanish', 'French', 'German', 'Japanese'].map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" checked={autoClosePanel} onChange={e => setAutoClosePanel(e.target.checked)} style={{ width: 16, height: 16 }} />
                  <span style={{ fontSize: 12.5, color: '#fff' }}>Auto-close response panel when AI finishes speaking</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
                  <button onClick={handleSaveProfile} style={{ height: 38, padding: '0 22px', borderRadius: 10, background: C.accent, border: 'none', color: C.accentText, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                    Save Profile
                  </button>
                  {saveStatus === 'ok' && <span style={{ color: C.emerald, fontSize: 12 }}>✓ Saved!</span>}
                </div>
              </div>

              {/* Updates Card */}
              <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Installed Version: v{appVersion}</div>
                  <div style={{ fontSize: 11.5, color: C.textSub, marginTop: 2 }}>Automatic updates enabled from GitHub Releases</div>
                </div>
                <button
                  onClick={() => { setUpdateStatus('checking'); window.electronAPI?.checkForUpdates?.(); }}
                  style={{ height: 34, padding: '0 18px', borderRadius: 8, background: '#141414', border: `1px solid ${C.border}`, color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
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
