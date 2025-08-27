import { steamCmdManager } from '$lib/steamcmd-manager.js';

export async function POST() {
  try {
    // Check if download is already in progress
    const downloadStatus = steamCmdManager.getDownloadProgress();
    if (downloadStatus && downloadStatus.isDownloading) {
      return new Response(JSON.stringify({
        success: true,
        alreadyInProgress: true,
        message: 'Download already in progress'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Start the download
    const result = await steamCmdManager.downloadRust();
    
    return new Response(JSON.stringify({
      success: true,
      alreadyInProgress: false,
      message: 'Download started successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error starting Rust download:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
