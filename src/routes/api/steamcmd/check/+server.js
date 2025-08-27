// Simplified version to test if the route is working
export async function GET() {
  console.log('SteamCMD check endpoint called at:', new Date().toISOString());
  
  try {
    // Simple test response without SteamCMD wrapper dependency
    return new Response(JSON.stringify({
      available: false,
      path: null,
      isLoggedIn: false,
      downloadStatus: null,
      message: 'SteamCMD check endpoint is working (simplified)'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in SteamCMD check endpoint:', error);
    return new Response(JSON.stringify({
      available: false,
      path: null,
      isLoggedIn: false,
      downloadStatus: null,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
