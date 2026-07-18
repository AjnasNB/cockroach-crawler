import {execFileSync} from 'node:child_process';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const project = resolve(here, '..');
const config = JSON.parse(readFileSync(resolve(here, 'narration.json'), 'utf8'));
const renders = resolve(project, 'renders');
const generated = resolve(project, 'src', 'generated');
mkdirSync(renders, {recursive: true});
mkdirSync(generated, {recursive: true});

const durationSeconds = (file) => Number.parseFloat(execFileSync('ffprobe', [
  '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file,
], {encoding: 'utf8'}).trim());

const splitCaption = (text, maxWords = 10) => {
  const words = text.trim().split(/\s+/);
  const chunks = [];
  for (let index = 0; index < words.length; index += maxWords) {
    chunks.push(words.slice(index, index + maxWords).join(' '));
  }
  return chunks;
};

const timestamp = (milliseconds, separator = ',') => {
  const safe = Math.max(0, Math.round(milliseconds));
  const hours = Math.floor(safe / 3_600_000);
  const minutes = Math.floor((safe % 3_600_000) / 60_000);
  const seconds = Math.floor((safe % 60_000) / 1000);
  const millis = safe % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}${separator}${String(millis).padStart(3, '0')}`;
};

for (const [name, composition] of Object.entries(config.compositions)) {
  const captions = [];
  for (let index = 0; index < composition.scenes.length; index++) {
    const scene = composition.scenes[index];
    const audioPath = resolve(project, 'public', 'audio', name, `scene-${String(index + 1).padStart(2, '0')}.wav`);
    const audioMs = durationSeconds(audioPath) * 1000;
    const sceneStartMs = (scene.startFrame / config.fps) * 1000;
    const captionStart = sceneStartMs + (composition.audioOffsetFrames / config.fps) * 1000;
    const sceneEnd = ((scene.startFrame + scene.durationFrames) / config.fps) * 1000;
    const availableAudioMs = ((scene.durationFrames - composition.audioOffsetFrames - 2) / config.fps) * 1000;
    if (audioMs > availableAudioMs) {
      throw new Error(`Narration exceeds ${name} scene ${index + 1}: ${audioMs.toFixed(0)}ms > ${availableAudioMs.toFixed(0)}ms.`);
    }
    const captionEnd = Math.min(captionStart + audioMs, sceneEnd - 180);
    if (captionEnd <= captionStart) throw new Error(`Narration does not fit ${name} scene ${index + 1}.`);
    const chunks = splitCaption(scene.text);
    const slot = (captionEnd - captionStart) / chunks.length;
    chunks.forEach((text, chunkIndex) => {
      captions.push({
        text,
        startMs: Math.round(captionStart + chunkIndex * slot),
        endMs: Math.round(captionStart + (chunkIndex + 1) * slot),
        timestampMs: null,
        confidence: null,
      });
    });
  }

  writeFileSync(resolve(generated, `${name}-captions.json`), `${JSON.stringify(captions, null, 2)}\n`, 'utf8');
  const bases = {
    main: 'cockroach-crawler-main-60s',
    short: 'cockroach-crawler-providers-serverless-30s',
    workflow: 'cockroach-crawler-workflow-proof-45s',
  };
  const base = bases[name];
  if (!base) throw new Error(`No release filename is configured for narration composition '${name}'.`);
  const captionBase = `captions-${base}-en`;
  const srt = captions.map((caption, index) => `${index + 1}\n${timestamp(caption.startMs)} --> ${timestamp(caption.endMs)}\n${caption.text}\n`).join('\n');
  const vtt = `WEBVTT\n\n${captions.map((caption) => `${timestamp(caption.startMs, '.')} --> ${timestamp(caption.endMs, '.')}\n${caption.text}\n`).join('\n')}`;
  writeFileSync(resolve(renders, `${captionBase}.srt`), srt, 'utf8');
  writeFileSync(resolve(renders, `${captionBase}.vtt`), vtt, 'utf8');
  writeFileSync(resolve(renders, `${base}.captions.json`), `${JSON.stringify(captions, null, 2)}\n`, 'utf8');
  if (name === 'short') {
    const verticalBase = 'cockroach-crawler-vertical-short-30s';
    const verticalCaptionBase = `captions-${verticalBase}-en`;
    writeFileSync(resolve(renders, `${verticalCaptionBase}.srt`), srt, 'utf8');
    writeFileSync(resolve(renders, `${verticalCaptionBase}.vtt`), vtt, 'utf8');
    writeFileSync(resolve(renders, `${verticalBase}.captions.json`), `${JSON.stringify(captions, null, 2)}\n`, 'utf8');
  }
  console.log(`Generated ${captions.length} caption cues for ${name}.`);
}
