export async function GET() {
  console.log('Test API endpoint called');
  
  return new Response(JSON.stringify({
    message: 'API routes are working!',
    timestamp: new Date().toISOString()
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
