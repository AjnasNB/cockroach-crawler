import React from 'react';
import {AbsoluteFill, Easing, Img, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Audio} from '@remotion/media';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {wipe} from '@remotion/transitions/wipe';
import evidenceData from '../generated/evidence.json';
import captionsData from '../generated/short-captions.json';
import {BurnedCaptions} from '../Captions';
import {ProductArt, Stat} from '../Shared';
import {Terminal} from '../Terminal';
import {colors, mono, sans} from '../theme';
import type {Caption, Evidence} from '../types';

const evidence = evidenceData as Evidence;
const captions = captionsData as Caption[];
const sceneDurations = [192, 192, 192, 192, 180];
const starts = [0, 180, 360, 540, 720];

const VerticalFrame: React.FC<{
  eyebrow: string;
  title: React.ReactNode;
  body?: React.ReactNode;
  children?: React.ReactNode;
}> = ({eyebrow, title, body, children}) => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
        backgroundImage:
          'linear-gradient(rgba(121,242,166,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(121,242,166,.045) 1px, transparent 1px), radial-gradient(circle at 72% 20%, rgba(121,242,166,.14), transparent 30%)',
        backgroundSize: '44px 44px, 44px 44px, auto',
        color: colors.text,
        fontFamily: sans,
        overflow: 'hidden',
      }}
    >
      <div style={{position: 'absolute', top: 86, left: 72, right: 150, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: mono, fontSize: 17, letterSpacing: 1.7, color: colors.muted}}>
        <span style={{display: 'flex', alignItems: 'center', gap: 12}}><span style={{width: 11, height: 11, borderRadius: 99, backgroundColor: colors.green}} />COCKROACH CRAWLER</span>
        <span>30S VERTICAL</span>
      </div>
      <div style={{position: 'absolute', top: 190, left: 72, right: 150, opacity: enter, transform: `translateY(${(1 - enter) * 24}px)`}}>
        <div style={{fontFamily: mono, color: colors.green, fontSize: 21, letterSpacing: 2.1, marginBottom: 18}}>{eyebrow}</div>
        <div style={{fontSize: 72, fontWeight: 790, lineHeight: 1.02, letterSpacing: -3.2}}>{title}</div>
        {body ? <div style={{fontSize: 27, lineHeight: 1.36, color: colors.muted, marginTop: 20}}>{body}</div> : null}
      </div>
      {children}
    </AbsoluteFill>
  );
};

const Narration: React.FC = () => (
  <>
    {starts.map((start, index) => (
      <Sequence key={start} from={start + 6} durationInFrames={sceneDurations[index] - 8}>
        <Audio src={staticFile(`audio/short/scene-${String(index + 1).padStart(2, '0')}.wav`)} volume={0.96} />
      </Sequence>
    ))}
  </>
);

const SurfaceScene: React.FC = () => (
  <VerticalFrame eyebrow="ONE PACKAGE · TWO SURFACES" title={<>Pick the boundary<br /><span style={{color: colors.green}}>your job needs.</span></>}>
    <div style={{position: 'absolute', top: 555, left: 72, right: 150, display: 'grid', gap: 16}}>
      <div style={{padding: '26px 28px', border: `2px solid ${colors.green}`, backgroundColor: colors.panelStrong}}>
        <div style={{fontFamily: mono, color: colors.green, fontSize: 18, marginBottom: 12}}>HARDENED NODE CLI</div>
        <div style={{fontSize: 35, fontWeight: 760, lineHeight: 1.16}}>Full network controls for local agent workflows.</div>
      </div>
      <div style={{padding: '26px 28px', border: `2px solid ${colors.blue}`, backgroundColor: colors.panelStrong}}>
        <div style={{fontFamily: mono, color: colors.blue, fontSize: 18, marginBottom: 12}}>RESTRICTED WORKER</div>
        <div style={{fontSize: 35, fontWeight: 760, lineHeight: 1.16}}>Small allowlisted HTML crawls over an API.</div>
      </div>
    </div>
    <div style={{position: 'absolute', top: 1005, left: 72}}>
      <ProductArt file="crawl-gate.svg" width={858} imageHeight={390} label="URL → explicit policy gate → structured records" />
    </div>
  </VerticalFrame>
);

const DoctorScene: React.FC = () => (
  <VerticalFrame eyebrow="CAPABILITY IS OBSERVABLE" title={<>Run doctor.<br /><span style={{color: colors.blue}}>See the truth.</span></>}>
    <div style={{position: 'absolute', top: 550, left: 72, right: 150}}>
      <Terminal title={`${evidence.packageName}@${evidence.packageVersion}`} command="cockroach-sources doctor" lines={evidence.doctorLines} maxLines={5} accent={colors.blue} />
    </div>
    <div style={{position: 'absolute', top: 1050, left: 72, right: 150, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
      <Stat label="WEB" value="READY" />
      <Stat label="GITHUB" value="READY" />
      <Stat label="YOUTUBE" value="PARTIAL" color={colors.blue} />
      <Stat label="X + REDDIT" value="CREDENTIALS" color={colors.amber} />
    </div>
  </VerticalFrame>
);

const ProviderScene: React.FC = () => (
  <VerticalFrame eyebrow="OFFICIAL READ-ONLY ACCESS" title={<>No hidden<br /><span style={{color: colors.amber}}>credential fallback.</span></>} body="Public web plus explicit provider APIs. Status remains visible when credentials are absent.">
    <div style={{position: 'absolute', top: 650, left: 72}}>
      <ProductArt file="provider-map.svg" width={858} imageHeight={520} label="Exact capability state for every source adapter" />
    </div>
    <div style={{position: 'absolute', top: 1300, left: 72, right: 150, padding: '28px 30px', border: `2px solid ${colors.amber}`, backgroundColor: colors.panelStrong, fontFamily: mono, fontSize: 23, lineHeight: 1.5}}>
      NO COOKIE SCRAPING<br />NO CREDENTIAL FALLBACK<br />NO UNIVERSAL-ACCESS CLAIM
    </div>
  </VerticalFrame>
);

const WorkerScene: React.FC = () => (
  <VerticalFrame eyebrow="SERVERLESS, WITH A SMALLER CLAIM" title={<>Allowlist first.<br /><span style={{color: colors.green}}>Fetch second.</span></>}>
    <div style={{position: 'absolute', top: 560, left: 72}}>
      <ProductArt file="serverless-allowlist.svg" width={858} imageHeight={470} label="URL-origin allowlist only · redirect escape blocked" />
    </div>
    <div style={{position: 'absolute', top: 1160, left: 72, right: 150, fontFamily: mono, fontSize: 25, display: 'flex', flexDirection: 'column', gap: 20}}>
      {['HTTPS ORIGIN ALLOWLIST', 'BEARER SECRET REQUIRED', 'RATE LIMIT BINDING', 'HTML ONLY · NO DNS PINNING'].map((line) => <div key={line} style={{paddingBottom: 14, borderBottom: `1px solid ${colors.line}`, color: colors.greenSoft}}>✓ {line}</div>)}
    </div>
  </VerticalFrame>
);

const ChoiceScene: React.FC = () => (
  <VerticalFrame eyebrow="MAKE THE BOUNDARY EXPLICIT" title={<>Structured records.<br /><span style={{color: colors.green}}>No capability theatre.</span></>} body="Stable 0.2.0 is on npm. Provider adapters and the Worker remain the 0.3.0-alpha.1 source candidate.">
    <div style={{position: 'absolute', top: 655, left: 72, right: 150, display: 'grid', gap: 16}}>
      <div style={{padding: '30px 32px', border: `2px solid ${colors.green}`, backgroundColor: colors.panelStrong}}>
        <div style={{fontFamily: mono, color: colors.green, fontSize: 19, marginBottom: 12}}>LOCAL / HARDENED</div>
        <div style={{fontSize: 38, fontWeight: 770}}>Control-rich workflows</div>
      </div>
      <div style={{padding: '30px 32px', border: `2px solid ${colors.blue}`, backgroundColor: colors.panelStrong}}>
        <div style={{fontFamily: mono, color: colors.blue, fontSize: 19, marginBottom: 12}}>WORKER / RESTRICTED</div>
        <div style={{fontSize: 38, fontWeight: 770}}>Small allowlisted jobs</div>
      </div>
    </div>
    <div style={{position: 'absolute', top: 1115, left: 72, right: 150, display: 'flex', alignItems: 'center', gap: 28, padding: '34px 36px', border: `2px solid ${colors.line}`, backgroundColor: '#030806'}}>
      <Img src={staticFile('assets/mark.svg')} style={{width: 94, height: 94}} />
      <div>
        <div style={{fontFamily: mono, color: colors.green, fontSize: 19, marginBottom: 10}}>OPEN SOURCE · MIT</div>
        <div style={{fontSize: 38, fontWeight: 780}}>cockroachcrawler.com</div>
      </div>
    </div>
  </VerticalFrame>
);

const transition = linearTiming({durationInFrames: 12});

export const ProviderServerlessVerticalShort: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: colors.bg}}>
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={sceneDurations[0]}><SurfaceScene /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({direction: 'from-left'})} timing={transition} />
      <TransitionSeries.Sequence durationInFrames={sceneDurations[1]}><DoctorScene /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({direction: 'from-right'})} timing={transition} />
      <TransitionSeries.Sequence durationInFrames={sceneDurations[2]}><ProviderScene /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({direction: 'from-left'})} timing={transition} />
      <TransitionSeries.Sequence durationInFrames={sceneDurations[3]}><WorkerScene /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({direction: 'from-right'})} timing={transition} />
      <TransitionSeries.Sequence durationInFrames={sceneDurations[4]}><ChoiceScene /></TransitionSeries.Sequence>
    </TransitionSeries>
    <Narration />
    <BurnedCaptions captions={captions} bottom={230} horizontalPadding={72} fontSize={42} maxWidth={820} />
  </AbsoluteFill>
);
