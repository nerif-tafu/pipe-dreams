// Simple localStorage-based API for item variation groups
// This is a temporary solution until database is set up

export async function GET() {
  try {
    // For now, return empty array - localStorage will be handled client-side
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching variation groups:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch variation groups' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST({ request }) {
  try {
    const { name, description, originalItemName, variationItemNames } = await request.json();
    
    if (!name || !name.trim()) {
      return new Response(JSON.stringify({ error: 'Group name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!originalItemName) {
      return new Response(JSON.stringify({ error: 'Original item is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!variationItemNames || variationItemNames.length === 0) {
      return new Response(JSON.stringify({ error: 'At least one variation item is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // For now, just return success - localStorage will be handled client-side
    const group = {
      id: Date.now().toString(),
      name: name.trim(),
      description: description ? description.trim() : null,
      originalItemId: Date.now().toString(),
      originalItem: {
        id: Date.now().toString(),
        itemName: originalItemName,
        isOriginal: true
      },
      variations: [
        {
          id: Date.now().toString(),
          itemName: originalItemName,
          isOriginal: true,
          groupId: Date.now().toString()
        },
        ...variationItemNames.map(itemName => ({
          id: (Date.now() + Math.random()).toString(),
          itemName,
          isOriginal: false,
          groupId: Date.now().toString()
        }))
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    return new Response(JSON.stringify(group), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error creating variation group:', error);
    return new Response(JSON.stringify({ error: 'Failed to create variation group' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
