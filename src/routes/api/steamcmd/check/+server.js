import { steamCmdManager } from '$lib/steamcmd-manager.js';

export async function GET() {
  console.log('SteamCMD check endpoint called at:', new Date().toISOString());
  
  try {
    const status = await steamCmdManager.checkInstallation();
    const isLoggedIn = steamCmdManager.isLoggedIn();
    const downloadStatus = steamCmdManager.getDownloadProgress();
    
    console.log('SteamCMD check result:', { status, isLoggedIn, downloadStatus });
    
    return new Response(JSON.stringify({
      available: status.installed,
      path: status.path,
      isLoggedIn,
      downloadStatus
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error checking SteamCMD status:', error);
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
