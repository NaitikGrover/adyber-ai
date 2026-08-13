import React, { useState, useEffect } from 'react';
import { X, Key, Cpu, Sparkles, Check, User, ShieldCheck, HardDrive } from 'lucide-react';

export function SettingsModal({ isOpen, onClose, currentSettings, onSave }) {
  const [aiName, setAiName] = useState('Ady');
  const [hotkey, setHotkey] = useState('Ctrl+Space');
  const [mode, setMode] = useState('free_key');
  const [provider, setProvider] = useState('gemini');
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('llama3');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (currentSettings) {
      setAiName(currentSettings.ai_name || 'Ady');
      setHotkey(currentSettings.hotkey || 'Ctrl+Space');
      setMode(currentSettings.mode || 'free_key');
      setProvider(currentSettings.provider || 'gemini');
      setGeminiKey(currentSettings.gemini_api_key || '');
      setOpenaiKey(currentSettings.openai_api_key || '');
      setGroqKey(currentSettings.groq_api_key || '');
      setOllamaUrl(currentSettings.ollama_url || 'http://localhost:11434');
      setOllamaModel(currentSettings.ollama_model || 'llama3');
    }
  }, [currentSettings]);

  if (!isOpen) return null;

  const handleSave = () => {
    const payload = {
      ai_name: aiName,
      hotkey,
      mode,
      provider,
      gemini_api_key: geminiKey,
      openai_api_key: openaiKey,
      groq_api_key: groqKey,
      ollama_url: ollamaUrl,
      ollama_model: ollamaModel
    };
    onSave(payload);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-card" style={{ maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Cpu size={20} color="#00d2ff" />
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Assistant & Engine Settings</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
            <User size={13} color="#00d2ff" /> Assistant Name
          </label>
          <input 
            type="text"
            value={aiName}
            onChange={(e) => setAiName(e.target.value)}
            placeholder="e.g. Ady, Jarvis, Athena"
            className="text-box"
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>Activation Hotkey Shortcut</label>
          <select value={hotkey} onChange={(e) => setHotkey(e.target.value)} className="select-box">
            <option value="Ctrl+Space">Ctrl + Space (Recommended)</option>
            <option value="Ctrl+Win">Ctrl + Win</option>
            <option value="Ctrl+Alt+A">Ctrl + Alt + A</option>
          </select>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: '#00d2ff', fontWeight: 600 }}>Select Engine Mode</label>
          <select value={mode} onChange={(e) => setMode(e.target.value)} className="select-box" style={{ borderColor: '#00d2ff' }}>
            <option value="free_key">1. Free API Key Mode (Bring Your Own Key)</option>
            <option value="subscription">2. Paid Subscription Mode (Default OpenAI Cloud)</option>
            <option value="local_ollama">3. Completely Free Local Model (Offline Ollama)</option>
          </select>
        </div>

        {mode === 'free_key' && (
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 10, marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: '#94a3b8' }}>API Model Provider</label>
            <select value={provider} onChange={(e) => setProvider(e.target.value)} className="select-box" style={{ marginBottom: 10 }}>
              <option value="gemini">Google Gemini AI</option>
              <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
              <option value="groq">Groq AI (Ultra-fast Llama 3)</option>
            </select>

            {provider === 'gemini' && (
              <div>
                <label style={{ fontSize: 11, color: '#00d2ff', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Key size={12} /> Google Gemini API Key
                </label>
                <input 
                  type="password"
                  placeholder="AIzaSy..."
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className="text-box"
                />
              </div>
            )}

            {provider === 'openai' && (
              <div>
                <label style={{ fontSize: 11, color: '#00d2ff', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Key size={12} /> OpenAI API Key
                </label>
                <input 
                  type="password"
                  placeholder="sk-..."
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  className="text-box"
                />
              </div>
            )}

            {provider === 'groq' && (
              <div>
                <label style={{ fontSize: 11, color: '#00d2ff', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Key size={12} /> Groq API Key
                </label>
                <input 
                  type="password"
                  placeholder="gsk_..."
                  value={groqKey}
                  onChange={(e) => setGroqKey(e.target.value)}
                  className="text-box"
                />
              </div>
            )}
          </div>
        )}

        {mode === 'subscription' && (
          <div style={{ background: 'rgba(0, 255, 136, 0.08)', border: '1px solid rgba(0, 255, 136, 0.3)', padding: 12, borderRadius: 10, marginBottom: 12, color: '#00ff88', fontSize: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, marginBottom: 4 }}>
              <ShieldCheck size={16} /> Paid Subscription Mode Active
            </div>
            Default backend AI engine is locked to high-performance OpenAI cloud endpoints. No API key required.
          </div>
        )}

        {mode === 'local_ollama' && (
          <div style={{ background: 'rgba(122, 0, 255, 0.08)', border: '1px solid rgba(122, 0, 255, 0.3)', padding: 12, borderRadius: 10, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#a855f7', fontWeight: 600, fontSize: 12, marginBottom: 8 }}>
              <HardDrive size={16} /> Offline Local Model (Ollama)
            </div>
            <label style={{ fontSize: 11, color: '#94a3b8' }}>Ollama Server URL</label>
            <input 
              type="text"
              value={ollamaUrl}
              onChange={(e) => setOllamaUrl(e.target.value)}
              className="text-box"
              style={{ marginBottom: 8 }}
            />
            <label style={{ fontSize: 11, color: '#94a3b8' }}>Model Name</label>
            <input 
              type="text"
              value={ollamaModel}
              onChange={(e) => setOllamaModel(e.target.value)}
              className="text-box"
            />
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
          <button onClick={onClose} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', padding: '6px 14px', borderRadius: 8, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {savedSuccess ? <Check size={16} /> : <Sparkles size={16} />}
            {savedSuccess ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
