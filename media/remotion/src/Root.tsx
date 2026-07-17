import React from 'react';
import {Composition} from 'remotion';
import {CockroachCrawlerMain} from './main/MainVideo';
import {ProviderServerlessCut} from './short/ProviderServerlessCut';
import {WorkflowProof} from './workflow/WorkflowProof';
import {ProviderServerlessVerticalShort} from './vertical/ProviderServerlessVerticalShort';

export const VideoRoot: React.FC = () => (
  <>
    <Composition
      id="CockroachCrawlerMain"
      component={CockroachCrawlerMain}
      durationInFrames={1800}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="ProviderServerlessCut"
      component={ProviderServerlessCut}
      durationInFrames={900}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="CockroachCrawlerWorkflowProof"
      component={WorkflowProof}
      durationInFrames={1350}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="ProviderServerlessVerticalShort"
      component={ProviderServerlessVerticalShort}
      durationInFrames={900}
      fps={30}
      width={1080}
      height={1920}
    />
  </>
);
