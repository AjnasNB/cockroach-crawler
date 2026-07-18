import React from 'react';
import {AbsoluteFill, Sequence, staticFile} from 'remotion';
import {Audio} from '@remotion/media';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {wipe} from '@remotion/transitions/wipe';
import workflowData from '../generated/workflow-evidence.json';
import captionsData from '../generated/main-captions.json';
import {BurnedCaptions} from '../Captions';
import {ProductArt, SceneFrame, Stat} from '../Shared';
import {Terminal} from '../Terminal';
import {colors, mono} from '../theme';
import type {Caption} from '../types';

type WorkflowEvidence = {
  fixture: {
    externalNetworkRequests: number;
    credentialsUsed: boolean;
  };
  allowed: {
    command: string;
    exitCode: number;
    pageCount: number;
    stats: {requests: number; bytes: number; errors: number; durationMs: number};
    pages: Array<{title: string; url: string; depth: number; status: number; contentHash: string}>;
  };
  denied: {
    exitCode: number;
    pageCount: number;
    warning: string;
  };
  normalizedRecord: {
    source: string;
    type: string;
    title: string;
    contentHash: string;
    adapterVersion: string;
    warnings: string[];
    metadata: {depth: number};
    provenance: {method: string; authenticated: boolean};
  };
};

const evidence = workflowData as WorkflowEvidence;
const captions = captionsData as Caption[];
const sceneDurations = [315, 315, 315, 315, 315, 300];
const starts = [0, 300, 600, 900, 1200, 1500];
const normalizedCommand = evidence.allowed.command.replace(/127\.0\.0\.1:\d+/g, '127.0.0.1:PORT');
const shortHash = (hash: string) => `${hash.slice(0, 22)}...${hash.slice(-12)}`;

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
    eyebrow="REAL 60-SECOND CLI DEMO"
    title={<>Install. Crawl.<br /><span style={{color: colors.green}}>Inspect the record.</span></>}
    body="A deterministic loopback run shows the same command, policy decision, structured output, and evidence adapter used by the test suite."
  >
    <div style={{position: 'absolute', right: 92, top: 285}}>
      <ProductArt file="crawl-gate.svg" width={680} imageHeight={450} label="request -> bounded crawler -> source-linked record" />
    </div>
    <div style={{position: 'absolute', left: 92, bottom: 178, width: 780, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
      <Stat label="EXTERNAL REQUESTS" value={String(evidence.fixture.externalNetworkRequests)} />
      <Stat label="CREDENTIALS" value={evidence.fixture.credentialsUsed ? 'USED' : 'NONE'} />
      <Stat label="ALLOWED PAGES" value={String(evidence.allowed.pageCount)} color={colors.blue} />
      <Stat label="DENIED PAGES" value={String(evidence.denied.pageCount)} color={colors.amber} />
    </div>
  </SceneFrame>
);

const InstallScene: React.FC = () => (
  <SceneFrame
    eyebrow="STEP 01 / INSTALL"
    title={<>One package.<br /><span style={{color: colors.green}}>No account required.</span></>}
    body="Install the CLI in a Node.js project. The same package also exposes a JavaScript API and strict agent adapter."
  >
    <div style={{position: 'absolute', left: 92, right: 92, top: 440}}>
      <Terminal
        title="project terminal"
        command="npm install cockroach-crawler"
        lines={[
          'added cockroach-crawler',
          'bin      cockroach-crawl',
          'library  crawlDetailed()',
          'agent    cockroach-crawler/agent',
          'setup    local, MIT, no signup',
        ]}
        maxLines={5}
      />
    </div>
  </SceneFrame>
);

const RunScene: React.FC = () => (
  <SceneFrame
    eyebrow="STEP 02 / EXECUTE"
    title={<>Run with<br /><span style={{color: colors.green}}>explicit ceilings.</span></>}
    body="The fixture explicitly permits loopback. Public crawling keeps the safer public-network default."
  >
    <div style={{position: 'absolute', left: 92, right: 92, top: 410}}>
      <Terminal
        title="captured offline fixture - ephemeral port normalized"
        command={normalizedCommand}
        lines={[
          'authority   loopback explicitly enabled for this fixture',
          'max pages   2',
          'max depth   1',
          'max requests 6',
          'page bytes  65,536',
          'total bytes 131,072',
        ]}
        maxLines={6}
      />
    </div>
  </SceneFrame>
);

const ResultScene: React.FC = () => {
  const first = evidence.allowed.pages[0];
  const denied = evidence.denied.warning.replace(/^cockroach-crawl:\s*/i, '');
  return (
    <SceneFrame
      eyebrow="STEP 03 / VERIFY"
      title={<>Allowed once.<br /><span style={{color: colors.amber}}>Denied before dispatch.</span></>}
    >
      <div style={{position: 'absolute', left: 92, right: 92, top: 405, display: 'grid', gridTemplateColumns: '1.12fr .88fr', gap: 24}}>
        <Terminal
          title={`allowed - exit ${evidence.allowed.exitCode}`}
          command="result.pages[0]"
          lines={[
            `title    ${first.title}`,
            `status   ${first.status}   depth ${first.depth}`,
            `hash     ${shortHash(first.contentHash)}`,
            `pages    ${evidence.allowed.pageCount}`,
            `requests ${evidence.allowed.stats.requests}`,
            `errors   ${evidence.allowed.stats.errors}`,
          ]}
          maxLines={6}
        />
        <Terminal
          title={`denied - exit ${evidence.denied.exitCode}`}
          command="same seed without private-network authority"
          lines={[
            `pages    ${evidence.denied.pageCount}`,
            'dispatch blocked',
            denied,
          ]}
          accent={colors.red}
          maxLines={3}
        />
      </div>
    </SceneFrame>
  );
};

const RecordScene: React.FC = () => {
  const record = evidence.normalizedRecord;
  return (
    <SceneFrame
      eyebrow="STEP 04 / RECORD"
      title={<>Readable content.<br /><span style={{color: colors.green}}>Traceable source identity.</span></>}
      body="The web adapter turns the crawl result into a normalized record for indexing, research, monitoring, or agent evidence."
    >
      <div style={{position: 'absolute', left: 92, right: 92, top: 430}}>
        <Terminal
          title="createSourceRegistry().read('web', ...)"
          command="normalizedRecord"
          lines={[
            `source   ${record.source}   type ${record.type}`,
            `title    ${record.title}`,
            `adapter  ${record.adapterVersion}`,
            `hash     ${shortHash(record.contentHash)}`,
            `method   ${record.provenance.method}   authenticated ${String(record.provenance.authenticated)}`,
            `depth    ${record.metadata.depth}   warnings ${record.warnings.length}`,
          ]}
          maxLines={6}
        />
      </div>
    </SceneFrame>
  );
};

const UseScene: React.FC = () => (
  <SceneFrame
    eyebrow="WHERE IT FITS"
    title={<>A crawler for<br /><span style={{color: colors.green}}>evidence pipelines.</span></>}
    body="Use it when the destination and resource budget should be known before a workflow touches the network. Start at cockroachcrawler.com."
  >
    <div style={{position: 'absolute', left: 92, right: 92, bottom: 185, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16}}>
      {[
        ['RAG + DOCS', 'Turn permitted documentation into source-linked Markdown and records.'],
        ['CONTENT QA', 'Inventory titles, canonical URLs, hashes, links, and readable text.'],
        ['AGENT RESEARCH', 'Give a workflow a narrow read path instead of unrestricted network access.'],
      ].map(([label, text]) => (
        <div key={label} style={{minHeight: 220, padding: 28, border: `2px solid ${colors.line}`, backgroundColor: colors.panelStrong}}>
          <div style={{fontFamily: mono, fontSize: 19, letterSpacing: 1.2, color: colors.green, marginBottom: 20}}>{label}</div>
          <div style={{fontSize: 31, lineHeight: 1.28, color: colors.text}}>{text}</div>
        </div>
      ))}
    </div>
  </SceneFrame>
);

const transition = linearTiming({durationInFrames: 15});

export const CockroachCrawlerMain: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: colors.bg}}>
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={sceneDurations[0]}><IntroScene /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({direction: 'from-left'})} timing={transition} />
      <TransitionSeries.Sequence durationInFrames={sceneDurations[1]}><InstallScene /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({direction: 'from-right'})} timing={transition} />
      <TransitionSeries.Sequence durationInFrames={sceneDurations[2]}><RunScene /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({direction: 'from-left'})} timing={transition} />
      <TransitionSeries.Sequence durationInFrames={sceneDurations[3]}><ResultScene /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({direction: 'from-right'})} timing={transition} />
      <TransitionSeries.Sequence durationInFrames={sceneDurations[4]}><RecordScene /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={wipe({direction: 'from-left'})} timing={transition} />
      <TransitionSeries.Sequence durationInFrames={sceneDurations[5]}><UseScene /></TransitionSeries.Sequence>
    </TransitionSeries>
    <Narration />
    <BurnedCaptions captions={captions} />
  </AbsoluteFill>
);
