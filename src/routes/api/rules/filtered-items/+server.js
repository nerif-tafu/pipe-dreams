import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    // Load all items from the processed data
    const itemsPath = join(process.cwd(), 'static', 'items', 'item-data.json');
    const rawItems = JSON.parse(readFileSync(itemsPath, 'utf8'));
    
    // For now, just return all items - filtering will be handled client-side
    // This is a temporary solution until database is set up
    
    return new Response(JSON.stringify(rawItems), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error getting filtered items:', error);
    return new Response(JSON.stringify({ error: 'Failed to get filtered items' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
