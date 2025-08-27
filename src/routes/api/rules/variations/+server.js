// Simple localStorage-based API for item variations
// This is a temporary solution until database is set up

export async function GET() {
  try {
    // For now, return empty array - localStorage will be handled client-side
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching variations:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch variations' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
