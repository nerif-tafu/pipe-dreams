import { steamCmdManager } from '$lib/steamcmd-manager.js';

export async function POST() {
  try {
    const result = await steamCmdManager.install();

    return new Response(JSON.stringify({
      success: true,
      message: 'SteamCMD installed successfully',
      path: result.path
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error installing SteamCMD:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
