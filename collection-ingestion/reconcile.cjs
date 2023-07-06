const fs = require('fs').promises;
const path = require('path');

async function main() {
  console.log("Starting script...");
  
  // Get all directories under ../newcollectionscollections/
  const newCollectionsDirs = await fs.readdir(path.resolve(__dirname, "../newcollectionscollections"), { withFileTypes: true });
  const newCollectionNames = newCollectionsDirs.filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);

  for (const collectionName of newCollectionNames) {
    console.log(`Processing ${collectionName}...`);
    
    // Read and parse inscriptions.json
    const inscriptionsPath = path.resolve(__dirname, `../collections/${collectionName}/inscriptions.json`);
    const inscriptionsJson = JSON.parse(await fs.readFile(inscriptionsPath, 'utf8'));
    
    // Get the list of ids
    const ids = inscriptionsJson.map(item => item.id);

    // Check for id collisions
    const collectionsDirs = await fs.readdir(path.resolve(__dirname, "../collections"), { withFileTypes: true });
    const collectionNames = collectionsDirs.filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);
    
    for (const id of ids) {
      console.log(`Checking for id collision for ${id}...`);
      
      for (const checkCollectionName of collectionNames) {
        if (collectionName === checkCollectionName) continue; // Skip self
        
        const checkPath = path.resolve(__dirname, `../collections/${checkCollectionName}`);
        const files = await fs.readdir(checkPath);
        
        if (files.includes(id)) {
          console.log(`Collision found for ${id} in ${checkCollectionName}`);
          
          const originalPath = path.resolve(__dirname, `../newcollections/${collectionName}`);
          const newPath = path.resolve(__dirname, `../collisionCollections/${collectionName}`);
          
          await fs.rename(originalPath, newPath);
          console.log(`Moved ${originalPath} to ${newPath}`);
          
          break; // No need to check other collections
        }
      }
    }
  }

  console.log("Script finished");
}

main().catch(error => console.error(error));
