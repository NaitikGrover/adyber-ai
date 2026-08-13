import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Orb } from './components/Orb';
import { OrbState } from './components/types';
import ResponseCard from './components/ResponseCard';
import OnboardingFlow from './components/Onboarding/OnboardingFlow';
import Dashboard from './components/Dashboard/Dashboard';
import { logoutFromFirebase, getUserDataFromFirebase, saveUserDataToFirebase } from './firebase';

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return localStorage.getItem('ady_onboarded') !== 'true';
  });
  
  const [showDashboard, setShowDashboard] = useState(true);
  const [initialOnboardingStep, setInitialOnboardingStep] = useState(1);

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('ady_user');
      return saved ? JSON.parse(saved) : null;
    } catch(e) { return null; }
  });

  // Cloud User Sync: Fetch & Restore Cloud Profile, Settings & Memory on Login
  useEffect(() => {
    if (currentUser && currentUser.uid) {
      getUserDataFromFirebase(currentUser.uid).then(cloudData => {
        if (cloudData) {
          console.log("[Cloud User Sync] Restoring user profile, settings & memory from Firebase...");
          const profilePayload = {
            username: cloudData.profile?.name || cloudData.name || currentUser.name || '',
            name: cloudData.profile?.name || cloudData.name || currentUser.name || '',
            profileDescription: cloudData.profile?.profileDescription || cloudData.profileDescription || '',
            language: cloudData.profile?.language || cloudData.language || 'English',
            shortcutKey: cloudData.profile?.shortcutKey || cloudData.settings?.hotkey || 'Ctrl+Shift'
          };
          fetch('http://localhost:8000/save-onboarding-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profilePayload)
          }).catch(err => console.error("[Sync Profile Error]", err));

          if (cloudData.memory) {
            fetch('http://localhost:8000/sync-user-memory', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(cloudData.memory)
            }).catch(err => console.error("[Sync Memory Error]", err));
          }
          if (cloudData.settings) {
            fetch('http://localhost:8000/settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(cloudData.settings)
            }).catch(err => console.error("[Sync Settings Error]", err));
          }
        }
      });
    }
  }, [currentUser]);

  useEffect(() => {
    if (window.electronAPI?.onOpenDashboard) {
      window.electronAPI.onOpenDashboard(() => {
        setShowDashboard(true);
      });
    }
  }, []);

  const [orbState, setOrbState] = useState(OrbState.IDLE);
  const [volume, setVolume] = useState(0.0);
  const [liveText, setLiveText] = useState("");
  const [answerData, setAnswerData] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [textInput, setTextInput] = useState("");

  const socketRef = useRef(null);
  // Separate AudioContexts for mic and AI audio to prevent cross-contamination
  const micAudioCtxRef = useRef(null);
  const aiAudioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const micActiveRef = useRef(false);   // prevents double-start race
  const smoothVolumeRef = useRef(0.0);
  const recognitionRef = useRef(null);
  const orbStateRef = useRef(OrbState.IDLE);
  const isHoldingKeyRef = useRef(false);
  const accumulatedTranscriptRef = useRef('');
  const maxHoldTimerRef = useRef(null);
  const processingTimeoutRef = useRef(null);
  const currentAudioRef = useRef(null);

  const showOnboardingRef = useRef(showOnboarding);
  useEffect(() => { showOnboardingRef.current = showOnboarding; }, [showOnboarding]);

  useEffect(() => { 
    orbStateRef.current = orbState; 
    if (orbState === OrbState.IDLE && !showDashboard && !showOnboarding) {
      if (!isPanelOpen) {
        if (window.electronAPI?.hideWindow) {
          window.electronAPI.hideWindow();
        }
      }
    }
  }, [orbState, showDashboard, showOnboarding, isPanelOpen]);

  // ── Volume animation loop (shared) ────────────────────────────────────
  const startVolumeLoop = useCallback((analyser) => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    analyserRef.current = analyser;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(dataArray);
      let sum = 0;
      const validBins = Math.floor(dataArray.length * 0.6);
      for (let i = 0; i < validBins; i++) sum += dataArray[i];
      const avg = sum / validBins;
      const normalized = Math.min(1.0, Math.pow(avg / 120.0, 1.2));
      smoothVolumeRef.current += (normalized - smoothVolumeRef.current) * 0.35;
      setVolume(smoothVolumeRef.current);
      animFrameRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const stopVolumeLoop = useCallback(() => {
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    analyserRef.current = null;
    smoothVolumeRef.current = 0;
    setVolume(0);
  }, []);

  // ── Mic volume monitor (Web Audio API) ─────────────────────────────────
  const startMicMonitor = useCallback(() => {
    if (micActiveRef.current) return;   // already running
    micActiveRef.current = true;
    try {
      // Always create a fresh context – reusing a closed one crashes
      if (micAudioCtxRef.current) {
        micAudioCtxRef.current.close().catch(() => {});
        micAudioCtxRef.current = null;
      }
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      micAudioCtxRef.current = ctx;

      navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(stream => {
        if (!micActiveRef.current) {
          // stopped before mic permission came back
          stream.getTracks().forEach(t => t.stop());
          ctx.close().catch(() => {});
          return;
        }
        streamRef.current = stream;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);
        startVolumeLoop(analyser);
      }).catch(err => {
        console.error("[Mic getUserMedia Error]", err);
        micActiveRef.current = false;
      });
    } catch (e) {
      console.error("[Mic Monitor Error]", e);
      micActiveRef.current = false;
    }
  }, [startVolumeLoop]);

  const stopMicMonitor = useCallback(() => {
    micActiveRef.current = false;
    stopVolumeLoop();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (micAudioCtxRef.current) {
      micAudioCtxRef.current.close().catch(() => {});
      micAudioCtxRef.current = null;
    }
  }, [stopVolumeLoop]);

  // ── Push-To-Talk Hold Logic ─────────────────────────────────────────────
  const stopHoldListening = useCallback(() => {
    if (!isHoldingKeyRef.current) return;
    isHoldingKeyRef.current = false;
    clearTimeout(maxHoldTimerRef.current);
    
    // The Python Backend is now handling the Microphone and STT physically
    // It will send a "STATE_CHANGE: processing" WebSocket message once it finishes STT
    // We just stop the visual mic monitor here
    stopMicMonitor();
    setOrbState(OrbState.PROCESSING);

  }, [stopMicMonitor]);

  const startHoldListening = useCallback(() => {
    if (isHoldingKeyRef.current) return;
    isHoldingKeyRef.current = true;
    
    // IMMEDIATELY INTERRUPT AI IF SHE IS SPEAKING
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setOrbState(OrbState.LISTENING);
    setIsPanelOpen(false);
    setAnswerData(null);
    startMicMonitor();
    setLiveText("");

    // 60-second safety timeout
    clearTimeout(maxHoldTimerRef.current);
    maxHoldTimerRef.current = setTimeout(() => {
      console.log('[Push-To-Talk] Max 60s safety timeout reached -> Auto Release');
      stopHoldListening();
    }, 60000);
  }, [startMicMonitor, stopHoldListening]);

  // ── WebSocket Connection ────────────────────────────────────────────────
  const connectWebSocket = useCallback(() => {
    const ws = new WebSocket(`ws://localhost:8000/ws?token=${window.API_TOKEN || ''}`);
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);

      if (data.type === 'HOLD_START') {
        if (showOnboardingRef.current) {
          console.log('[Kernel Push-To-Talk] Ignored HOLD_START during Onboarding.');
          return;
        }
        console.log('[Kernel Push-To-Talk] HOLD_START -> Pop Up AI Pill & Listen');
        setShowDashboard(false);
        if (window.electronAPI?.setOrbMode) {
          window.electronAPI.setOrbMode();
        }
        startHoldListening();
      } else if (data.type === 'HOLD_RELEASE') {
        if (showOnboardingRef.current) return;
        console.log('[Kernel Push-To-Talk] HOLD_RELEASE -> Stop & Submit');
        stopHoldListening();
      } else if (data.type === 'STATE_CHANGE') {
        // Allow STATE_CHANGE to update state freely – the ANSWER handler
        // sets SPEAKING itself; backend should not send IDLE while we are
        // still playing audio, but if it does we want to honour it.
        setOrbState(data.state || OrbState.IDLE);
      } else if (data.type === 'ANSWER') {
        clearTimeout(processingTimeoutRef.current);
        setOrbState(OrbState.SPEAKING);
        setAnswerData({ summary: data.summary, sources: data.sources || [] });
        
        // Hide UI for OS automations, but show it for web search/Q&A
        if (!data.action_triggered) {
          setIsPanelOpen(true);
        } else {
          setIsPanelOpen(false);
        }

        // Sync fresh memory to Firebase cloud storage
        if (currentUser && currentUser.uid) {
          fetch('http://localhost:8000/memory')
            .then(r => r.json())
            .then(latestMem => {
              saveUserDataToFirebase(currentUser.uid, { memory: latestMem });
            })
            .catch(() => {});
        }

        // Helper: transition back to idle cleanly
        const returnToIdle = () => {
          console.log('[TTS Finished] Returning to Idle');
          stopVolumeLoop();
          currentAudioRef.current = null;
          setOrbState(OrbState.IDLE);
          if (data.auto_close_panel) {
            setAnswerData(null);
            setIsPanelOpen(false);
          }
        };

        if (data.audio_base64) {
          // Stop any previous mic monitor – we are about to use AI audio
          stopMicMonitor();

          const audio = new Audio('data:audio/mp3;base64,' + data.audio_base64);
          currentAudioRef.current = audio;

          // Each Audio element needs its own fresh AudioContext.
          // Reusing a context with createMediaElementSource on a NEW Audio
          // object throws InvalidStateError.
          try {
            if (aiAudioCtxRef.current) {
              aiAudioCtxRef.current.close().catch(() => {});
            }
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioCtx();
            aiAudioCtxRef.current = ctx;

            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            const source = ctx.createMediaElementSource(audio);
            source.connect(analyser);
            analyser.connect(ctx.destination);
            startVolumeLoop(analyser);
          } catch (e) {
            console.error('[AI Audio Monitor Error]', e);
            // bars won't animate but audio will still play
          }

          audio.onended = returnToIdle;
          audio.play().catch(e => {
            console.error('[Audio Playback Error]', e);
            returnToIdle();
          });

        } else if (data.summary && window.speechSynthesis) {
          // Fallback: native offline TTS (no audio bars needed)
          let spokenText = data.summary.replace(/[*#_]/g, '');
          spokenText = spokenText.replace(/\bAdy\b/gi, 'A D');

          const utt = new SpeechSynthesisUtterance(spokenText);
          utt.rate = 1.05;

          const voices = window.speechSynthesis.getVoices();
          const preferredVoice = voices.find(v =>
            v.name.includes('Zira') ||
            v.name.includes('Aria') ||
            v.name.includes('Hazel') ||
            v.name.includes('Female')
          ) || voices.find(v => v.lang.startsWith('en'));
          if (preferredVoice) utt.voice = preferredVoice;

          utt.onend = returnToIdle;
          window.speechSynthesis.speak(utt);

        } else {
          // No audio at all – auto-close after 2 s
          setTimeout(returnToIdle, 2000);
        }
      }
    };
    ws.onclose = () => setTimeout(connectWebSocket, 3000);
    socketRef.current = ws;
  }, [startHoldListening, stopHoldListening, stopMicMonitor, startVolumeLoop, stopVolumeLoop]);

  useEffect(() => {
    connectWebSocket();
    
    // Pre-load voices so they are ready before the first question
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
    }

    if (window.electronAPI) {
      window.electronAPI.onTriggerListening(() => startHoldListening());
    }

    return () => {
      clearTimeout(maxHoldTimerRef.current);
      clearTimeout(processingTimeoutRef.current);
      stopMicMonitor();
      stopVolumeLoop();
      if (aiAudioCtxRef.current) { aiAudioCtxRef.current.close().catch(() => {}); aiAudioCtxRef.current = null; }
      socketRef.current?.close();
    };
  }, []);

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (!textInput.trim() || !socketRef.current) return;
    socketRef.current.send(JSON.stringify({ type: 'PROCESS_TEXT', text: textInput }));
    setTextInput("");
    setOrbState(OrbState.PROCESSING);
  };

  useEffect(() => {
    if (isPanelOpen) {
      window.electronAPI?.resizeWindow?.(750, 850);
    }
  }, [isPanelOpen]);

  const handleFollowUp = (query) => {
    if (!socketRef.current) return;
    socketRef.current.send(JSON.stringify({ type: 'PROCESS_TEXT', text: query }));
    setOrbState(OrbState.PROCESSING);
  };

  useEffect(() => {
    if (showOnboarding || showDashboard) {
      if (window.electronAPI?.setOnboardingMode) {
        window.electronAPI.setOnboardingMode();
      }
    } else {
      if (window.electronAPI?.setOrbMode) {
        window.electronAPI.setOrbMode();
      }
    }
  }, [showOnboarding, showDashboard]);

  if (showOnboarding) {
    return <OnboardingFlow 
      key={`onboarding_${initialOnboardingStep}_${currentUser?.uid || 'guest'}`}
      initialStep={initialOnboardingStep}
      initialUserData={currentUser}
      onComplete={(userData) => {
        if (userData) {
          setCurrentUser(userData);
          localStorage.setItem('ady_user', JSON.stringify(userData));
        }
        localStorage.setItem('ady_onboarded', 'true');
        setShowOnboarding(false);
        setShowDashboard(true);
      }} 
    />;
  }

  if (showDashboard) {
    return (
      <Dashboard 
        user={currentUser} 
        onClose={() => setShowDashboard(false)}
        onResetOnboarding={async () => {
          if (currentUser?.uid) {
            saveUserDataToFirebase(currentUser.uid, { onboarded: false }).catch(() => {});
          }
          localStorage.removeItem('ady_onboarded');
          localStorage.removeItem('ady_user');
          localStorage.clear();
          sessionStorage.clear();
          if (window.electronAPI?.clearAppSession) window.electronAPI.clearAppSession();
          setCurrentUser(null);
          setInitialOnboardingStep(1);
          setShowOnboarding(true);
          setShowDashboard(false);
        }}
        onLogout={async () => {
          // 1. Synchronously wipe all local session keys & clear C++ Electron storage on disk
          localStorage.removeItem('ady_onboarded');
          localStorage.removeItem('ady_user');
          localStorage.clear();
          sessionStorage.clear();
          if (window.electronAPI?.clearAppSession) window.electronAPI.clearAppSession();
          setCurrentUser(null);
          setInitialOnboardingStep(1);
          setShowOnboarding(true);
          setShowDashboard(false);

          // 2. Perform backend & Firebase session wipes asynchronously
          try {
            fetch('http://localhost:8000/wipe-user-session', { method: 'POST' }).catch(() => {});
            logoutFromFirebase().catch(() => {});

            if (window.indexedDB && window.indexedDB.databases) {
              const dbs = await window.indexedDB.databases();
              await Promise.all(dbs.map(db => {
                return new Promise((resolve) => {
                  const req = window.indexedDB.deleteDatabase(db.name);
                  req.onsuccess = resolve;
                  req.onerror = resolve;
                  req.onblocked = resolve;
                });
              }));
              console.log('[Logout] IndexedDB cleared – Firebase auth cache wiped.');
            }
          } catch(e) {
            console.error('[Logout] IndexedDB wipe error:', e);
          }
        }} 
      />
    );
  }

  // Pure Floating AI Voice Orb Overlay Mode
  const isIdle = orbState === OrbState.IDLE;

  return (
    <div className="app-layout relative w-full h-full flex flex-col items-center">
      {/* Standalone AI Voice Orb Pill */}
      <div className={`glass-container ${!isIdle ? 'state-active' : ''}`}>
        <div className="drag-region" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40px', WebkitAppRegion: 'drag', zIndex: 10 }} />
        <Orb state={orbState} volume={volume} onClick={startHoldListening} />
      </div>

      {/* AI Answer Response Card */}
      {answerData && isPanelOpen && (
        <div className="context-panel-box">
          <ResponseCard 
            summary={answerData.summary}
            sources={answerData.sources || []}
            onClose={() => {
              setAnswerData(null);
              setIsPanelOpen(false);
            }} 
            onFollowUp={handleFollowUp}
            onTextSubmit={handleFollowUp}
          />
        </div>
      )}
    </div>
  );
}
