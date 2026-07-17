import React from 'react';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {colors, mono} from './theme';

export const Terminal: React.FC<{
  title: string;
  command: string;
  lines: string[];
  accent?: string;
  maxLines?: number;
}> = ({title, command, lines, accent = colors.green, maxLines = 12}) => {
  const frame = useCurrentFrame();
  const visibleLines = Math.max(
    1,
    Math.min(
      maxLines,
      Math.floor(
        interpolate(frame, [8, 46], [1, maxLines], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
      ),
    ),
  );

  return (
    <div
      style={{
        width: '100%',
        border: `2px solid ${colors.line}`,
        backgroundColor: '#030806',
        boxShadow: '0 26px 80px rgba(0,0,0,.38)',
        overflow: 'hidden',
        borderRadius: 18,
        fontFamily: mono,
      }}
    >
      <div
        style={{
          height: 52,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 20px',
          borderBottom: `1px solid ${colors.line}`,
          color: colors.muted,
          fontSize: 21,
        }}
      >
        <span style={{width: 12, height: 12, borderRadius: 99, backgroundColor: colors.red}} />
        <span style={{width: 12, height: 12, borderRadius: 99, backgroundColor: colors.amber}} />
        <span style={{width: 12, height: 12, borderRadius: 99, backgroundColor: colors.green}} />
        <span style={{marginLeft: 10}}>{title}</span>
      </div>
      <div style={{padding: '22px 30px 26px', minHeight: 300}}>
        <div style={{fontSize: 25, color: colors.text, marginBottom: 22}}>
          <span style={{color: accent}}>$</span> {command}
        </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
          {lines.slice(0, visibleLines).map((line, index) => {
            const statusColor = line.includes('missing_credentials')
              ? colors.amber
              : line.includes('partial')
                ? colors.blue
                : line.includes('ready') || line.includes('pass') || line.startsWith('✔')
                  ? colors.greenSoft
                  : colors.muted;
            return (
              <div
                key={`${index}-${line}`}
                style={{
                  color: statusColor,
                  fontSize: 20,
                  lineHeight: 1.34,
                  opacity: interpolate(frame, [8 + index * 3, 18 + index * 3], [0, 1], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                  }),
                }}
              >
                {line}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
