import React from 'react';
import {AbsoluteFill, Sequence, staticFile} from 'remotion';
import {Audio} from '@remotion/media';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {wipe} from '@remotion/transitions/wipe';
import workflowData from '../generated/workflow-evidence.json';
import captionsData from '../generated/workflow-captions.json';
import {BurnedCaptions} from '../Captions';
import {ProductArt, SceneFrame, Stat} from '../Shared';
import {Terminal} from '../Terminal';
import {colors, mono} from '../theme';
import type {Caption} from '../types';

type ProviderStatus = {
  id: string;
  status: string;
};

type WorkflowEvidence = {
  capturedAt: string;
  fixture: {
    mode: string;
    authority: string;
    externalNetworkRequests: number;
    credentialsUsed: boolean;
    routes: string[];
  };
  allowed: {
    command: string;
    exitCode: number;
    pageCount: number;
    stats: {
      requests: number;
      bytes: number;
      errors: number;
      durationMs: number;
    };
    pages: Array<{
      title: string;
      url: string;
      depth: number;
      status: number;
      contentHash: string;
    }>;
  };
  denied: {
    command: string;
    exitCode: number;
    pageCount: number;
    warning: string;
  };
  doctor: ProviderStatus[];
  normalizedRecord: {
    source: string;
    id: string;
    type: string;
    title: string;
    url: string;
    contentHash: string;
    adapterVersion: string;
    warnings: string[];
    metadata: {
      depth: number;
      contentHash: string;
    };
    provenance: {
      method: string;
      authenticated: boolean;
      credentialed: boolean;
    };
  };
};

const evidence = workflowData as WorkflowEvidence;
const captions = captionsData as Caption[];
const sceneDurations = [285, 285, 285, 285, 270];
const starts = [0, 270, 540, 810, 1080];

const splitHash = (hash: string) => [hash.slice(0, 39), hash.slice(39)];

const Narration: React.FC = () => (
  <>
    {starts.map((start, index) => (
      <Sequence key={start} from={start + 9} durationInFrames={sceneDurations[index] - 12}>
        <Audio src={staticFile(`audio/workflow/scene-${String(index + 1).padStart(2, '0')}.wav`)} volume={0.96} />
      </Sequence>
    ))}
  </>
);

const FixtureScene: React.FC = () => (
  <SceneFrame
    marker="COCKROACH CRAWLER · WORKFLOW PROOF"
    eyebrow="DETERMINISTIC OFFLINE FIXTURE"
    title={<>Real crawl.<br /><span style={{color: colors.green}}>Zero external traffic.</span></>}
    body="A local HTTP server supplies robots.txt and two fixed pages. The proof needs no account, provider key, model, or internet request."
  >
    <div style={{position: 'absolute', right: 92, top: 315}}>
      <ProductArt file="crawl-gate.svg" width={650} imageHeight={450} label="loopback fixture → policy gate → records" />
    </div>
    <div style={{position: 'absolute', left: 92, bottom: 178, width: 840, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
      <Stat label="FIXTURE" value="127.0.0.1" />
      <Stat label="EXTERNAL REQUESTS" value={String(evidence.fixture.externalNetworkRequests)} />
      <Stat label="CREDENTIALS" value={evidence.fixture.credentialsUsed ? 'USED' : 'NONE'} />
      <Stat label="ROUTES" value={String(evidence.fixture.routes.length)} color={colors.blue} />
    </div>
  </SceneFrame>
);

const CommandScene: React.FC = () => (
  <SceneFrame
    marker="COCKROACH CRAWLER · WORKFLOW PROOF"
    eyebrow="ACTUAL CLI INVOCATION"
    title={<>Exact command.<br /><span style={{color: colors.green}}>Exact limits.</span></>}
  >
    <div style={{position: 'absolute', left: 92, right: 92, top: 385}}>
      <Terminal
        title="offline fixture · real process"
        command={evidence.allowed.command}
        lines={[
          'authority  loopback explicitly enabled',
          'pages      2   · depth 1',
          'requests   6   · delay 0 ms',
          'page bytes 65,536',
          'total      131,072 bytes',
        ]}
        maxLines={5}
      />
    </div>
  </SceneFrame>
);

const ResultScene: React.FC = () => {
  const first = evidence.allowed.pages[0];
  const hashLines = splitHash(first.contentHash);
  const deniedMessage = evidence.denied.warning.replace(/^cockroach-crawl:\s*/i, '');
  return (
    <SceneFrame
      marker="COCKROACH CRAWLER · WORKFLOW PROOF"
      eyebrow="REAL STRUCTURED OUTPUT"
      title={<>Two records.<br /><span style={{color: colors.amber}}>One fail-closed denial.</span></>}
    >
      <div style={{position: 'absolute', left: 92, right: 92, top: 390, display: 'grid', gridTemplateColumns: '1.18fr .82fr', gap: 24}}>
        <Terminal
          title="allowed · exit 0"
          command="result.pages[0]"
          lines={[
            `title  ${first.title}`,
            `status ${first.status}   depth ${first.depth}`,
            `url    ${first.url}`,
            `hash   ${hashLines[0]}`,
            `       ${hashLines[1]}`,
            `pages  ${evidence.allowed.pageCount}   requests ${evidence.allowed.stats.requests}   errors ${evidence.allowed.stats.errors}`,
          ]}
          maxLines={6}
        />
        <Terminal
          title={`denied · exit ${evidence.denied.exitCode}`}
          command="same seed · no private-network authority"
          lines={[
            `pages ${evidence.denied.pageCount}`,
            'dispatch blocked',
            deniedMessage,
          ]}
          accent={colors.red}
          maxLines={3}
        />
      </div>
    </SceneFrame>
  );
};

const DoctorScene: React.FC = () => (
  <SceneFrame
    marker="COCKROACH CRAWLER · WORKFLOW PROOF"
    eyebrow="CREDENTIAL-FREE RUNTIME STATE"
    title={<>Doctor reports<br /><span style={{color: colors.blue}}>the real boundary.</span></>}
  >
    <div style={{position: 'absolute', left: 92, right: 92, top: 395}}>
      <Terminal
        title="same process environment · provider credentials omitted"
        command="cockroach-sources doctor"
        lines={evidence.doctor.map(({id, status}) => `${id.padEnd(9)} ${status}`)}
        accent={colors.blue}
        maxLines={5}
      />
    </div>
  </SceneFrame>
);

const RecordScene: React.FC = () => {
  const record = evidence.normalizedRecord;
  const recordHash = splitHash(record.contentHash);
  return (
    <SceneFrame
      marker="COCKROACH CRAWLER · WORKFLOW PROOF"
      eyebrow="NORMALIZED SOURCE RECORD"
      title={<>Crawler output in.<br /><span style={{color: colors.green}}>Evidence record out.</span></>}
    >
      <div style={{position: 'absolute', left: 92, right: 92, top: 385}}>
        <Terminal
          title="createSourceRegistry().read('web', …)"
          command="normalizedRecord"
          lines={[
            `source   ${record.source}   · type ${record.type}   · adapter ${record.adapterVersion}`,
            `title    ${record.title}`,
            `record   ${recordHash[0]}`,
            `hash     ${recordHash[1]}`,
            `method   ${record.provenance.method}   · authenticated ${String(record.provenance.authenticated)}`,
            `metadata depth ${record.metadata.depth}   · warnings ${record.warnings.length}`,
          ]}
          maxLines={6}
        />
      </div>
      <div style={{position: 'absolute', right: 108, top: 340, color: colors.amber, fontFamily: mono, fontSize: 18, letterSpacing: 1.1}}>
        OFFLINE CONTRACT PROOF · NOT A LIVE-WEB OR CAPACITY BENCHMARK
      </div>
    </SceneFrame>
  );
};

const transition = linearTiming({durationInFrames: 15});

export const WorkflowProof: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: colors.bg}}>
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={sceneDurations[0]}><FixtureScene /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({direction: 'from-left'})} timing={transition} />
      <TransitionSeries.Sequence durationInFrames={sceneDurations[1]}><CommandScene /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({direction: 'from-right'})} timing={transition} />
      <TransitionSeries.Sequence durationInFrames={sceneDurations[2]}><ResultScene /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({direction: 'from-left'})} timing={transition} />
      <TransitionSeries.Sequence durationInFrames={sceneDurations[3]}><DoctorScene /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({direction: 'from-right'})} timing={transition} />
      <TransitionSeries.Sequence durationInFrames={sceneDurations[4]}><RecordScene /></TransitionSeries.Sequence>
    </TransitionSeries>
    <Narration />
    <BurnedCaptions captions={captions} />
  </AbsoluteFill>
);
