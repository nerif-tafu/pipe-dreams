// Simplified version to test if the route is working
export async function POST({ request }) {
  console.log('SteamCMD login endpoint called at:', new Date().toISOString());
  
  try {
    const { username, password } = await request.json();
    
    if (!username || !password) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Username and password are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Simple test response without SteamCMD wrapper dependency
    return new Response(JSON.stringify({
      success: true,
      message: 'SteamCMD login endpoint is working (simplified)'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in SteamCMD login endpoint:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
