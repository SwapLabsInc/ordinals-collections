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
    let {
      metadataIpfs,
      itemId,
      tick,
      number,
      inscriptionId,
      metadataSuffix
    } = payload;

    let getJSON = async (retries=5) => {
      try {
        let metadata = await fetch(`https://ipfs.ordinals.market/ipfs/${metadataIpfs}/${itemId}${metadataSuffix}`);
        return await metadata.json();
      } catch(e) {
        if(retries < 0) {
          return {
            id: inscriptionId,
            lastError: e
          };
        }
        await timeout(5000);
        return await getJSON(retries-1);
      }
    }

    let json = await getJSON();

    if(!json.image || !json.image.startsWith('ipfs://')) {
      console.error(json, payload);
      throw new Error('Item image is missing IPFS');
    }

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

      let metadataSuffix = collectionMeta.metadata_suffix ?? '';

      let tick = deploymentContents.tick;
      if(tick.length == 0) throw new Error('Invalid tick');

      let maxItems = parseInt(deploymentContents.max);
      if(!(maxItems >= 0)) throw new Error('Invalid max');

      if(deploymentContents.op != 'deploy') throw new Error('Invalid op');

      let inscriptionPath = `../collections/${collection}/inscriptions.json`;
      let inscriptions = JSON.parse(fs.readFileSync(path.resolve(__dirname, inscriptionPath)));
      let numberIdMap = {};
      if(inscriptions.data || collectionMeta.scrape) {
        if(collectionMeta.scrape) {
          let page = 0;
          let data = [];
          inscriptions.data = [];
          while(page == 0 || data.length > 0) {
            data = (await fetch('https://brc721.cc/ord-api/nft-data?tick='+tick+'&page='+page).then(res => res.json())).data;
            console.log('nft-data/'+page, data.length);
            inscriptions.data = inscriptions.data.concat(data);
            page += 1;
          }
        }
        fs.writeFileSync(path.resolve(__dirname, inscriptionPath), JSON.stringify(inscriptions.data.map((entry) => {
          return {
            id: entry["Inscription_Id"]
          }
        }), undefined, 2));
        throw new Error('Reformatted from input - please restart');
      }

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

      let itemId = parseInt(collectionMeta.token_id_offset) ?? 0;
      let payloads = [];

      for(let [inscriptionId, number] of sortedNumberIdMap) {
        if(payloads.length >= maxItems) continue;

        payloads.push({
          tick,
          metadataIpfs,
          number,
          itemId,
          inscriptionId,
          metadataSuffix
        });

        itemId += 1;
      }

      let itemData = await promiseAllInBatches(getItemData, payloads, 250);

      for(let data of itemData) {
        const existingInscriptionIndex = inscriptions.findIndex((i) => i.id.toLowerCase() === data.id.toLowerCase());
        if(existingInscriptionIndex < 0) throw new Error('Cannot find existing inscription');
        transformedInscriptions.push(Object.assign({}, inscriptions[existingInscriptionIndex], data));
      }

      collectionMeta.populated = true;

      fs.writeFileSync(path.resolve(__dirname, inscriptionPath), JSON.stringify(transformedInscriptions, null, null));
      fs.writeFileSync(path.resolve(__dirname, filePath), JSON.stringify(collectionMeta, null, null));
      console.log('done!', collection);
    }
  }
};