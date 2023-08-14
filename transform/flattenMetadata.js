import fs from 'fs';
import path from 'path';
import { getDirectories } from './index.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const flattenMetadataFiles = async () => {
  for(let collection of getDirectories(path.resolve(__dirname, '../collections/'))) {
    console.log(`🧹 Cleaning ${collection} metadata`);
    let filePathMeta = `../collections/${collection}/meta.json`;
    let meta = JSON.parse(fs.readFileSync(path.resolve(__dirname, filePathMeta)));

    if(meta.icon?.indexOf('preview/') > -1) {
      meta.inscription_icon = meta.icon.split('preview/')[1];
      delete meta.icon;
    }

    // Compress JSON to remove newlines
    const outputJson = JSON.stringify(meta, null, null);

    fs.writeFileSync(path.resolve(__dirname, filePathMeta), outputJson);
  }
};