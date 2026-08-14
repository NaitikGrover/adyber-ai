import React from 'react';
import { Orb as OrbComponent } from 'orb-ui';
import { OrbState } from './types';
import { SoundwaveVisualizer } from './SoundwaveVisualizer';

const stateMap = {
  [OrbState.IDLE]: 'idle',
  [OrbState.LISTENING]: 'listening',
  [OrbState.PROCESSING]: 'thinking',
  [OrbState.SPEAKING]: 'speaking'
};

export function Orb({ state = OrbState.IDLE, volume = 0.0, onClick }) {
  const currentState = stateMap[state] || 'idle';
  const displayState = currentState === 'idle' ? 'listening' : currentState;
  const displayVolume = currentState === 'idle' ? Math.max(0.04, volume) : volume;

  return (
    <div 
      onClick={onClick}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        cursor: 'grab'
      }}
      title="Click to speak or Drag to move on screen"
    >
      {/* 1. Cloud Orb on far left */}
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, marginLeft: '1px' }}>
        <OrbComponent
          theme="cloud"
          state={displayState}
          volume={displayVolume}
          size={32}
          interactive={false}
        />
      </div>

      {/* 2. Dynamic Audio Visualizer or Loading Bar */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        marginLeft: '1px',
        marginRight: '12px'
      }}>
        <SoundwaveVisualizer volume={volume} state={state} />
      </div>
    </div>
  );
}
