import React, { useState, useEffect } from 'react';
import logoImg from '/logo.png';
import { loginWithGoogle, saveUserToFirebase, saveUserDataToFirebase, getUserDataFromFirebase } from '../../firebase';
import Confetti from 'react-confetti-boom';

// --- SHARED UI COMPONENTS ---

const StepIndicator = ({ current, total }) => {
  return (
    <div className="flex gap-2 justify-center absolute top-8 left-0 right-0 z-40">
      {Array.from({ length: total }).map((_, i) => {
        const isActive = i + 1 === current;
        return (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              isActive ? 'w-6 bg-white' : 'w-1.5 bg-gray-800'
            }`}
          />
        );
      })}
    </div>
  );
};

const Button = ({ children, onClick, variant = 'primary', className = '', style = {} }) => {
  const baseStyle = "h-12 px-7 rounded-xl font-medium text-sm transition-all duration-200 active:scale-95 flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-white hover:bg-gray-100 text-black font-semibold shadow-md",
    secondary: "bg-[#181818] hover:bg-[#252525] border border-[#333] text-white font-medium",
    google: "bg-white text-black hover:bg-gray-100 w-56 h-14 rounded-lg font-semibold text-base shadow-md",
    skip: "bg-[#181818] hover:bg-[#252525] border border-[#333] text-white font-medium w-20 !h-9 rounded-xl text-xs shadow-md absolute right-8 top-24 z-40 flex items-center justify-center active:scale-95"
  };
  
  return (
    <button onClick={onClick} className={`${variant === 'skip' ? variants[variant] : baseStyle + ' ' + variants[variant]} ${className}`} style={style}>
      {children}
    </button>
  );
};

const Input = ({ placeholder, value, onChange, type = "text" }) => (
  <input
    type={type}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    className="w-80 h-14 bg-[#141414] border border-[#2e2e2e] focus:border-white rounded-xl px-5 text-white placeholder-gray-500 outline-none transition-all text-base text-center shadow-lg"
  />
);

const PermissionCard = ({ icon, title, desc }) => (
  <div 
    className="flex items-center rounded-2xl bg-[#1c1c1c] border border-[#262626] w-full max-w-md min-h-[88px] text-left shadow-lg transition-all hover:bg-[#222222]"
    style={{ paddingLeft: '36px', paddingRight: '24px', paddingTop: '20px', paddingBottom: '20px' }}
  >
    <div className="text-gray-200 w-7 h-7 flex items-center justify-center shrink-0" style={{ marginRight: '20px' }}>
      {icon}
    </div>
    <div className="flex flex-col justify-center gap-0.5 min-w-0">
      <div className="text-white font-bold text-base tracking-tight">{title}</div>
      <div className="text-gray-400 text-xs sm:text-sm leading-snug">{desc}</div>
    </div>
  </div>
);

const Titlebar = () => {
  return (
    <div className="absolute top-0 left-0 w-full flex justify-end items-center z-50" style={{ WebkitAppRegion: 'drag', paddingRight: '30px', paddingTop: '30px' }}>
      <div className="flex gap-5" style={{ WebkitAppRegion: 'no-drag' }}>
        <button onClick={() => window.electronAPI?.windowMinimize()} className="text-[#888] hover:text-white transition-colors">
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 12H4"/></svg>
        </button>
        <button onClick={() => window.electronAPI?.windowMaximize()} className="text-[#888] hover:text-white transition-colors">
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 4h16v16H4z"/></svg>
        </button>
        <button onClick={() => window.electronAPI?.windowClose()} className="text-[#888] hover:text-red-500 transition-colors">
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.5 19.5L19.5 4.5M4.5 4.5l15 15"/></svg>
        </button>
      </div>
    </div>
  );
};

const Layout = ({ currentStep, totalSteps, eyebrow, title, children, showSkip = false, hideIndicator = false, onSkip }) => (
  <div className="w-full h-full bg-[#0b0b0b] text-white flex flex-col items-center justify-center font-['Inter'] relative select-none px-6">
    {!hideIndicator && <StepIndicator current={currentStep} total={totalSteps} />}
    {showSkip && <Button variant="skip" onClick={onSkip}>Skip</Button>}
    
    <div className="flex flex-col items-center text-center w-full max-w-lg -mt-4">
      {eyebrow && <h4 className="text-[11px] uppercase tracking-[0.25em] text-gray-500 font-bold mb-4">{eyebrow}</h4>}
      {title && <h1 className="text-3xl font-bold tracking-tight mb-12 leading-tight">{title}</h1>}
      
      <div className="flex flex-col items-center w-full gap-6" style={{ marginTop: '50px' }}>
        {children}
      </div>
    </div>
  </div>
);

const ActionRow = ({ disableNext = false, onNext, onPrev, hideBack = false }) => (
  <div className="flex gap-4 mt-10 w-full max-w-md justify-center">
    {!hideBack && <Button variant="secondary" onClick={onPrev} className="w-32 h-12">Back</Button>}
    <Button variant="primary" onClick={onNext} className={`w-36 h-12 ${disableNext ? 'opacity-30 cursor-not-allowed pointer-events-none' : ''}`}>
      Continue
    </Button>
  </div>
);

// --- MAIN WIZARD COMPONENT ---

export default function OnboardingFlow({ onComplete, initialStep = 1, initialUserData = null }) {
  const [step, setStep] = useState(initialStep);

  useEffect(() => {
    setStep(initialStep);
  }, [initialStep]);

  const [isSigningIn, setIsSigningIn] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isRecordingKey, setIsRecordingKey] = useState(false);
  const [recordedCombo, setRecordedCombo] = useState([]);
  const [pressedKeys, setPressedKeys] = useState({});
  const [isShortcutVerified, setIsShortcutVerified] = useState(false);
  const TOTAL_STEPS = 8;
  
  const [data, setData] = useState({
    username: initialUserData?.username || initialUserData?.name || '',
    userEmail: initialUserData?.userEmail || initialUserData?.email || '',
    userPhoto: initialUserData?.userPhoto || initialUserData?.photoURL || '',
    userUid: initialUserData?.userUid || initialUserData?.uid || '',
    language: 'English',
    source: '',
    profileDescription: '',
    shortcutKey: 'Ctrl+Shift',
    apiMode: '',
    apiKey: ''
  });

  useEffect(() => {
    if (window.electronAPI) window.electronAPI.setOnboardingMode();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        if (e.target.tagName === 'TEXTAREA' && e.shiftKey) {
          return;
        }
        
        e.preventDefault();

        if (step === 1) {
          return;
        } else if (step === 2 && !data.username.trim()) {
          return;
        } else if (step === 5 && !acceptedTerms) {
          return;
        } else if (step === 9 && !data.apiMode) {
          return;
        }

        if (step < TOTAL_STEPS) {
          setStep(prev => prev + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, data, acceptedTerms]);

  useEffect(() => {
    if (isRecordingKey) {
      if (window.electronAPI && window.electronAPI.startRecording) window.electronAPI.startRecording();
    } else {
      if (window.electronAPI && window.electronAPI.stopRecording) window.electronAPI.stopRecording();
      return;
    }

    let activeKeys = [];

    const preventAllOSDefaults = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    };

    const handleRecordKeyDown = (e) => {
      preventAllOSDefaults(e);

      const combo = [];
      if (e.ctrlKey) combo.push('Ctrl');
      if (e.altKey) combo.push('Alt');
      if (e.shiftKey) combo.push('Shift');
      if (e.metaKey) combo.push('Win');

      const rawKey = e.key.toUpperCase();
      if (!['CONTROL', 'ALT', 'SHIFT', 'META'].includes(rawKey)) {
        const keyLabel = rawKey === ' ' ? 'Space' : e.key.length === 1 ? rawKey : e.key;
        if (!combo.includes(keyLabel)) {
          combo.push(keyLabel);
        }
      }

      const finalCombo = combo.slice(0, 3);
      if (finalCombo.length > 0) {
        activeKeys = finalCombo;
        setRecordedCombo(finalCombo);
      }
    };

    const handleRecordKeyUp = (e) => {
      preventAllOSDefaults(e);

      if (!e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
        if (activeKeys.length > 0) {
          setData(prev => ({ ...prev, shortcutKey: activeKeys.join('+') }));
          setIsRecordingKey(false);
          setIsShortcutVerified(false);
          setRecordedCombo([]);
        }
      }
    };

    window.addEventListener('keydown', handleRecordKeyDown, true);
    window.addEventListener('keyup', handleRecordKeyUp, true);
    window.addEventListener('keypress', preventAllOSDefaults, true);
    return () => {
      window.removeEventListener('keydown', handleRecordKeyDown, true);
      window.removeEventListener('keyup', handleRecordKeyUp, true);
      window.removeEventListener('keypress', preventAllOSDefaults, true);
      if (window.electronAPI && window.electronAPI.stopRecording) window.electronAPI.stopRecording();
    };
  }, [isRecordingKey]);

  useEffect(() => {
    if (step !== 7) return;

    const normalize = (key) => {
      const u = key.toUpperCase();
      if (u === 'CONTROL') return 'CTRL';
      if (u === 'SHIFT') return 'SHIFT';
      if (u === 'ALT') return 'ALT';
      if (u === 'META') return 'WIN';
      if (u === ' ') return 'SPACE';
      return u;
    };

    const handleKeyDown = (e) => {
      if (e.altKey || e.key === 'Alt') {
        e.preventDefault();
        e.stopPropagation();
      }
      const k = normalize(e.key);
      setPressedKeys(prev => {
        const nextState = { ...prev, [k]: true };
        const currentKeys = (data.shortcutKey || 'Ctrl+Shift').split('+').map(x => x.toUpperCase());
        const allMatch = currentKeys.length > 0 && currentKeys.every(ck => nextState[ck]);
        if (allMatch) {
          setIsShortcutVerified(true);
        }
        return nextState;
      });
    };

    const handleKeyUp = (e) => {
      if (e.altKey || e.key === 'Alt') {
        e.preventDefault();
        e.stopPropagation();
      }
      const k = normalize(e.key);
      setPressedKeys(prev => ({ ...prev, [k]: false }));
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
    };
  }, [step, data.shortcutKey]);

  const [authError, setAuthError] = useState('');

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  // Extracted from the inline onClick in the final step to keep JSX clean
  const handleFinishSetup = () => {
    const targetUid = data.userUid || ('user_' + Date.now());
    const payload = {
      uid: targetUid,
      userUid: targetUid,
      username: data.username || 'User',
      name: data.username || 'User',
      userEmail: data.userEmail || '',
      userPhoto: data.userPhoto || '',
      profileDescription: data.profileDescription || '',
      shortcutKey: data.shortcutKey || 'Ctrl+Shift',
      language: data.language || 'English',
      source: data.source || '',
      apiMode: data.apiMode || 'free_key',
      apiKey: data.apiKey || '',
      onboarded: true
    };

    // 1. Immediately complete onboarding so UI transitions with 0ms delay
    onComplete(payload);

    // 2. Fire-and-forget cloud & backend saves in background (non-blocking)
    Promise.allSettled([
      saveUserToFirebase(payload),
      saveUserDataToFirebase(targetUid, {
        onboarded: true,
        profile: {
          name: payload.name,
          username: payload.username,
          userEmail: payload.userEmail,
          userPhoto: payload.userPhoto,
          profileDescription: payload.profileDescription,
          shortcutKey: payload.shortcutKey,
          language: payload.language,
          source: payload.source
        },
        settings: {
          mode: payload.apiMode,
          groq_key: payload.apiKey,
          openai_key: payload.apiKey,
          gemini_key: payload.apiKey,
          ollama_url: "http://localhost:11434",
          ollama_model: "llama3",
          hotkey: payload.shortcutKey
        },
        memory: {
          user_name: payload.name,
          ai_name: "Ady",
          facts: { "User Profile/About": payload.profileDescription },
          conversation_history: []
        }
      }),
      fetch('http://localhost:8000/save-onboarding-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    ]).catch(err => console.warn("[Setup Background Save Notice]", err));
  };

  const processUserAuth = async (user) => {
    if (!user || !user.uid) return false;
    setIsSigningIn(true);
    setAuthError('');

    try {
      let cloudData = user.cloudData;
      if (!cloudData) {
        cloudData = await getUserDataFromFirebase(user.uid);
      }
      console.log("[Onboarding Auth] Cloud data for UID:", user.uid, cloudData);

      const isExistingUser = Boolean(cloudData && cloudData.onboarded !== false);

      if (isExistingUser) {
        console.log("[Onboarding Auth] User already onboarded! Restoring cloud profile & bypassing setup...");

        const restoredName = cloudData.profile?.name || cloudData.name || cloudData.username || user.name || (user.email ? user.email.split('@')[0] : 'User');
        const restoredUser = {
          uid: user.uid,
          userUid: user.uid,
          name: restoredName,
          username: restoredName,
          email: user.email || cloudData.email || '',
          userEmail: user.email || cloudData.email || '',
          photoURL: user.photoURL || cloudData.photoURL || '',
          userPhoto: user.photoURL || cloudData.photoURL || '',
          profileDescription: cloudData.profile?.profileDescription || cloudData.profileDescription || '',
          shortcutKey: cloudData.profile?.shortcutKey || cloudData.settings?.hotkey || cloudData.shortcutKey || 'Ctrl+Shift',
          language: cloudData.profile?.language || cloudData.language || 'English',
          source: cloudData.profile?.source || cloudData.source || '',
          apiMode: cloudData.settings?.mode || cloudData.apiMode || 'free_key',
          apiKey: cloudData.settings?.gemini_key || cloudData.settings?.openai_key || cloudData.apiKey || '',
          onboarded: true
        };

        // Fire all backend & Firestore syncs in parallel (non-blocking) for instant UI transition
        Promise.allSettled([
          fetch('http://localhost:8000/save-onboarding-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(restoredUser)
          }),
          cloudData.settings ? fetch('http://localhost:8000/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cloudData.settings)
          }) : null,
          cloudData.memory ? fetch('http://localhost:8000/sync-user-memory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cloudData.memory)
          }) : null,
          saveUserToFirebase(restoredUser),
          saveUserDataToFirebase(user.uid, { onboarded: true })
        ]).catch(err => console.warn("[Sync Warning]", err));

        setIsSigningIn(false);
        onComplete(restoredUser);
        return true;
      }
    } catch (err) {
      console.error("[Onboarding Auth] Error checking cloud data:", err);
    }

    // New user (not onboarded yet) -> prefill & proceed to Step 2
    const displayName = user.name || (user.email ? user.email.split('@')[0] : '');
    setData(prev => ({
      ...prev,
      username: displayName,
      userEmail: user.email || '',
      userPhoto: user.photoURL || '',
      userUid: user.uid
    }));
    setIsSigningIn(false);
    setStep(2);
    return false;
  };

  useEffect(() => {
    if (!window.electronAPI?.onGoogleAuthSuccess) return;
    window.electronAPI.onGoogleAuthSuccess(async (user) => {
      if (!user) return;
      await processUserAuth(user);
    });
  }, []);

  const handleGoogleSignIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setAuthError('');

    if (window.electronAPI?.startBrowserAuth) {
      window.electronAPI.startBrowserAuth();
    } else {
      try {
        const result = await loginWithGoogle();
        if (result.success && result.user) {
          await processUserAuth(result.user);
        } else {
          setIsSigningIn(false);
          setAuthError(result.error || 'Sign in failed.');
        }
      } catch (err) {
        setIsSigningIn(false);
        setAuthError(err.message || 'Sign in failed.');
      }
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="w-full h-full bg-[#0b0b0b] flex flex-col items-center justify-center relative">
            <div className="flex flex-col items-center mb-16" style={{ transform: 'translateY(-80px)' }}>
              <img src={logoImg} alt="adyber logo" className="w-36 h-36 mb-4 opacity-90 object-contain" />
              <h1 className="text-4xl font-bold tracking-tight text-white mb-3 lowercase" style={{ fontFamily: "'Nunito Sans', sans-serif" }}>adyber</h1>
              <p className="text-gray-400 text-sm">Your personal AI assistant.</p>
            </div>
            <div className="absolute bottom-24 flex flex-col items-center gap-3">
              <Button variant="google" onClick={handleGoogleSignIn} className={isSigningIn ? 'opacity-70 cursor-wait' : ''}>
                {isSigningIn ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" />
                    <span className="text-gray-600 font-medium">Signing in...</span>
                  </>
                ) : (
                  <>
                    <img src="https://www.google.com/favicon.ico" alt="G" className="w-5 h-5" />
                    Sign in with Google
                  </>
                )}
              </Button>
              {isSigningIn && (
                <button
                  onClick={() => { setIsSigningIn(false); setAuthError(''); }}
                  className="text-xs text-gray-600 hover:text-gray-400 underline transition-colors"
                >
                  Cancel
                </button>
              )}
              {authError && !isSigningIn && (
                <p className="text-red-400 text-xs font-medium max-w-xs text-center px-4 mt-1">
                  {authError.includes('auth/popup-closed-by-user')
                    ? 'Sign-in was cancelled. Try again.'
                    : authError}
                </p>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <Layout currentStep={step} totalSteps={TOTAL_STEPS} eyebrow="NAME" title="What should we call you?">
            <Input 
              placeholder="Your name" 
              value={data.username} 
              onChange={e => setData({...data, username: e.target.value})} 
            />
            <ActionRow onNext={nextStep} onPrev={prevStep} disableNext={!data.username.trim()} hideBack={true} />
          </Layout>
        );

      case 3:
        return (
          <Layout currentStep={step} totalSteps={TOTAL_STEPS} eyebrow="FEEDBACK" title="How did you hear about us?">
            <Input 
              placeholder="Twitter, YouTube, Friend..." 
              value={data.source} 
              onChange={e => setData({...data, source: e.target.value})} 
            />
            <ActionRow onNext={nextStep} onPrev={prevStep} />
          </Layout>
        );

      case 4:
        return (
          <Layout currentStep={step} totalSteps={TOTAL_STEPS} eyebrow="BEFORE WE CONTINUE" title="I'm going to ask you for a few permissions">
            <p className="text-sm text-gray-400 max-w-md mb-6">
              Ady is secure by design. During setup, we'll ask for these permissions to understand your work and help in the right places.
            </p>
            <div className="flex flex-col gap-3.5 w-full max-w-md items-center">
              <PermissionCard 
                icon={<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>}
                title="Microphone" 
                desc="Capture voice commands and meeting notes." 
              />
              <PermissionCard 
                icon={<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>}
                title="Control apps & browser" 
                desc="Automatically open apps and search the web." 
              />
            </div>
            <ActionRow onNext={nextStep} onPrev={prevStep} />
          </Layout>
        );

      case 5:
        return (
          <Layout currentStep={step} totalSteps={TOTAL_STEPS} eyebrow="ALMOST THERE" title="Accept terms and conditions">
            <div 
              className="flex items-center justify-center gap-3.5 px-4 py-2 cursor-pointer transition-opacity hover:opacity-90"
              onClick={() => setAcceptedTerms(!acceptedTerms)}
            >
              <input 
                type="checkbox" 
                checked={acceptedTerms}
                onChange={e => setAcceptedTerms(e.target.checked)}
                className="w-5 h-5 accent-white rounded cursor-pointer shrink-0"
              />
              <span className="text-xs text-gray-300 whitespace-nowrap">
                By continuing, you agree to our{' '}
                <a 
                  href="https://adyber.com/terms" 
                  target="_blank" 
                  rel="noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="text-white underline hover:text-blue-400 font-medium"
                >
                  Terms of Service
                </a>{' '}
                and{' '}
                <a 
                  href="https://adyber.com/privacy" 
                  target="_blank" 
                  rel="noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="text-white underline hover:text-blue-400 font-medium"
                >
                  Privacy Policy
                </a>.
              </span>
            </div>
            <ActionRow onNext={nextStep} onPrev={prevStep} disableNext={!acceptedTerms} />
          </Layout>
        );

      case 6:
        return (
          <Layout currentStep={step} totalSteps={TOTAL_STEPS} eyebrow="PROFILE" title="Set up your profile" showSkip={true} onSkip={nextStep}>
            <textarea 
              placeholder="Tell me a bit about yourself..." 
              value={data.profileDescription}
              onChange={e => setData({...data, profileDescription: e.target.value})}
              className="w-full max-w-md bg-[#141414] border border-[#2e2e2e] focus:border-white rounded-2xl text-white placeholder-gray-400 outline-none transition-all text-base h-40 resize-none shadow-lg leading-relaxed"
              style={{ padding: '24px' }}
            />
            <ActionRow onNext={nextStep} onPrev={prevStep} />
          </Layout>
        );

      case 7: {
        const displayedKeys = isRecordingKey
          ? recordedCombo
          : (data.shortcutKey ? data.shortcutKey.split('+') : ['Ctrl', 'Shift']);

        return (
          <Layout currentStep={step} totalSteps={TOTAL_STEPS} eyebrow="SHORTCUT" title="Let's set your shortcut" showSkip={true} onSkip={nextStep}>
            <div 
              onClick={() => { setIsRecordingKey(true); setIsShortcutVerified(false); setRecordedCombo([]); }}
              className={`bg-[#141414] border ${isRecordingKey ? 'border-white animate-pulse' : isShortcutVerified ? 'border-white shadow-[0_0_25px_rgba(255,255,255,0.3)]' : 'border-[#242424] hover:border-[#444]'} rounded-[24px] w-[360px] h-[155px] flex flex-col items-center justify-center pt-1 pb-7 shadow-xl cursor-pointer transition-all relative`}
            >
              <div className="flex items-center gap-3.5 mt-1 min-h-[56px]">
                {displayedKeys.map((k, idx) => {
                  const normKey = k.toUpperCase();
                  const isPressed = isRecordingKey ? true : (!!pressedKeys[normKey] || isShortcutVerified);
                  return (
                    <React.Fragment key={idx}>
                      {idx > 0 && <span className="text-gray-500 font-bold text-lg">+</span>}
                      <div 
                        className={`min-w-[80px] px-4 h-14 rounded-xl flex items-center justify-center font-bold text-base shadow-lg transition-all duration-200 ease-out border ${
                          isPressed 
                            ? 'bg-white text-black border-white scale-105 shadow-[0_0_20px_rgba(255,255,255,0.7)]' 
                            : 'bg-[#242424] text-white border-[#333] shadow-inner'
                        }`}
                      >
                        {k}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
              <div className="absolute bottom-3 text-gray-400 text-xs font-medium">
                {isRecordingKey ? 'Press up to 3 keys, then release to set...' : isShortcutVerified ? '✓ Shortcut verified & working!' : 'Press your keys to test or click to record'}
              </div>
            </div>
            <ActionRow onNext={nextStep} onPrev={prevStep} />
          </Layout>
        );
      }

      case 8:
        return (
          <div className="w-full h-full bg-[#0b0b0b] flex flex-col items-center justify-center relative overflow-hidden">
            <Confetti mode="boom" particleCount={120} shapeSize={14} x={0.1} y={0.7} spreadDeg={50} launchSpeed={1.5} colors={['#3b82f6', '#8b5cf6', '#ec4899', '#ffffff']} />
            <Confetti mode="boom" particleCount={120} shapeSize={14} x={0.9} y={0.7} spreadDeg={50} launchSpeed={1.5} colors={['#3b82f6', '#8b5cf6', '#ec4899', '#ffffff']} />

            {/* Centered heading block */}
            <div className="flex flex-col items-center z-10" style={{ marginBottom: '0' }}>
              <h1 className="text-4xl font-bold tracking-tighter text-white" style={{ marginBottom: '8px' }}>You're all set.</h1>
              <p className="text-gray-500 text-sm">Ady is ready to assist you.</p>
            </div>

            {/* Button pinned below center */}
            <div className="absolute z-10" style={{ top: 'calc(50% + 80px)' }}>
              <Button variant="primary" className="w-56 font-bold" onClick={handleFinishSetup}>Finish Setup</Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-screen h-screen bg-[#0b0b0b] overflow-hidden rounded-3xl relative border border-[#222]">
      <Titlebar />
      {renderStep()}
    </div>
  );
}
