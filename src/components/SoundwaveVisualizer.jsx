import React, { useEffect, useRef } from 'react';
import { OrbState } from './types';

export function SoundwaveVisualizer({ volume = 0.0, state = OrbState.IDLE }) {
  const barsRef = useRef([]);
  const targetVolRef = useRef(volume);
  const currentVolRef = useRef(0);
  const animFrameRef = useRef(null);

  useEffect(() => {
    let smoothedTarget = Math.pow(Math.max(0, volume), 0.65) * 1.6;
    if (state === OrbState.LISTENING && smoothedTarget < 0.06) {
      smoothedTarget = 0.06;
    }
    targetVolRef.current = smoothedTarget;
  }, [volume, state]);

  useEffect(() => {
    let startTime = performance.now();

    const animate = (now) => {
      const elapsed = (now - startTime) / 1000;
      
      currentVolRef.current += (targetVolRef.current - currentVolRef.current) * 0.16;
      const v = currentVolRef.current;

      const isListening = state === OrbState.LISTENING;
      const isSpeaking = state === OrbState.SPEAKING;

      const barMultipliers = [0.35, 0.65, 1.0, 1.35, 1.35, 1.0, 0.65, 0.35];
      const phaseOffsets = [0.0, 0.7, 1.4, 2.1, 2.8, 3.5, 4.2, 4.9];

      barsRef.current.forEach((bar, idx) => {
        if (!bar) return;
        const mult = barMultipliers[idx];
        const phase = phaseOffsets[idx];

        let baseHeight = 4;
        let wave = 0;

        if (isListening || isSpeaking) {
          const sine = (Math.sin(elapsed * 7 + phase) + 1) / 2;
          wave = (v * 24 * mult) * (0.55 + 0.45 * sine);
          baseHeight = 5;
        }

        const finalHeight = Math.max(baseHeight, Math.min(22, baseHeight + wave));
        bar.style.height = `${finalHeight}px`;
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [state]);

  if (state === OrbState.PROCESSING) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 22, marginLeft: '8px' }}>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          style={{ color: '#ffffff' }}
        >
          <circle cx="4" cy="12" r="2" fill="currentColor">
            <animate
              id="spinner_qFRN"
              begin="0;spinner_OcgL.end+0.25s"
              attributeName="cy"
              calcMode="spline"
              dur="0.6s"
              values="12;6;12"
              keySplines=".33,.66,.66,1;.33,0,.66,.33"
            />
          </circle>
          <circle cx="12" cy="12" r="2" fill="currentColor">
            <animate
              begin="spinner_qFRN.begin+0.1s"
              attributeName="cy"
              calcMode="spline"
              dur="0.6s"
              values="12;6;12"
              keySplines=".33,.66,.66,1;.33,0,.66,.33"
            />
          </circle>
          <circle cx="20" cy="12" r="2" fill="currentColor">
            <animate
              id="spinner_OcgL"
              begin="spinner_qFRN.begin+0.2s"
              attributeName="cy"
              calcMode="spline"
              dur="0.6s"
              values="12;6;12"
              keySplines=".33,.66,.66,1;.33,0,.66,.33"
            />
          </circle>
        </svg>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3.5, height: 22 }}>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((_, idx) => (
        <div
          key={idx}
          ref={(el) => (barsRef.current[idx] = el)}
          style={{
            width: 3,
            height: '4px',
            borderRadius: 3,
            backgroundColor: '#ffffff',
            willChange: 'height'
          }}
        />
      ))}
    </div>
  );
}
