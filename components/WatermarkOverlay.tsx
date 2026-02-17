
import React from 'react';
import { WatermarkState } from '../types';

interface WatermarkOverlayProps {
  config: WatermarkState;
}

const WatermarkOverlay: React.FC<WatermarkOverlayProps> = ({ config }) => {
  if (config.type === 'none') return null;

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    userSelect: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0, // Behind content
    overflow: 'hidden',
  };

  if (config.type === 'image' && config.src) {
    return (
      <div style={containerStyle}>
        <img
          src={config.src}
          alt="watermark"
          style={{
            opacity: config.opacity,
            transform: `rotate(${config.rotation}deg)`,
            maxWidth: '80%',
            maxHeight: '80%',
          }}
        />
      </div>
    );
  }

  if (config.type === 'text' && config.text) {
    return (
      <div style={containerStyle}>
        <div
          style={{
            color: config.color,
            fontSize: `${config.fontSize}px`,
            fontWeight: 'bold',
            opacity: config.opacity,
            transform: `rotate(${config.rotation}deg)`,
            whiteSpace: 'nowrap',
          }}
        >
          {config.text}
        </div>
      </div>
    );
  }

  return null;
};

export default WatermarkOverlay;
