#!/usr/bin/env node
/**
 * CC0 karakter paketlerini public/assets/ altına indirir.
 * Kaynaklar: OpenGameArt (Kenney, Quaternius UAL2)
 */
import { mkdir, copyFile, access } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = path.join(root, 'public/assets');

const DOWNLOADS = {
  kenney: {
    url: 'https://opengameart.org/sites/default/files/kenney_mini-characters.zip',
    zip: 'kenney_mini-characters.zip',
    files: [
      ['Models/GLB format/character-male-a.glb', 'characters/kenney/character-male-a.glb'],
      ['Models/GLB format/character-male-b.glb', 'characters/kenney/character-male-b.glb'],
      ['Models/GLB format/character-male-c.glb', 'characters/kenney/character-male-c.glb'],
      ['Models/GLB format/character-female-a.glb', 'characters/kenney/character-female-a.glb'],
      ['Models/GLB format/character-female-b.glb', 'characters/kenney/character-female-b.glb'],
      ['Models/GLB format/character-female-c.glb', 'characters/kenney/character-female-c.glb'],
      ['License.txt', 'licenses/KENNEY_MINI_CHARACTERS.txt'],
    ],
  },
  ual2: {
    url: 'https://opengameart.org/sites/default/files/universal_animation_library_2standard.zip',
    zip: 'ual2.zip',
    files: [
      [
        'Universal Animation Library 2 [Standard]/Unreal-Godot/UAL2_Standard.glb',
        'animations/quaternius/UAL2_Standard.glb',
      ],
      [
        'Universal Animation Library 2 [Standard]/Female Mannequin/Unreal-Godot/Mannequin_F.glb',
        'characters/quaternius/Mannequin_F.glb',
      ],
      [
        'Universal Animation Library 2 [Standard]/License.txt',
        'licenses/QUATERNIUS_UAL2.txt',
      ],
    ],
  },
};

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function download(url, dest) {
  console.log(`İndiriliyor: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  await pipeline(res.body, createWriteStream(dest));
}

async function extractZip(zipPath, tmpDir) {
  await mkdir(tmpDir, { recursive: true });
  await exec('unzip', ['-o', zipPath, '-d', tmpDir]);
}

async function fetchPack(name, spec) {
  const tmp = path.join(root, '.tmp-assets', name);
  const zipPath = path.join(tmp, spec.zip);
  await mkdir(tmp, { recursive: true });

  if (!(await exists(zipPath))) {
    await download(spec.url, zipPath);
  }
  await extractZip(zipPath, tmp);

  for (const [inner, outRel] of spec.files) {
    const src = path.join(tmp, inner);
    const dest = path.join(assets, outRel);
    await mkdir(path.dirname(dest), { recursive: true });
    await copyFile(src, dest);
    console.log(`  ✓ ${outRel}`);
  }
}

console.log('CC0 karakter paketleri indiriliyor…\n');
await fetchPack('kenney', DOWNLOADS.kenney);
await fetchPack('ual2', DOWNLOADS.ual2);

console.log('\nQuaternius Universal Base Characters (Regular_Male/Female) için:');
console.log('  https://quaternius.itch.io/universal-base-characters');
console.log('  → public/assets/characters/quaternius/Regular_Male.glb');
console.log('  → public/assets/characters/quaternius/Regular_Female.glb');
console.log('\nTamamlandı.');
