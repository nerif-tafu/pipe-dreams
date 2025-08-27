import { steamCmdManager } from '$lib/steamcmd-manager.js';

export async function POST({ request }) {
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

    const result = await steamCmdManager.login(username, password);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Login successful'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error logging in to SteamCMD:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
