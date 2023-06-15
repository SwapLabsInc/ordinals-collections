
import fs from 'fs';
import path from 'path';
import { getDirectories } from './index.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const updateInscriptionMap = async () => {
  console.log(`🗺️ Populating inscription map...`);
  let inscriptionMap = {};

  let collections = getDirectories(path.resolve(__dirname, '../collections/'));
  let catchAlls = ['sub10k'];
  let prioritisedCollections = collections.sort((a,b) => {
    let ai = catchAlls.indexOf(a);
    let bi = catchAlls.indexOf(b);
    return (bi > -1 ? bi + 1 : 0) - (ai > -1 ? ai + 1 : 0);
  });

  // Get hash -> collection from metadata
  prioritisedCollections.forEach((collectionKey) => {
    let inscriptionPath = `../collections/${collectionKey}/inscriptions.json`;
    let inscriptions = JSON.parse(fs.readFileSync(path.resolve(__dirname, inscriptionPath)));
    for (let item of inscriptions) {
      if (item.id) {
        let lookupKey = item.id.charAt(0).trim();
        if(lookupKey.length == 0) {
          console.log('failed', item);
          continue;
        }
        if(!inscriptionMap[lookupKey]) inscriptionMap[lookupKey] = {};
        inscriptionMap[lookupKey][item.id] = collectionKey;
      }
    }
  });

  for(let lookupKey in inscriptionMap) {
    let partialMap = inscriptionMap[lookupKey];
    let filePath = `../lookup/map-${lookupKey}.json`;
    console.log(`🗺️ Populated map-${lookupKey}.json`);
    fs.writeFileSync(path.resolve(__dirname, filePath), JSON.stringify(partialMap));
  }
};