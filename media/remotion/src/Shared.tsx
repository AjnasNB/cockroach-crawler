import React from 'react';
import {Img, Easing, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {colors, mono, sans} from './theme';

export const SceneFrame: React.FC<{
  eyebrow: string;
  title: React.ReactNode;
  body?: React.ReactNode;
  children?: React.ReactNode;
  marker?: string;
}> = ({eyebrow, title, body, children, marker = 'COCKROACH CRAWLER'}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        padding: '72px 92px 142px',
        boxSizing: 'border-box',
        backgroundColor: colors.bg,
        backgroundImage:
          'linear-gradient(rgba(121,242,166,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(121,242,166,.045) 1px, transparent 1px), radial-gradient(circle at 78% 24%, rgba(121,242,166,.13), transparent 32%)',
        backgroundSize: '44px 44px, 44px 44px, auto',
        color: colors.text,
        fontFamily: sans,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'absolute',
          top: 72,
          left: 92,
          right: 92,
          fontFamily: mono,
          fontSize: 20,
          letterSpacing: 2.4,
          color: colors.muted,
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
          <span style={{width: 12, height: 12, borderRadius: 99, backgroundColor: colors.green}} />
          {marker}
        </div>
        <div>BOUNDED PUBLIC-WEB EVIDENCE</div>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 140,
          left: 92,
          right: 92,
          opacity: interpolate(frame, [0, 16], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          translate: interpolate(frame, [0, 18], ['0px 24px', '0px 0px'], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <div style={{fontFamily: mono, color: colors.green, fontSize: 23, letterSpacing: 2.6, marginBottom: 22}}>
          {eyebrow}
        </div>
        <div style={{fontSize: 84, fontWeight: 780, lineHeight: 1.01, letterSpacing: -3.8, maxWidth: 1120}}>{title}</div>
        {body ? <div style={{fontSize: 31, lineHeight: 1.36, color: colors.muted, maxWidth: 1080, marginTop: 22}}>{body}</div> : null}
      </div>
      {children}
    </div>
  );
};

export const ProductArt: React.FC<{file: string; label: string; width?: number; imageHeight?: number}> = ({file, label, width = 690, imageHeight = 520}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        width,
        border: `2px solid ${colors.line}`,
        backgroundColor: colors.panel,
        boxShadow: '0 30px 90px rgba(0,0,0,.36)',
        opacity: interpolate(frame, [8, 26], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        scale: interpolate(frame, [8, 32], [0.97, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
      }}
    >
      <Img src={staticFile(`assets/${file}`)} style={{display: 'block', width: '100%', height: imageHeight, objectFit: 'cover'}} />
      <div style={{padding: '15px 20px 17px', borderTop: `1px solid ${colors.line}`, color: colors.greenSoft, fontFamily: mono, fontSize: 18}}>{label}</div>
    </div>
  );
};

export const Stat: React.FC<{label: string; value: string; color?: string}> = ({label, value, color = colors.green}) => (
  <div style={{padding: '22px 24px', border: `1px solid ${colors.line}`, backgroundColor: 'rgba(10,23,19,.94)'}}>
    <div style={{fontFamily: mono, fontSize: 17, color: colors.muted, letterSpacing: 1.3, marginBottom: 12}}>{label}</div>
    <div style={{fontFamily: mono, fontSize: 31, color, fontWeight: 720}}>{value}</div>
  </div>
);
