const fs = require('fs');
const path = require('path');
const cloudscraper = require('cloudscraper');
const retry = require('async-retry');
require('dotenv').config();

const API_KEY = '';
const AUTH_HEADER = `Bearer ${API_KEY}`;
const COLLECTIONS_API = 'https://api-mainnet.magiceden.dev/v2/ord/btc/collections';
const TOKENS_API = 'https://api-mainnet.magiceden.dev/v2/ord/btc/tokens';
const TOKENS_LIMIT = 40;
const RETRY_ATTEMPTS = 5;

const NEW_COLLECTIONS_DIR = path.join(__dirname, '../newcollections');

const requestOptions = {
  headers: {
    'Authorization': AUTH_HEADER,
    'Accept': 'application/json'
  },
  json: true
};

const mapCollection = collection => ({
  slug: collection.symbol,
  name: collection.name,
  supply: collection.supply,
  inscription_icon: collection.inscriptionIcon,
  description: collection.description,
  twitter_link: collection.twitterLink,
  discord_link: collection.discordLink,
  website_link: collection.websiteLink
});

const mapToken = token => ({
  id: token.id,
  number: token.inscriptionNumber,
  meta: token.meta
});

async function main() {
  try {
    const collectionsResponse = await retry(() => cloudscraper.get(COLLECTIONS_API, requestOptions), {
      retries: RETRY_ATTEMPTS,
      minTimeout: 1000
    });
    const collections = collectionsResponse.map(mapCollection)
      .filter(collection => !fs.existsSync(path.join(NEW_COLLECTIONS_DIR, collection.slug)));

    for (const collection of collections) {
      const dirPath = path.join(NEW_COLLECTIONS_DIR, collection.slug);
      fs.mkdirSync(dirPath, { recursive: true });
      fs.writeFileSync(path.join(dirPath, 'meta.json'), JSON.stringify(collection));

      let offset = 0;
      const tokens = [];
      while (true) {
        const tokensResponse = await retry(() => cloudscraper.get(`${TOKENS_API}?collectionSymbol=${collection.slug}&showAll=true&offset=${offset}&limit=${TOKENS_LIMIT}&sortBy=inscriptionNumberDesc`, requestOptions), {
          retries: RETRY_ATTEMPTS,
          minTimeout: 1000
        });

        tokens.push(...tokensResponse.tokens.map(mapToken));
        if (tokensResponse.tokens.length < TOKENS_LIMIT) {
          break;
        }
        offset += TOKENS_LIMIT;
      }
      fs.writeFileSync(path.join(dirPath, 'inscriptions.json'), JSON.stringify(tokens));
    }
  } catch (error) {
    console.error(`An error occurred: ${error}`);
    process.exit(1);
  }
}

main();
