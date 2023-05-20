import fs from 'fs';
import fetch from 'node-fetch';
import path from 'path';
import { getDirectories } from './index.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BATCH_SIZE = 220;
const BATCH_TIMEOUT_DELAY = 15000;

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function promiseAllInBatches(task, items, batchSize) {
  let position = 0;
  let results = [];
  while (position < items.length) {
    const itemsForBatch = items.slice(position, position + batchSize);
    results = [...results, ...await Promise.all(itemsForBatch.map(item => task(item)))];
    position += batchSize;
    process.stdout.write(`.`);
    console.log(`${position} / ${items.length}`);
  }
  return results;
}

export const addInscriptionNumbers = async () => {
  let environment;
  try {
    const environmentRaw = await fs.readFileSync(path.resolve(__dirname, '../environment.json'));
    environment = JSON.parse(environmentRaw);
  } catch (e) {
    console.error('Error reading environment.json', e);
  }

  for(let collection of getDirectories(path.resolve(__dirname, '../collections/'))) {
    console.log(collection);
    let filePath = `../collections/${collection}/inscriptions.json`;
    let inscriptions = JSON.parse(fs.readFileSync(path.resolve(__dirname, filePath)));
    let task = async (inscription, attempts=5) => {
      inscription.id = inscription.id?.toLowerCase();

      if(inscription?.['number']) {
        inscription['number'] = inscription['number'].toString();
        return inscription;
      }
      let json;
      let failed = false;
      try {
        await timeout(BATCH_TIMEOUT_DELAY);
        json = await fetch('https://api.hiro.so/ordinals/v1/inscriptions/'+inscription.id, {
          headers: {
            'x-hiro-api-key': environment?.HIRO_API_KEY ?? null,
          }
        }).then(res => res.json());
      } catch {
        failed = true;
        console.log(`!! Failed ${inscription.id}`);
        if(attempts > 0) return task(inscription, attempts-1);
      }

      // Not found - skip
      if (json.error === 'Not found') {
        console.log(`${inscription.id} not found`);
        return inscription;
      }

      if(attempts > 0 && !json.number) return task(inscription, attempts-1);
      if(!failed) inscription['number'] = json.number?.toString();
      return inscription;
    };
    let transformedInscriptions = await promiseAllInBatches(task, inscriptions, BATCH_SIZE);
    fs.writeFileSync(path.resolve(__dirname, filePath), JSON.stringify(transformedInscriptions, null, 2));
  }
};