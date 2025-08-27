// Simple localStorage-based API for item exclusions
// This is a temporary solution until database is set up

export async function GET() {
  try {
    // For now, return empty array - localStorage will be handled client-side
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching exclusions:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch exclusions' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST({ request }) {
  try {
    const { itemName, reason } = await request.json();
    
    if (!itemName || !itemName.trim()) {
      return new Response(JSON.stringify({ error: 'Item name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // For now, just return success - localStorage will be handled client-side
    const exclusion = {
      id: Date.now().toString(),
      itemName: itemName.trim(),
      reason: reason ? reason.trim() : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    return new Response(JSON.stringify(exclusion), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error creating exclusion:', error);
    return new Response(JSON.stringify({ error: 'Failed to create exclusion' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
