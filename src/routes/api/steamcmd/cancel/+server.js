import { steamCmdManager } from '$lib/steamcmd-manager.js';

export async function POST() {
  try {
    const result = await steamCmdManager.cancelDownload();

    return new Response(JSON.stringify({
      success: true,
      message: 'Download cancelled successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error cancelling download:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
