import fs from 'fs';
import path from 'path';
import { getDirectories } from './index.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const cleanupInscriptionFiles = async () => {
  for(let collection of getDirectories(path.resolve(__dirname, '../collections/'))) {
    console.log(`🧹 Cleaning ${collection}`);
    let filePathInscriptions = `../collections/${collection}/inscriptions.json`;
    let inscriptions = JSON.parse(fs.readFileSync(path.resolve(__dirname, filePathInscriptions)));
    let filePathMeta = `../collections/${collection}/meta.json`;
    let meta = JSON.parse(fs.readFileSync(path.resolve(__dirname, filePathMeta)));

    // Transform 'number' params into integers for consistency
    for (let i=0; i < inscriptions.length; i+=1) {
      if (inscriptions[i].number && typeof inscriptions[i].number !== 'number') {
        inscriptions[i].number = parseInt(inscriptions[i].number);
      }

      if(inscriptions[i].id) inscriptions[i].id = inscriptions[i].id.trim();
      if(!inscriptions[i].meta) inscriptions[i].meta = { name: meta.name+" #"+i };
    }

    // Compress JSON to remove newlines
    const outputJson = JSON.stringify(inscriptions, null, null);

    fs.writeFileSync(path.resolve(__dirname, filePathInscriptions), outputJson);
  }
};