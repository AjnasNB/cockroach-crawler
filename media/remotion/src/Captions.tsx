import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors, sans} from './theme';
import type {Caption} from './types';

export const BurnedCaptions: React.FC<{
  captions: Caption[];
  bottom?: number;
  horizontalPadding?: number;
  fontSize?: number;
  maxWidth?: number;
}> = ({captions, bottom = 54, horizontalPadding = 90, fontSize = 42, maxWidth = 1530}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const nowMs = (frame / fps) * 1000;
  const active = captions.find((caption) => caption.startMs <= nowMs && caption.endMs > nowMs);

  if (!active) {
    return null;
  }

  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: bottom,
        paddingLeft: horizontalPadding,
        paddingRight: horizontalPadding,
        fontFamily: sans,
      }}
    >
      <div
        role="status"
        aria-live="polite"
        style={{
          maxWidth,
          padding: '16px 26px 18px',
          borderLeft: `7px solid ${colors.green}`,
          backgroundColor: 'rgba(2, 7, 5, .9)',
          boxShadow: '0 14px 44px rgba(0,0,0,.45)',
          color: colors.text,
          fontSize,
          fontWeight: 720,
          lineHeight: 1.22,
          textAlign: 'center',
          letterSpacing: -0.6,
        }}
      >
        {active.text}
      </div>
    </AbsoluteFill>
  );
};
