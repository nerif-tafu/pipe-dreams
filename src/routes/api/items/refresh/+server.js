import { json } from '@sveltejs/kit';
import { writeFileSync, mkdirSync, existsSync, createWriteStream, unlinkSync, createReadStream, renameSync, readdirSync } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { Extract } from 'unzipper';

export async function POST() {
  try {
    console.log('Starting item data refresh from external API...');
    
    // Set a global timeout for the entire operation
    const globalTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Refresh operation timed out after 10 minutes')), 600000)
    );
    
    const refreshOperation = async () => {
      // Fetch data from external API
      const response = await fetch('https://rust-api.tafu.casa/api/items?limit=10000&offset=0');
      
      if (!response.ok) {
        throw new Error(`External API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.items || !Array.isArray(data.items)) {
        throw new Error('Invalid data format received from external API');
      }
      
      console.log(`Received ${data.items.length} items from external API`);
      
      // Transform the data to match our expected format
      const transformedItems = data.items.map(item => ({
        itemid: item.itemid,
        Name: item.displayName,
        shortname: item.shortname,
        Category: item.categoryName,
        Description: '', // External API doesn't provide descriptions
        filename: item.shortname,
        // Additional fields from external API
        pathId: item.pathId,
        category: item.category,
        stackable: item.stackable,
        volume: item.volume,
        ingredients: item.ingredients,
        craftTime: item.craftTime,
        amountToCreate: item.amountToCreate,
        workbenchLevelRequired: item.workbenchLevelRequired
      }));
      
      // Ensure the static/items directory exists
      const itemsDir = join(process.cwd(), 'static', 'items');
      if (!existsSync(itemsDir)) {
        mkdirSync(itemsDir, { recursive: true });
      }
      
      // Clean up existing data before refresh
      console.log('Cleaning up existing data...');
      
      // Remove existing item data file
      const itemDataPath = join(itemsDir, 'item-data.json');
      if (existsSync(itemDataPath)) {
        unlinkSync(itemDataPath);
        console.log('Removed existing item-data.json');
      }
      
      // Remove existing images (but keep the directory)
      const existingFiles = readdirSync(itemsDir);
      let removedImages = 0;
      for (const file of existingFiles) {
        if (file.endsWith('.png')) {
          try {
            unlinkSync(join(itemsDir, file));
            removedImages++;
          } catch (error) {
            console.log(`Warning: Could not remove existing image ${file}:`, error.message);
          }
        }
      }
      if (removedImages > 0) {
        console.log(`Removed ${removedImages} existing image files`);
      }
      
      // Save the transformed data
      writeFileSync(itemDataPath, JSON.stringify(transformedItems, null, 2));
      
      console.log(`Successfully saved ${transformedItems.length} items to local storage`);
      
      // Now automatically download and extract images with timeout
      console.log('Starting automatic image download...');
      
      try {
        // Add timeout to the fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout
        
        const imageResponse = await fetch('https://rust-api.tafu.casa/api/images/download-all', {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (imageResponse.ok) {
          // Save the zip file temporarily
          const zipPath = join(itemsDir, 'images.zip');
          const fileStream = createWriteStream(zipPath);
          
          console.log('Downloading images zip...');
          await pipeline(imageResponse.body, fileStream);
          
          console.log('Images zip downloaded successfully, extracting...');
          
          // Extract the zip file with better error handling
          try {
            console.log('Starting extraction with adm-zip...');
            
            // Use adm-zip instead of unzipper for better reliability
            const AdmZip = (await import('adm-zip')).default;
            
            const zip = new AdmZip(zipPath);
            const zipEntries = zip.getEntries();
            
            console.log(`Found ${zipEntries.length} files in zip, starting extraction...`);
            
            let extractedCount = 0;
            const totalFiles = zipEntries.length;
            
            // Extract files in batches to avoid overwhelming the system
            const batchSize = 50;
            for (let i = 0; i < zipEntries.length; i += batchSize) {
              const batch = zipEntries.slice(i, i + batchSize);
              
              for (const entry of batch) {
                if (entry.isDirectory) continue; // Skip directories
                
                try {
                  // Extract the file with its original name (no renaming)
                  const targetFilename = entry.entryName;
                  const targetPath = join(itemsDir, targetFilename);
                  
                  // Extract the file
                  zip.extractEntryTo(entry, itemsDir, false, true);
                  
                  extractedCount++;
                  
                  // Log progress every 50 files
                  if (extractedCount % 50 === 0) {
                    console.log(`Extracted ${extractedCount}/${totalFiles} files... (current: ${targetFilename})`);
                  }
                  
                  // Log the first few files for debugging
                  if (extractedCount <= 5) {
                    console.log(`Extracting: ${entry.entryName}`);
                  }
                } catch (entryError) {
                  console.log(`Warning: Failed to extract ${entry.entryName}:`, entryError.message);
                  // Continue with other files
                }
              }
              
              // Small delay between batches to prevent overwhelming the system
              if (i + batchSize < zipEntries.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            }
            
            console.log(`Extraction completed successfully. Total files extracted: ${extractedCount}`);
            
            // Summary of extraction results
            console.log(`Image extraction summary:`);
            console.log(`- Items with data: ${transformedItems.length}`);
            console.log(`- Total images extracted: ${totalFiles}`);
            console.log(`- Images extracted with original names (no renaming)`);
            
            // Clean up the zip file
            unlinkSync(zipPath);
            
            console.log('Images extracted successfully');
          } catch (extractError) {
            console.log('Extraction failed:', extractError.message);
            // Clean up the zip file
            try {
              unlinkSync(zipPath);
            } catch (cleanupError) {
              console.log('Could not clean up zip file:', cleanupError.message);
            }
            throw extractError; // Re-throw to fail the entire operation
          }
        } else {
          console.log('Warning: Failed to download images, but item data was saved successfully');
        }
      } catch (imageError) {
        console.log('Warning: Failed to download images, but item data was saved successfully:', imageError.message);
        
        // Clean up any partial zip file
        const zipPath = join(itemsDir, 'images.zip');
        if (existsSync(zipPath)) {
          try {
            unlinkSync(zipPath);
          } catch (cleanupError) {
            console.log('Warning: Could not clean up partial zip file:', cleanupError.message);
          }
        }
      }
      
      return {
        success: true,
        message: `Successfully refreshed ${transformedItems.length} items and downloaded images from external API`,
        itemCount: transformedItems.length,
        timestamp: new Date().toISOString()
      };
    };
    
    // Run the refresh operation with global timeout
    const result = await Promise.race([refreshOperation(), globalTimeout]);
    
    return json(result);
    
  } catch (error) {
    console.error('Error refreshing item data:', error);
    return json({
      error: 'Failed to refresh item data',
      details: error.message
    }, { status: 500 });
  }
}
