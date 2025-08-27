import { SteamCmdWrapper } from './steamcmd.js';

class SteamCmdManager {
  constructor() {
    this.instance = null;
  }

  /**
   * Get or create the SteamCMD wrapper instance
   */
  getInstance() {
    if (!this.instance) {
      // Only create instance on server side
      if (typeof process !== 'undefined' && process.cwd) {
        this.instance = new SteamCmdWrapper(process.cwd());
      } else {
        throw new Error('SteamCMD wrapper can only be used on the server side');
      }
    }
    return this.instance;
  }

  /**
   * Check installation status
   */
  async checkInstallation() {
    const steamCmd = this.getInstance();
    return await steamCmd.checkInstallation();
  }

  /**
   * Install SteamCMD
   */
  async install() {
    const steamCmd = this.getInstance();
    return await steamCmd.install();
  }

  /**
   * Login to Steam
   */
  async login(username, password) {
    const steamCmd = this.getInstance();
    return await steamCmd.login(username, password);
  }

  /**
   * Download Rust game files
   */
  async downloadRust() {
    const steamCmd = this.getInstance();
    return await steamCmd.downloadRust();
  }

  /**
   * Get download progress
   */
  getDownloadProgress() {
    const steamCmd = this.getInstance();
    return steamCmd.getDownloadProgress();
  }

  /**
   * Cancel download
   */
  async cancelDownload() {
    const steamCmd = this.getInstance();
    return await steamCmd.cancelDownload();
  }

  /**
   * Logout from Steam
   */
  logout() {
    const steamCmd = this.getInstance();
    return steamCmd.logout();
  }

  /**
   * Get overall status
   */
  getStatus() {
    const steamCmd = this.getInstance();
    return steamCmd.getStatus();
  }

  /**
   * Check if currently logged in
   */
  isLoggedIn() {
    const steamCmd = this.getInstance();
    return steamCmd.isLoggedIn;
  }

  /**
   * Test method to verify wrapper is working
   */
  async test() {
    const steamCmd = this.getInstance();
    return await steamCmd.test();
  }

  /**
   * Process downloaded game data
   */
  async processGameData() {
    const steamCmd = this.getInstance();
    return await steamCmd.processGameData();
  }

  /**
   * Reset the instance (useful for testing or reinitialization)
   */
  reset() {
    this.instance = null;
  }
}

// Export a singleton instance
export const steamCmdManager = new SteamCmdManager();
