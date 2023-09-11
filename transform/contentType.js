import fs from 'fs';
import fetch from 'node-fetch';
import path from 'path';
import { getDirectories } from './index.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BATCH_SIZE = 60;
const BATCHES_BEFORE_DELAY = 750;
const BATCH_TIMEOUT_DELAY = 60000;

const COLLECTION_WIDE_OVERRIDES = {
  'twelvefold': 'image/webp', // Fixes only first item in twelvefold being video/mp4
};

const ITEM_WIDE_OVERRIDES = {
  '50e74f16f8f4f18c29e572ed466dde40a0878f30db6745467841e73b2f96ab34i0': 'video/mp4', // Fixes only first item in twelvefold being video/mp4
};

// These collections have multiple content types, so we can't rely on the first inscription
// to set content_type for the collection inscriptions
const MULTI_TYPE_COLLECTIONS = [
  'sub10k',
];

let currentBatchCount = 0;

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function promiseAllInBatches(task, items, batchSize) {
  let position = 0;
  let results = [];
  while (position < items.length) {
    const itemsForBatch = items.slice(position, position + batchSize);
    results = [...results, ...await task(itemsForBatch)];
    position += batchSize;
    // process.stdout.write(`.`);
    // console.log(`${position} / ${items.length}`);
  }
  return results;
}

export const addContentType = async () => {
  let environment;
  try {
    const environmentRaw = await fs.readFileSync(path.resolve(__dirname, '../environment.json'));
    environment = JSON.parse(environmentRaw);
  } catch (e) {
    console.error('Error reading environment.json', e);
  }

  const getInscriptionTypesPaginated = async (collection, inscriptions = [], page = 1) => {
    for (let i = 0; i < inscriptions.length; i += BATCH_SIZE) {
      const chunk = inscriptions.slice(i, i + BATCH_SIZE);

      console.log(`🌠 Getting inscription type chunk ${Math.floor(i / 60) + 1}/${Math.ceil(inscriptions.length / BATCH_SIZE)} for ${collection}`)

      const inscriptionIds = chunk.map((i) => i.id);
      const inscriptionIdsString = inscriptionIds.map((id) => `&id=${id}`).join('');

      let json;
      let failed = false;
      try {
        json = await fetch(`https://api.hiro.so/ordinals/v1/inscriptions?limit=${BATCH_SIZE}${inscriptionIdsString}`, {
          headers: {
            'x-hiro-api-key': environment?.HIRO_API_KEY ?? null,
          }
        }).then(res => res.json());
      } catch {
        failed = true;
        console.log(`!! Failed`);
      }

      if (!failed && json) {
        for (let i=0; i < json.results?.length; i+=1) {
          const result = json.results[i];
          const inscriptionIndex = inscriptions.findIndex((i) => i.id === result?.id);
          if (inscriptionIndex > -1 && result?.mime_type) {
            inscriptions[inscriptionIndex].content_type = result.mime_type;
          }
        }
      } else {
        console.log(`Failed to get inscription types!`)
      }

      currentBatchCount += 1;

      if ((currentBatchCount % BATCHES_BEFORE_DELAY) === 0) {
        console.log(`==== Hit ${BATCHES_BEFORE_DELAY} batches, waiting ${BATCH_TIMEOUT_DELAY}ms before continuing...`)
        await timeout(BATCH_TIMEOUT_DELAY);
      }
    }

    return inscriptions;
  };

  const task = async (collection, inscriptions) => {
    // Skip inscriptions that already contain a content_type
    const inscriptionsToProcess = inscriptions.filter((i) => !i.content_type || i.content_type?.length === 0);

    if (inscriptionsToProcess.length > 0) {
      // IMPORTANT: for efficiency this script will take only the first inscription in a collection and assume all items
      //            within that collection use that mime_type
      let contentType = null;

      // Multi content_type collection (gets content_type of each item individually)
      if (MULTI_TYPE_COLLECTIONS.includes(collection)) {
        return await getInscriptionTypesPaginated(collection, inscriptions);
      } else { // Rely on first content_type of collection to set others (for efficiency)
        let json;
        let failed = false;
        try {
          json = await fetch(`https://api.hiro.so/ordinals/v1/inscriptions?limit=1&id=${inscriptions[0]?.id?.toLowerCase()}`, {
            headers: {
              'x-hiro-api-key': environment?.HIRO_API_KEY ?? null,
            }
          }).then(res => res.json());
        } catch {
          failed = true;
          console.log(`!! Failed`);
        }

        // Falls back to image/png if no mime_type (or inscription) found
        contentType = (!failed && json?.results?.[0] && json?.results?.[0]?.mime_type) ? json?.results?.[0]?.mime_type : 'image/png';

        if (contentType) {
          for (let i=0; i < inscriptions.length; i+=1) {
            let finalContentType = contentType;

            // Collection content_type override
            if (COLLECTION_WIDE_OVERRIDES[collection]) {
              finalContentType = COLLECTION_WIDE_OVERRIDES[collection];
            }

            // Item content_type override
            if (ITEM_WIDE_OVERRIDES[inscriptions[i].id]) {
              finalContentType = ITEM_WIDE_OVERRIDES[inscriptions[i].id];
            }

            inscriptions[i] = {
              ...inscriptions[i],
              content_type: finalContentType,
            };
          }
        }
      }

      currentBatchCount += 1;

      if ((currentBatchCount % BATCHES_BEFORE_DELAY) === 0) {
        console.log(`==== Hit ${BATCHES_BEFORE_DELAY} batches, waiting ${BATCH_TIMEOUT_DELAY}ms before continuing...`)
        await timeout(BATCH_TIMEOUT_DELAY);
      }

      console.log(`🤖 Processing batch ${currentBatchCount} (content_type)`);
    }

    return inscriptions;
  };

  for(let collection of getDirectories(path.resolve(__dirname, '../collections/'))) {
    console.log(`🌅 Adding content_type to ${collection}`);
    let filePath = `../collections/${collection}/inscriptions.json`;

    let inscriptions = [];
    try {
      inscriptions = JSON.parse(fs.readFileSync(path.resolve(__dirname, filePath)));
    } catch (e) {
      console.error(e);
    }

    let transformedInscriptions = await task(collection, inscriptions);
    fs.writeFileSync(path.resolve(__dirname, filePath), JSON.stringify(transformedInscriptions, null, null));
  }
};