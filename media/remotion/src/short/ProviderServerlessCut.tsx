import React from 'react';
import {AbsoluteFill, Sequence, staticFile} from 'remotion';
import {Audio} from '@remotion/media';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {wipe} from '@remotion/transitions/wipe';
import evidenceData from '../generated/evidence.json';
import captionsData from '../generated/short-captions.json';
import {BurnedCaptions} from '../Captions';
import {ProductArt, SceneFrame, Stat} from '../Shared';
import {Terminal} from '../Terminal';
import {colors, mono} from '../theme';
import type {Caption, Evidence} from '../types';

const evidence = evidenceData as Evidence;
const captions = captionsData as Caption[];
const sceneDurations = [192, 192, 192, 192, 180];
const starts = [0, 180, 360, 540, 720];

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
  <SceneFrame eyebrow="ONE PACKAGE · TWO SURFACES" title={<>Pick the boundary<br /><span style={{color: colors.green}}>your job needs.</span></>}>
    <div style={{position: 'absolute', left: 92, right: 92, top: 420, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24}}>
      <div style={{padding: 34, border: `2px solid ${colors.green}`, backgroundColor: colors.panelStrong}}>
        <div style={{fontFamily: mono, color: colors.green, fontSize: 21, marginBottom: 18}}>HARDENED NODE CLI</div>
        <div style={{fontSize: 47, fontWeight: 760, lineHeight: 1.14}}>Full network controls for local agent workflows.</div>
      </div>
      <div style={{padding: 34, border: `2px solid ${colors.blue}`, backgroundColor: colors.panelStrong}}>
        <div style={{fontFamily: mono, color: colors.blue, fontSize: 21, marginBottom: 18}}>RESTRICTED WORKER</div>
        <div style={{fontSize: 47, fontWeight: 760, lineHeight: 1.14}}>Small allowlisted HTML crawls over an API.</div>
      </div>
    </div>
  </SceneFrame>
);

const DoctorScene: React.FC = () => (
  <SceneFrame eyebrow="CAPABILITY IS OBSERVABLE" title={<>Run doctor.<br /><span style={{color: colors.blue}}>See the truth.</span></>}>
    <div style={{position: 'absolute', left: 92, right: 92, top: 390}}>
      <Terminal title={`${evidence.packageName}@${evidence.packageVersion}`} command="cockroach-sources doctor" lines={evidence.doctorLines} maxLines={5} accent={colors.blue} />
    </div>
  </SceneFrame>
);

const ProviderScene: React.FC = () => (
  <SceneFrame eyebrow="OFFICIAL READ-ONLY ACCESS" title={<>No hidden<br /><span style={{color: colors.amber}}>credential fallback.</span></>}>
    <div style={{position: 'absolute', right: 92, top: 340}}><ProductArt file="provider-map.svg" label="Public web plus explicit API adapters" width={720} /></div>
    <div style={{position: 'absolute', left: 92, bottom: 188, width: 800, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
      <Stat label="WEB" value="READY" />
      <Stat label="GITHUB" value="READY" />
      <Stat label="YOUTUBE" value="PARTIAL" color={colors.blue} />
      <Stat label="X + REDDIT" value="CREDENTIALS" color={colors.amber} />
    </div>
  </SceneFrame>
);

const WorkerScene: React.FC = () => (
  <SceneFrame eyebrow="SERVERLESS, WITH A SMALLER CLAIM" title={<>Allowlist first.<br /><span style={{color: colors.green}}>Fetch second.</span></>}>
    <div style={{position: 'absolute', right: 92, top: 340}}><ProductArt file="crawl-gate.svg" label="URL-origin allowlist only · no DNS pinning" width={720} /></div>
    <div style={{position: 'absolute', left: 92, bottom: 195, width: 800, fontFamily: mono, fontSize: 27, display: 'flex', flexDirection: 'column', gap: 20}}>
      {['HTTPS ORIGIN ALLOWLIST', 'BEARER SECRET REQUIRED', 'RATE LIMIT BINDING', 'REDIRECT ESCAPE BLOCKED'].map((line) => <div key={line} style={{color: colors.greenSoft}}>✓ {line}</div>)}
    </div>
  </SceneFrame>
);

const ChoiceScene: React.FC = () => (
  <SceneFrame eyebrow="" title="">
    <div style={{position: 'absolute', top: 72, left: 92, right: 92, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: mono, fontSize: 20, letterSpacing: 2.4, color: colors.muted}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 14}}><span style={{width: 12, height: 12, borderRadius: 99, backgroundColor: colors.green}} />COCKROACH CRAWLER</div>
      <div>BOUNDED PUBLIC-WEB EVIDENCE</div>
    </div>
    <div style={{position: 'absolute', top: 140, left: 92, right: 92}}>
      <div style={{fontFamily: mono, color: colors.green, fontSize: 23, letterSpacing: 2.6, marginBottom: 22}}>MAKE THE BOUNDARY EXPLICIT</div>
      <div style={{fontSize: 84, fontWeight: 780, lineHeight: 1.01, letterSpacing: -3.8}}>Structured records.<br /><span style={{color: colors.green}}>No capability theatre.</span></div>
      <div style={{fontSize: 31, lineHeight: 1.36, color: colors.muted, maxWidth: 1080, marginTop: 22}}>Stable 0.2.0 is on npm. Provider adapters and the Worker are in the 0.3.0-alpha.1 source candidate.</div>
    </div>
    <div style={{position: 'absolute', left: 92, right: 92, bottom: 190, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16}}>
      <Stat label="LOCAL" value="HARDENED" />
      <Stat label="WORKER" value="RESTRICTED" color={colors.blue} />
      <Stat label="LICENSE" value="MIT" />
    </div>
  </SceneFrame>
);

const transition = linearTiming({durationInFrames: 12});

export const ProviderServerlessCut: React.FC = () => (
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
    <BurnedCaptions captions={captions} />
  </AbsoluteFill>
);
