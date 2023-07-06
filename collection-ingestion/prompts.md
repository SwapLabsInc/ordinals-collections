# magic.cjs

I need to write a Node script that is verbose about logging each step and api request. For all endpoints, you need to include an Authorization header in your HTTP requests and --header 'accept: application/json'. The value of the Authorization header should be Bearer followed by the API key (f633cf39-dac5-4efa-a231-daafdfa84fdc). Use cloudscraper for all requests. Be verbose about the output of failed requests for debug purposes. If any of the API calls fail, the script should wait 1 second then retry 5 times, then kill the script.

First, it needs to fetch the json response from the following API: https://api-mainnet.magiceden.dev/v2/ord/btc/collections. 

It should parse the json response and transform the following objects using this map, while retaining the values. Be prepared to write these post-transformed objects to meta.json later:

symbol -> slug (example slug j-art-collection which we will use as an example for this prompt)
name -> name
supply -> supply
inscriptionIcon -> inscription_icon
description -> description
twitterLink -> twitter_link
discordLink -> discord_link
websiteLink -> website_link

Forget about any objects with a slug that colides with folder names of any folder in ../newcollections/ 

Then, we should call a different endpoint. The URL is https://api-mainnet.magiceden.dev/v2/ord/btc/tokens?collectionSymbol=j-art-collection&showAll=true&offset=0&limit=40&sortBy=inscriptionNumberDesc.
In the responses there will be a "tokens array."  Each call to the API has a 40 object limit for the tokens array. We will need to continue to call the endpoint and incremement the offset 40 at a time to grab all the tokens objects. We need to capture and transform the keys for each object, while retaining the values. We should be prepared to write each object to a inscriptions.json without nesting it in a "tokens" array

id -> id
inscriptionNumber -> number
meta -> this is a nested object/array an no transformation needed

The script should then create a new folder ../newcollections/j-art-collection write meta.json to ../newcollections/j-art-collection/meta.json and the tokens objects to ../newcollections/j-art-collection/inscriptions.json

# reconcile.cjs

I need to write a Node script that is verbose about console output for each step. 

First, the script should go through the files ../newcollections/XXX/inscriptions.json (multiple folders with the same contained file name) and parse all of the objects inside each json file for the object "id" pair values. The script should then check for each of the IDs if there's a collision in any of other existing collections folders ../collections/XXX/inscriptions.json. If there's a collision, then the script should move ../newcollections/XXX/ folder to ../newcollections/collisioncollections/XXX since we are looking for ../newcollections/ to only contain folders with inscription arrays that have no collissions with existing.

# bitcoinpunks_reconciliation.cjs

I need to write a Node script that is verbose about console output for each step. 

First, the script should parse ../collections/bitcoin-punks/inscriptions.json and parse the objects inside. For each "id" pair value in the json array, it should compare and ensure it exists in ../newcollections/bitcoin-punks/inscriptions.json. Write the ones not seen in both to bitcoinpunks.txt