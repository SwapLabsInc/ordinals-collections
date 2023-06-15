import fs from 'fs';
import path from 'path';
import { getDirectories } from './index.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const cleanupInscriptionFiles = async () => {
  for(let collection of getDirectories(path.resolve(__dirname, '../collections/'))) {
    console.log(`🧹 Cleaning ${collection}`);
    let filePath = `../collections/${collection}/inscriptions.json`;
    let inscriptions = JSON.parse(fs.readFileSync(path.resolve(__dirname, filePath)));

    // Transform 'number' params into integers for consistency
    for (let i=0; i < inscriptions.length; i+=1) {
      if (inscriptions[i].number && typeof inscriptions[i].number !== 'number') {
        inscriptions[i].number = parseInt(inscriptions[i].number);
      }

      if(inscriptions[i].id) inscriptions[i].id = inscriptions[i].id.trim();
    }

    // Compress JSON to remove newlines
    const outputJson = JSON.stringify(inscriptions, null, null);

    fs.writeFileSync(path.resolve(__dirname, filePath), outputJson);
  }
};