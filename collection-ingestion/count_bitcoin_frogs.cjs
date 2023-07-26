// Import the required modules
const axios = require('axios');
const { validate, getAddressInfo } = require('bitcoin-address-validation');

// Initialize variables
let offset = 0;
const limit = 40;
const addressTypes = {};
const purchaseAddressTypes = {};

// Create an axios instance with headers
const instance = axios.create({
  headers: {
    'Authorization': 'Bearer ',
    'accept': 'application/json',
  },
});

// Function to fetch data from the API
async function fetchData(url) {
  try {
    console.log(`Making request to ${url}`);
    const response = await instance.get(url);
    console.log(`Received response for request ${url}`);
    return response.data;
  } catch (error) {
    console.error('Request failed:', error.response.status, error.response.data);
    return null;
  }
}

// Function to validate and count address types
function countAddressTypes(tokens, addressStorage) {
  tokens.forEach(token => {
    try {
      const addressInfo = getAddressInfo(token.owner);
      if (addressInfo) {
        const type = addressInfo.type;
        if (addressStorage[type]) {
          addressStorage[type]++;
        } else {
          addressStorage[type] = 1;
        }
      }
    } catch (error) {
      console.error(`Address validation failed for ${token.owner}`, error);
    }
  });
}

// Function to fetch all data
async function fetchAllData() {
  let url = `https://api-mainnet.magiceden.dev/v2/ord/btc/tokens?collectionSymbol=bitcoin-punks&showAll=true&offset=${offset}&limit=${limit}&sortBy=inscriptionNumberDesc`;
  while (true) {
    const data = await fetchData(url);
    if (data && data.tokens && data.tokens.length > 0) {
      countAddressTypes(data.tokens, addressTypes);
      offset += limit;
      url = `https://api-mainnet.magiceden.dev/v2/ord/btc/tokens?collectionSymbol=bitcoin-punks&showAll=true&offset=${offset}&limit=${limit}&sortBy=inscriptionNumberDesc`;
    } else {
      break;
    }
  }

  // Reset offset for next API
  offset = 0;
  url = `https://api-mainnet.magiceden.dev/v2/ord/btc/activities?collectionSymbol=bitcoin-punks&kind=buying_broadcasted&offset=${offset}&limit=${limit}`;
  while (true) {
    const data = await fetchData(url);
    if (data && data.activities && data.activities.length > 0) {
      // For each activity, we're going to count the address types of oldOwner and newOwner
      countAddressTypes(data.activities.map(a => ({ owner: a.oldOwner })), purchaseAddressTypes);
      countAddressTypes(data.activities.map(a => ({ owner: a.newOwner })), purchaseAddressTypes);
      offset += limit;
      url = `https://api-mainnet.magiceden.dev/v2/ord/btc/activities?collectionSymbol=bitcoin-punks&kind=buying_broadcasted&offset=${offset}&limit=${limit}`;
    } else {
      break;
    }
  }

  // Print the results
  console.log("Token owner address types:", addressTypes);
  console.log("Purchase owner address types:", purchaseAddressTypes);
}

// Run the script
fetchAllData();
