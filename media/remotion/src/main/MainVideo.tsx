import React from 'react';
import {AbsoluteFill, Img, Sequence, staticFile} from 'remotion';
import {Audio} from '@remotion/media';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {wipe} from '@remotion/transitions/wipe';
import evidenceData from '../generated/evidence.json';
import captionsData from '../generated/main-captions.json';
import {BurnedCaptions} from '../Captions';
import {ProductArt, SceneFrame, Stat} from '../Shared';
import {Terminal} from '../Terminal';
import {colors, mono, sans} from '../theme';
import type {Caption, Evidence} from '../types';

const evidence = evidenceData as Evidence;
const captions = captionsData as Caption[];
const sceneDurations = [315, 315, 315, 315, 315, 300];
const starts = [0, 300, 600, 900, 1200, 1500];

const Narration: React.FC = () => (
  <>
    {starts.map((start, index) => (
      <Sequence key={start} from={start + 15} durationInFrames={sceneDurations[index] - 22}>
        <Audio src={staticFile(`audio/main/scene-${String(index + 1).padStart(2, '0')}.wav`)} volume={0.96} />
      </Sequence>
    ))}
  </>
);

const IntroScene: React.FC = () => (
  <SceneFrame
    eyebrow="ONE CONTROLLED PATH"
    title={<>Bounded crawling.<br /><span style={{color: colors.green}}>Verifiable output.</span></>}
    body={<span style={{display: 'block', maxWidth: 820}}>Cockroach Crawler gives agent workflows a public-web evidence path with explicit network and resource limits.</span>}
  >
    <div style={{position: 'absolute', right: 92, top: 270}}>
      <ProductArt file="crawl-gate.svg" width={700} label="URL → policy gate → structured records" />
    </div>
    <div style={{position: 'absolute', left: 92, bottom: 175, width: 770, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
      <Stat label="RUNTIME" value="NODE 20+" />
      <Stat label="DEFAULT" value="FAIL CLOSED" />
    </div>
  </SceneFrame>
);

const BoundaryScene: React.FC = () => (
  <SceneFrame
    eyebrow="HARDENED LOCAL CLI"
    title={<>Check before<br /><span style={{color: colors.green}}>network dispatch.</span></>}
    body="The local tier validates authority at every hop—not just at the first URL."
  >
    <div style={{position: 'absolute', right: 92, top: 270}}>
      <ProductArt file="security-boundary.svg" width={690} label="DNS and redirect validation on every request" />
    </div>
    <div style={{position: 'absolute', left: 92, bottom: 176, width: 770, display: 'flex', flexDirection: 'column', gap: 14, fontFamily: mono, fontSize: 25}}>
      {['PUBLIC NETWORK ONLY', 'ROBOTS.TXT FAILS CLOSED', 'EXACT BYTE + REQUEST BUDGETS', 'REDIRECTS RE-VALIDATED'].map((item, index) => (
        <div key={item} style={{display: 'flex', alignItems: 'center', gap: 18, color: colors.text}}>
          <span style={{color: colors.green}}>{String(index + 1).padStart(2, '0')}</span>
          <span style={{height: 1, width: 44, backgroundColor: colors.line}} />
          {item}
        </div>
      ))}
    </div>
  </SceneFrame>
);

const ProviderScene: React.FC = () => (
  <SceneFrame
    eyebrow="REAL DOCTOR OUTPUT"
    title={<>Know what is<br /><span style={{color: colors.blue}}>actually ready.</span></>}
    body="Official, read-only provider access stays explicit. No cookie scraping fallback."
  >
    <div style={{position: 'absolute', left: 92, top: 430, width: 1000}}>
      <Terminal title={`${evidence.packageName}@${evidence.packageVersion}`} command="cockroach-sources doctor" lines={evidence.doctorLines} maxLines={5} accent={colors.blue} />
    </div>
    <div style={{position: 'absolute', right: 92, top: 430, width: 600}}>
      <ProductArt file="provider-map.svg" width={600} imageHeight={440} label="Exact capability status for each source" />
    </div>
  </SceneFrame>
);

const ServerlessScene: React.FC = () => (
  <SceneFrame
    eyebrow="SEPARATE SERVERLESS TIER"
    title={<>Small jobs.<br /><span style={{color: colors.green}}>Tight allowlist.</span></>}
  >
    <div style={{position: 'absolute', left: 92, right: 92, top: 430, display: 'grid', gridTemplateColumns: '1fr 90px 1fr', alignItems: 'center', gap: 22}}>
      <div style={{border: `2px solid ${colors.green}`, padding: 34, backgroundColor: colors.panelStrong}}>
        <div style={{fontFamily: mono, color: colors.green, fontSize: 20, marginBottom: 22}}>LOCAL / HARDENED</div>
        <div style={{fontSize: 44, fontWeight: 740, lineHeight: 1.15}}>DNS pinning, browser option, sitemaps, callbacks.</div>
      </div>
      <div style={{fontFamily: mono, textAlign: 'center', color: colors.muted, fontSize: 28}}>OR</div>
      <div style={{border: `2px solid ${colors.blue}`, padding: 34, backgroundColor: colors.panelStrong}}>
        <div style={{fontFamily: mono, color: colors.blue, fontSize: 20, marginBottom: 22}}>WORKER / RESTRICTED</div>
        <div style={{fontSize: 44, fontWeight: 740, lineHeight: 1.15}}>HTTPS allowlist, bearer secret, rate limit, HTML only.</div>
      </div>
    </div>
    <div style={{position: 'absolute', left: 724, top: 357, color: colors.amber, fontFamily: mono, fontSize: 21}}>NO BROWSER · NO SOCIAL APIS · NO DNS PINNING</div>
  </SceneFrame>
);

const TestScene: React.FC = () => {
  const summaryLines = [
    ...evidence.testLines.slice(0, 7),
    `ℹ tests ${evidence.testSummary.tests}`,
    `ℹ pass ${evidence.testSummary.pass}`,
    `ℹ fail ${evidence.testSummary.fail}`,
  ];
  return (
    <SceneFrame
      eyebrow="CURRENT REPOSITORY PROOF"
      title={<>Security paths are<br /><span style={{color: colors.green}}>executable tests.</span></>}
    >
      <div style={{position: 'absolute', left: 92, right: 92, top: 442}}>
        <Terminal title="local · npm test" command="npm test" lines={summaryLines} maxLines={10} />
      </div>
      <div style={{position: 'absolute', right: 124, top: 215, display: 'flex', gap: 12}}>
        <Stat label="CORE TESTS" value={`${evidence.testSummary.pass} / ${evidence.testSummary.tests}`} />
        <Stat label="FAILURES" value={String(evidence.testSummary.fail)} color={evidence.testSummary.fail === 0 ? colors.green : colors.red} />
        <Stat label="LOCAL FIXTURE" value={`${evidence.benchmark.pages} PAGES`} color={colors.blue} />
      </div>
      <div style={{position: 'absolute', left: 92, top: 370, color: colors.muted, fontFamily: mono, fontSize: 19}}>
        NODE {evidence.nodeVersion.replace('v', '')} · REVISION {evidence.revisionLabel}
      </div>
      <div style={{position: 'absolute', left: 92, top: 402, color: colors.amber, fontFamily: mono, fontSize: 20, letterSpacing: 1.2}}>
        PROJECT-LOCAL REGRESSION · NOT AN INDUSTRY OR GLOBAL BENCHMARK
      </div>
    </SceneFrame>
  );
};

const ClosingScene: React.FC = () => (
  <SceneFrame
    eyebrow="REVIEW THE BOUNDARY"
    title={<>Crawl what is allowed.<br /><span style={{color: colors.green}}>Record what happened.</span></>}
    body="Stable 0.2.0 is on npm. Version 0.3.0-alpha.1 is the current source candidate for provider adapters and the restricted Worker tier."
  >
    <div style={{position: 'absolute', left: 92, right: 92, bottom: 190, display: 'grid', gridTemplateColumns: '1.15fr .85fr', gap: 28}}>
      <div style={{border: `2px solid ${colors.line}`, backgroundColor: '#030806', padding: '34px 40px', fontFamily: mono}}>
        <div style={{fontSize: 20, color: colors.muted, marginBottom: 16}}>STABLE INSTALL</div>
        <div style={{fontSize: 39, color: colors.text}}><span style={{color: colors.green}}>$</span> npm i cockroach-crawler@0.2.0</div>
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 25, padding: '28px 34px', border: `2px solid ${colors.green}`, backgroundColor: colors.panelStrong}}>
        <Img src={staticFile('assets/mark.svg')} style={{width: 80, height: 80}} />
        <div>
          <div style={{fontFamily: mono, fontSize: 19, color: colors.green, marginBottom: 9}}>OPEN SOURCE · MIT</div>
          <div style={{fontFamily: sans, fontSize: 36, fontWeight: 760}}>cockroachcrawler.com</div>
        </div>
      </div>
    </div>
  </SceneFrame>
);

const transition = linearTiming({durationInFrames: 15});

export const CockroachCrawlerMain: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: colors.bg}}>
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={sceneDurations[0]}><IntroScene /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({direction: 'from-left'})} timing={transition} />
      <TransitionSeries.Sequence durationInFrames={sceneDurations[1]}><BoundaryScene /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({direction: 'from-right'})} timing={transition} />
      <TransitionSeries.Sequence durationInFrames={sceneDurations[2]}><ProviderScene /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({direction: 'from-left'})} timing={transition} />
      <TransitionSeries.Sequence durationInFrames={sceneDurations[3]}><ServerlessScene /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({direction: 'from-right'})} timing={transition} />
      <TransitionSeries.Sequence durationInFrames={sceneDurations[4]}><TestScene /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({direction: 'from-left'})} timing={transition} />
      <TransitionSeries.Sequence durationInFrames={sceneDurations[5]}><ClosingScene /></TransitionSeries.Sequence>
    </TransitionSeries>
    <Narration />
    <BurnedCaptions captions={captions} />
  </AbsoluteFill>
);
