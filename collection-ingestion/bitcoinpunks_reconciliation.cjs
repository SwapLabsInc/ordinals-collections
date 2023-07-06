const fs = require('fs');
const path = require('path');

const oldCollectionsDir = path.join('..', 'collections', 'bitcoin-punks');
const newCollectionsDir = path.join('..', 'newcollections', 'bitcoin-punks');

const oldInscriptionsFile = path.join(oldCollectionsDir, 'inscriptions.json');
const newInscriptionsFile = path.join(newCollectionsDir, 'inscriptions.json');

const outputFile = 'bitcoinpunks.txt';

function readAndParseJsonFile(filePath) {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
}

console.log('Parsing old inscriptions...');
const oldInscriptions = readAndParseJsonFile(oldInscriptionsFile);

console.log('Parsing new inscriptions...');
const newInscriptions = readAndParseJsonFile(newInscriptionsFile);

console.log('Comparing inscription IDs...');
const newInscriptionIds = new Set(newInscriptions.map(i => i.id));
const missingInscriptions = oldInscriptions.filter(i => !newInscriptionIds.has(i.id));

console.log(`Found ${missingInscriptions.length} inscriptions missing in the new collection.`);

console.log(`Writing missing inscription IDs to ${outputFile}...`);
fs.writeFileSync(outputFile, missingInscriptions.map(i => i.id).join('\n'), 'utf-8');

console.log('Done.');
