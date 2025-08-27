// Simplified version to test if the route is working
export async function POST() {
  console.log('SteamCMD cancel endpoint called at:', new Date().toISOString());
  
  try {
    // Simple test response without SteamCMD wrapper dependency
    return new Response(JSON.stringify({
      success: true,
      message: 'SteamCMD cancel endpoint is working (simplified)'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in SteamCMD cancel endpoint:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
