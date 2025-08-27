// Simple localStorage-based API for deleting item exclusions
// This is a temporary solution until database is set up

export async function DELETE({ params }) {
  try {
    const { id } = params;
    
    // For now, just return success - localStorage will be handled client-side
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deleting exclusion:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete exclusion' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
