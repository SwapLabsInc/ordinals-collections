import fs from 'fs';
import fetch from 'node-fetch';
import path from 'path';
import { getDirectories } from './index.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const parseAttributes = async () => {
  for(let collection of getDirectories(path.resolve(__dirname, '../collections/'))) {
    console.log(`👓 Parsing ${collection} attributes`);

    let filePath = `../collections/${collection}/inscriptions.json`;
    let filePathMeta = `../collections/${collection}/meta.json`;
    let meta;
    let inscriptions;

    try {
      inscriptions = JSON.parse(fs.readFileSync(path.resolve(__dirname, filePath)));
      meta = JSON.parse(fs.readFileSync(path.resolve(__dirname, filePathMeta)));
    } catch (e) {
      console.error(e);
    }

    let eligibleAttrs = [];
    let ineligibleAttrs = [];

    for(let inscription of inscriptions) {
      let attributes = inscription.meta?.attributes;
      if(!attributes) continue;

      let seen = {};

      for (let attr of attributes) {
        const key = attr.trait_type;

        if(!seen[key]) {
          seen[key] = [];
        }

        if (!eligibleAttrs.includes(key)) {
          eligibleAttrs.push(key);
        }


        if(seen[key].indexOf(attr.value) > -1) {
          if (!ineligibleAttrs.includes(key)) {
            ineligibleAttrs.push(key);
          }
        }

        seen[key].push(attr.value);
      }
    }

    meta.category_attributes = eligibleAttrs.filter((attr) => !ineligibleAttrs.includes(attr));

    if (inscriptions && meta) {
      fs.writeFileSync(path.resolve(__dirname, filePathMeta), JSON.stringify(meta, null, null));
    }
  }
};