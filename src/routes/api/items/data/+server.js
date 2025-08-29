import { json } from '@sveltejs/kit';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const itemDataPath = join(process.cwd(), 'static', 'items', 'item-data.json');
    
    if (!existsSync(itemDataPath)) {
      return json({
        error: 'No item data available. Please process game data first.'
      }, { status: 404 });
    }
    
    const itemDataContent = readFileSync(itemDataPath, 'utf8');
    const items = JSON.parse(itemDataContent);
    
    return json(items, {
      headers: {
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    });
    
  } catch (error) {
    console.error('Error serving item data:', error);
    return json({
      error: 'Failed to load item data'
    }, { status: 500 });
  }
}
