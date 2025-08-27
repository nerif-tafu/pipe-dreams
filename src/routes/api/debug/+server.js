export async function GET({ request }) {
  console.log('Debug endpoint called at:', new Date().toISOString());
  console.log('Request URL:', request.url);
  console.log('Request method:', request.method);
  console.log('Request headers:', Object.fromEntries(request.headers.entries()));
  
  return new Response(JSON.stringify({
    message: 'Debug endpoint reached!',
    timestamp: new Date().toISOString(),
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries())
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function POST({ request }) {
  console.log('Debug POST endpoint called at:', new Date().toISOString());
  console.log('Request URL:', request.url);
  console.log('Request method:', request.method);
  
  return new Response(JSON.stringify({
    message: 'Debug POST endpoint reached!',
    timestamp: new Date().toISOString(),
    url: request.url,
    method: request.method
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
