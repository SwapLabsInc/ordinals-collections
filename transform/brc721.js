import fs from 'fs';
import fetch from 'node-fetch';
import path from 'path';
import { getDirectories } from './index.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BATCH_SIZE = 60;

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
      console.log(position);
  }
  return results;
}

export const processBrc721 = async () => {
  let getItemData = async (payload) => {
    let metadataIpfs = payload.metadataIpfs;
    let itemId = payload.itemId;
    let tick = payload.tick;
    let number = payload.number;
    let inscriptionId = payload.inscriptionId;

    let getJSON = async (retries=3) => {
      try {
        let metadata = await fetch(`https://ipfs.io/ipfs/${metadataIpfs}/${itemId}`);
        return await metadata.json();
      } catch {
        if(retries < 0) {
          return {
            id: inscriptionId
          };
        }
        return await getJSON(retries-1);
      }
    }

    let json = await getJSON();
    if(!json.image || !json.image.startsWith('ipfs://')) throw new Error('Item image is missing IPFS');

    return {
      id: inscriptionId,
      number,
      meta: {
        name: `${tick} #${itemId}`,
        image: json.image,
        attributes: json.attributes
      }
    };
  };

  for(let collection of getDirectories(path.resolve(__dirname, '../collections/'))) {
    let transformedInscriptions = [];
    let filePath = `../collections/${collection}/meta.json`;
    let collectionMeta = JSON.parse(fs.readFileSync(path.resolve(__dirname, filePath)));

    if(collectionMeta.kind === 'brc-721' && !collectionMeta.populated) {
      if(!collectionMeta.deployment) throw new Error(`Missing deployment inscription for ${collection}!`);

      console.log(collection, collectionMeta.kind);

      let deploymentContents = await fetch('https://ord.ordinals.market/content/'+collectionMeta.deployment).then(res => res.json());
      if(deploymentContents.p != 'brc-721') throw new Error('Invalid protocol');

      let metadataIpfs = deploymentContents.ipfs.split('//')[1];
      if(!metadataIpfs) throw new Error('Invalid ipfs');

      let tick = deploymentContents.tick;
      if(tick.length == 0) throw new Error('Invalid tick');

      let maxItems = parseInt(deploymentContents.max);
      if(!(maxItems >= 0)) throw new Error('Invalid max');

      if(deploymentContents.op != 'deploy') throw new Error('Invalid op');

      let inscriptionPath = `../collections/${collection}/inscriptions.json`;
      let inscriptions = JSON.parse(fs.readFileSync(path.resolve(__dirname, inscriptionPath)));
      let numberIdMap = {};

      for(let inscription of inscriptions) {
        if(!inscription.number) {
          console.log(inscription);
          break;
        }
        numberIdMap[inscription.id] = inscription.number;
      }

      if(Object.values(numberIdMap).length != inscriptions.length) {
        throw new Error(`Missing inscription number for ${collection}!`);
      }

      let sortedNumberIdMap = Object.entries(numberIdMap).sort(v => v[1]);

      let itemId = 0;
      let payloads = [];

      for(let [inscriptionId, number] of sortedNumberIdMap) {
        if(itemId >= maxItems) continue;

        payloads.push({
          tick,
          metadataIpfs,
          number,
          itemId,
          inscriptionId
        });

        itemId += 1;
      }

      let itemData = await promiseAllInBatches(getItemData, payloads, 100);

      for(let data of itemData) {
        const existingInscriptionIndex = inscriptions.findIndex((i) => i.id.toLowerCase() === data.id.toLowerCase());
        if(existingInscriptionIndex < 0) throw new Error('Cannot find existing inscription');
        transformedInscriptions[existingInscriptionIndex] = Object.assign({}, inscriptions[existingInscriptionIndex], data);
      }

      fs.writeFileSync(path.resolve(__dirname, inscriptionPath), JSON.stringify(transformedInscriptions, null, null));
      console.log('done!', collection);
    }
  }
};