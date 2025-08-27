import { steamCmdManager } from '$lib/steamcmd-manager.js';

export async function POST() {
  try {
    const result = await steamCmdManager.processGameData();

    return new Response(JSON.stringify({
      success: true,
      message: result.message || 'Game data processed successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error processing game data:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
