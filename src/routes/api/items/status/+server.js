import { json } from '@sveltejs/kit';
import { existsSync, statSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const itemsDir = join(process.cwd(), 'static', 'items');
    const itemDataPath = join(itemsDir, 'item-data.json');
    
    // Check if item data exists
    if (!existsSync(itemDataPath)) {
      return json({
        hasData: false,
        itemCount: 0,
        lastProcessed: null,
        message: 'No game data processed yet'
      });
    }
    
    // Get file stats for last modified time
    const stats = statSync(itemDataPath);
    const lastProcessed = stats.mtime;
    
    // Read the item data to get count
    const { readFileSync } = await import('fs');
    const itemDataContent = readFileSync(itemDataPath, 'utf8');
    const items = JSON.parse(itemDataContent);
    
    return json({
      hasData: true,
      itemCount: items.length,
      lastProcessed: lastProcessed.toISOString(),
      message: `${items.length} items processed`
    });
    
  } catch (error) {
    console.error('Error checking item data status:', error);
    return json({
      hasData: false,
      itemCount: 0,
      lastProcessed: null,
      error: error.message || 'Failed to check item data status'
    }, { status: 500 });
  }
}
