import fs from 'fs';
import path from 'path';
import { getDirectories } from './index.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const fixEmptyInscriptionFiles = async () => {
  for(let collection of getDirectories(path.resolve(__dirname, '../collections/'))) {
    let filePath = `../collections/${collection}/inscriptions.json`;

    let inscriptions = [];
    try {
      inscriptions = JSON.parse(fs.readFileSync(path.resolve(__dirname, filePath)));
    } catch (e) {
      // Fix missing inscription file
      if (e.message?.includes('no such file or directory')) {
        console.log(`🛠️ Fixing missing inscriptions.json for ${collection}`);
        fs.writeFileSync(path.resolve(__dirname, filePath), JSON.stringify([], null, null));
      } else {
        console.error(e.message ?? e);
      }
    }
  }
};