import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync, statSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const renders = resolve(here, '..', 'renders');
const specs = [
  {base: 'cockroach-crawler-main-60s', poster: 'cockroach-crawler-main-poster.png', expectedDuration: 60, width: 1920, height: 1080},
  {base: 'cockroach-crawler-providers-serverless-30s', poster: 'cockroach-crawler-providers-serverless-poster.png', expectedDuration: 30, width: 1920, height: 1080},
  {base: 'cockroach-crawler-workflow-proof-45s', poster: 'cockroach-crawler-workflow-proof-poster.png', expectedDuration: 45, width: 1920, height: 1080},
  {base: 'cockroach-crawler-vertical-short-30s', poster: 'cockroach-crawler-vertical-short-poster.png', expectedDuration: 30, width: 1080, height: 1920},
];

const probe = (file) => JSON.parse(execFileSync('ffprobe', [
  '-v', 'error', '-show_streams', '-show_format', '-of', 'json', file,
], {encoding: 'utf8'}));

const manifest = {validatedAt: new Date().toISOString(), assets: {}};
for (const spec of specs) {
  const videoPath = resolve(renders, `${spec.base}.mp4`);
  const posterPath = resolve(renders, spec.poster);
  const video = probe(videoPath);
  const duration = Number.parseFloat(video.format.duration);
  const visual = video.streams.find((stream) => stream.codec_type === 'video');
  const audio = video.streams.find((stream) => stream.codec_type === 'audio');
  if (Math.abs(duration - spec.expectedDuration) > 0.08) throw new Error(`${spec.base} duration ${duration} != ${spec.expectedDuration}.`);
  if (visual?.width !== spec.width || visual?.height !== spec.height) throw new Error(`${spec.base} is not ${spec.width}x${spec.height}.`);
  if (!audio) throw new Error(`${spec.base} has no narration audio stream.`);
  for (const extension of ['srt', 'vtt']) {
    const captionPath = resolve(renders, `captions-${spec.base}-en.${extension}`);
    if (statSync(captionPath).size < 100) throw new Error(`captions-${spec.base}-en.${extension} is empty.`);
  }
  const captionDataPath = resolve(renders, `${spec.base}.captions.json`);
  if (statSync(captionDataPath).size < 100) throw new Error(`${spec.base}.captions.json is empty.`);
  const poster = probe(posterPath);
  const posterVisual = poster.streams.find((stream) => stream.codec_type === 'video');
  if (posterVisual?.width !== spec.width || posterVisual?.height !== spec.height) throw new Error(`${posterPath} is not ${spec.width}x${spec.height}.`);
  const bytes = readFileSync(videoPath);
  manifest.assets[spec.base] = {
    durationSeconds: duration,
    width: visual.width,
    height: visual.height,
    videoCodec: visual.codec_name,
    audioCodec: audio.codec_name,
    sizeBytes: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
  console.log(`${spec.base}: ${duration.toFixed(3)}s, ${visual.width}x${visual.height}, ${visual.codec_name}/${audio.codec_name}`);
}

writeFileSync(resolve(renders, 'render-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
