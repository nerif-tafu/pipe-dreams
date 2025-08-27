import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync, writeFileSync, unlinkSync, createReadStream, createWriteStream } from 'fs';
import { join } from 'path';
import pty from '@lydell/node-pty';
import { Extract } from 'unzipper';

const execAsync = promisify(exec);

export class SteamCmdWrapper {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.steamCmdDir = join(projectRoot, 'steamcmd');
    
    // Platform-agnostic executable name
    const platform = process.platform;
    if (platform === 'win32') {
      this.steamCmdExe = join(this.steamCmdDir, 'steamcmd.exe');
    } else {
      // Linux/macOS use steamcmd from linux32 directory
      this.steamCmdExe = join(this.steamCmdDir, 'linux32', 'steamcmd');
    }
    
    this.isInstalled = false;
    this.isLoggedIn = false;
    this.username = null;
    this.password = null;
    this.downloadProgress = 0;
    this.downloadStatus = '';
    this.isDownloading = false;
    this.currentProcess = null;
    this.currentPty = null;
    
    // Progress regex pattern from SteamCMD output
    this.progressRegex = /Update state \((0x\d+)\) ([^,]+), progress: (\d+.\d+) \((\d+) \/ (\d+)\)/;
  }

  /**
   * Check if SteamCMD is installed
   */
  async checkInstallation() {
    try {
      const dirExists = existsSync(this.steamCmdDir);
      const exeExists = existsSync(this.steamCmdExe);
      
      this.isInstalled = dirExists && exeExists;
      
      return {
        installed: this.isInstalled,
        path: this.steamCmdDir,
        message: this.isInstalled 
          ? 'SteamCMD is available and ready to use.' 
          : 'SteamCMD not found. Please install SteamCMD first.'
      };
    } catch (error) {
      console.error('Error checking SteamCMD installation:', error);
      return {
        installed: false,
        path: null,
        error: 'Failed to check SteamCMD status'
      };
    }
  }

  /**
   * Install SteamCMD automatically
   */
  async install() {
    try {
      console.log('Starting SteamCMD installation...');
      
      // Create steamcmd directory if it doesn't exist
      if (!existsSync(this.steamCmdDir)) {
        mkdirSync(this.steamCmdDir, { recursive: true });
        console.log('Created steamcmd directory');
      }

      // Download SteamCMD (platform-specific)
      const platform = process.platform;
      let downloadUrl, archivePath, archiveName;
      
      if (platform === 'win32') {
        downloadUrl = 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip';
        archiveName = 'steamcmd.zip';
      } else {
        // Linux/macOS
        downloadUrl = 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz';
        archiveName = 'steamcmd_linux.tar.gz';
      }
      
      archivePath = join(this.steamCmdDir, archiveName);
      
      console.log(`Downloading SteamCMD for ${platform}...`);
      await this.downloadFile(downloadUrl, archivePath);
      
      // Extract the archive
      console.log('Extracting SteamCMD...');
      if (platform === 'win32') {
        await this.extractZip(archivePath, this.steamCmdDir);
      } else {
        await this.extractTarGz(archivePath, this.steamCmdDir);
      }
      
      // Clean up the archive file
      try {
        if (existsSync(archivePath)) {
          unlinkSync(archivePath);
        }
      } catch (cleanupError) {
        console.error('Failed to cleanup archive file:', cleanupError);
      }
      
      // Set executable permissions on Linux/macOS
      if (process.platform !== 'win32') {
        try {
          const { chmod } = await import('fs/promises');
          await chmod(this.steamCmdExe, 0o755);
          console.log('Set executable permissions on SteamCMD');
          
          // Also set permissions on the shell script if it exists
          const shellScriptPath = join(this.steamCmdDir, 'steamcmd.sh');
          if (existsSync(shellScriptPath)) {
            await chmod(shellScriptPath, 0o755);
            console.log('Set executable permissions on steamcmd.sh');
          }
        } catch (chmodError) {
          console.error('Failed to set executable permissions:', chmodError);
          // Don't fail the installation for this, just warn
        }
      }
      
      // Verify installation
      const checkResult = await this.checkInstallation();
      if (checkResult.installed) {
        console.log('SteamCMD installation completed successfully!');
        return { success: true, message: 'SteamCMD installed successfully' };
      } else {
        throw new Error('Installation verification failed');
      }
      
    } catch (error) {
      console.error('SteamCMD installation failed:', error);
      return { 
        success: false, 
        error: `Installation failed: ${error.message}` 
      };
    }
  }

  /**
   * Download a file with progress tracking
   */
  async downloadFile(url, destination) {
    try {
      const https = await import('https');
      const http = await import('http');
      
      const protocol = url.startsWith('https:') ? https.default : http.default;
      
      return new Promise((resolve, reject) => {
        const request = protocol.get(url, (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
            return;
          }

          const totalSize = parseInt(response.headers['content-length'], 10);
          let downloadedSize = 0;
          
          const fileStream = createWriteStream(destination);
          
          response.on('data', (chunk) => {
            downloadedSize += chunk.length;
            if (totalSize) {
              const progress = Math.round((downloadedSize / totalSize) * 100);
              console.log(`Download progress: ${progress}%`);
            }
          });
          
          fileStream.on('finish', () => {
            fileStream.close();
            resolve();
          });
          
          fileStream.on('error', (error) => {
            try {
              if (existsSync(destination)) {
                unlinkSync(destination);
              }
            } catch (cleanupError) {
              console.error('Failed to cleanup file:', cleanupError);
            }
            reject(error);
          });
          
          response.pipe(fileStream);
        });
        
        request.on('error', reject);
        request.setTimeout(30000, () => {
          request.destroy();
          reject(new Error('Download timeout'));
        });
      });
    } catch (error) {
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  /**
   * Extract ZIP file (platform-agnostic)
   */
  async extractZip(zipPath, extractPath) {
    try {
      console.log(`Extracting ${zipPath} to ${extractPath}...`);
      
      // Use unzipper for cross-platform ZIP extraction
      const extract = Extract({ path: extractPath });
      
      return new Promise((resolve, reject) => {
        createReadStream(zipPath)
          .pipe(extract)
          .on('close', () => {
            console.log('Extraction completed');
            resolve();
          })
          .on('error', (error) => {
            console.error('Extraction error:', error);
            reject(new Error(`Failed to extract ZIP: ${error.message}`));
          });
      });
    } catch (error) {
      console.error('Extraction error:', error);
      throw new Error(`Failed to extract ZIP: ${error.message}`);
    }
  }

  /**
   * Extract TAR.GZ file (Linux/macOS)
   */
  async extractTarGz(tarGzPath, extractPath) {
    try {
      console.log(`Extracting ${tarGzPath} to ${extractPath}...`);
      
      // Use tar command for TAR.GZ extraction
      const { stdout, stderr } = await execAsync(
        `tar -xzf "${tarGzPath}" -C "${extractPath}"`,
        { cwd: extractPath }
      );
      
      console.log('TAR.GZ extraction completed');
    } catch (error) {
      console.error('TAR.GZ extraction error:', error);
      throw new Error(`Failed to extract TAR.GZ: ${error.message}`);
    }
  }

  /**
   * Login to Steam
   */
  async login(username, password) {
    try {
      if (!this.isInstalled) {
        const checkResult = await this.checkInstallation();
        if (!checkResult.installed) {
          throw new Error('SteamCMD not installed');
        }
      }

      // Create login script
      const scriptContent = `
@ShutdownOnFailedCommand 1
@NoPromptForPassword 1
login ${username} ${password}
quit
      `.trim();

      const scriptPath = join(this.steamCmdDir, 'login_script.txt');
      
      try {
        writeFileSync(scriptPath, scriptContent);
        
        // Execute steamcmd with login script
        const { stdout, stderr } = await execAsync(
          `"${this.steamCmdExe}" +runscript login_script.txt`,
          { cwd: this.steamCmdDir, timeout: 30000 }
        );

        const output = stdout + stderr;
        
        // Check for login success
        const loginSuccess = output.includes('OK') && 
                            (output.includes('Logging directory') || 
                             output.includes('Steam Guard') ||
                             output.includes('Success'));

        if (loginSuccess) {
          this.isLoggedIn = true;
          this.username = username;
          this.password = password;
          return { success: true, message: 'Login successful' };
        } else {
          // Handle specific error cases
          if (output.includes('Invalid password')) {
            throw new Error('Invalid password. Please check your credentials.');
          } else if (output.includes('Invalid user')) {
            throw new Error('Invalid username. Please check your credentials.');
          } else if (output.includes('Steam Guard')) {
            throw new Error('Steam Guard is enabled. Please disable it temporarily or use a Steam Guard code.');
          } else {
            throw new Error('Login failed. Please check your credentials and try again.');
          }
        }
      } finally {
        // Clean up script file
        try {
          if (existsSync(scriptPath)) {
            unlinkSync(scriptPath);
          }
        } catch (cleanupError) {
          console.error('Failed to cleanup login script:', cleanupError);
        }
      }
    } catch (error) {
      console.error('SteamCMD login error:', error);
      this.isLoggedIn = false;
      throw error;
    }
  }

      /**
   * Download Rust game files
   */
  async downloadRust() {
    try {
      if (!this.isInstalled) {
        throw new Error('SteamCMD not installed');
      }

      if (!this.isLoggedIn) {
        throw new Error('Not logged in. Please login first.');
      }

      if (this.isDownloading) {
        throw new Error('Download already in progress');
      }

      // Create download script
      const scriptContent = `
@ShutdownOnFailedCommand 1
@NoPromptForPassword 1
force_install_dir ./rust
login ${this.username} ${this.password}
app_update 252490 validate
quit
      `.trim();

      const scriptPath = join(this.steamCmdDir, 'download_rust.txt');
      
      writeFileSync(scriptPath, scriptContent);
      
      // Start download process
      this.isDownloading = true;
      this.downloadProgress = 0;
      this.downloadStatus = 'Starting download...';

      console.log('Starting SteamCMD download process...');
      console.log(`Command: "${this.steamCmdExe}" +runscript download_rust.txt`);
      console.log(`Working directory: ${this.steamCmdDir}`);

      // Use pty for better terminal emulation
      const steamCmdPty = pty.spawn(this.steamCmdExe, ['+runscript', 'download_rust.txt'], {
        cwd: this.steamCmdDir,
        cols: 80,
        rows: 30
      });

      this.currentPty = steamCmdPty;
      let stdout = '';
      let stderr = '';

      // Handle real-time output and progress parsing
      this.currentProcess = new Promise((resolve, reject) => {
        steamCmdPty.onData((data) => {
          const output = data.toString();
          stdout += output;
          console.log('SteamCMD Output:', output);

          // Parse progress updates from SteamCMD output
          const lines = output.split('\n');
          for (const line of lines) {
            const match = this.progressRegex.exec(line);
            if (match) {
              const [, stateCode, state, progressPercent, progressAmount, progressTotalAmount] = match;
              const progress = parseFloat(progressPercent);
              
              console.log(`Progress Update: ${state} - ${progress}% (${progressAmount}/${progressTotalAmount})`);
              
              this.downloadProgress = Math.round(progress);
              this.downloadStatus = `${state}... ${this.downloadProgress}%`;
            }
          }
        });

        steamCmdPty.onExit((event) => {
          const exitCode = event.exitCode;
          console.log(`SteamCMD process exited with code ${exitCode}`);
          
          this.currentPty = null;
          this.isDownloading = false;

          // Clean up script file after process completes
          try {
            if (existsSync(scriptPath)) {
              unlinkSync(scriptPath);
              console.log('Cleaned up download script file');
            }
          } catch (cleanupError) {
            console.error('Failed to cleanup download script:', cleanupError);
          }

          if (exitCode === 0) {
            // Check for successful completion indicators
            const output = stdout + stderr;
            const successIndicators = [
              'Success! App \'244390\' fully installed.',
              'App \'244390\' state changed : Fully Installed',
              'Update complete',
              'App \'244390\' fully installed'
            ];
            
            const isSuccessful = successIndicators.some(indicator => 
              output.includes(indicator)
            );
            
            if (isSuccessful) {
              this.downloadProgress = 100;
              this.downloadStatus = 'Download completed successfully!';
            } else {
              this.downloadProgress = 100;
              this.downloadStatus = 'Download completed (verification needed)';
            }
            
            resolve({ stdout, stderr, exitCode });
          } else {
            this.downloadStatus = `Download failed with exit code ${exitCode}`;
            reject(new Error(`SteamCMD process exited with code ${exitCode}`));
          }
        });
      });

      return { success: true, message: 'Download started successfully' };
      
    } catch (error) {
      this.isDownloading = false;
      this.downloadStatus = `Download failed: ${error.message}`;
      console.error('SteamCMD download error:', error);
      throw error;
    }
  }

  /**
   * Get current download progress
   */
  getDownloadProgress() {
    return {
      progress: this.downloadProgress,
      status: this.downloadStatus,
      isDownloading: this.isDownloading
    };
  }

  /**
   * Cancel current download
   */
  async cancelDownload() {
    if (this.currentPty && this.isDownloading) {
      try {
        // Kill the pty process
        this.currentPty.kill();
        this.currentPty = null;
        
        this.isDownloading = false;
        this.downloadStatus = 'Download cancelled';
        this.currentProcess = null;
        return { success: true, message: 'Download cancelled' };
      } catch (error) {
        console.error('Failed to cancel download:', error);
        return { success: false, error: 'Failed to cancel download' };
      }
    }
    return { success: false, error: 'No download in progress' };
  }

  /**
   * Logout from Steam
   */
  logout() {
    this.isLoggedIn = false;
    this.username = null;
    this.password = null;
    this.downloadProgress = 0;
    this.downloadStatus = '';
    return { success: true, message: 'Logged out successfully' };
  }

  /**
   * Get installation status
   */
  getStatus() {
    return {
      installed: this.isInstalled,
      loggedIn: this.isLoggedIn,
      downloading: this.isDownloading,
      path: this.steamCmdDir
    };
  }

  /**
   * Calculate real download progress by monitoring the download directory
   */
  async calculateRealProgress() {
    try {
      const rustDir = join(this.steamCmdDir, 'rust');
      if (!existsSync(rustDir)) {
        return 0;
      }

      // Get total size of all files in the rust directory
      const { execSync } = await import('child_process');
      const { readdirSync, statSync } = await import('fs');
      
      let totalSize = 0;
      let fileCount = 0;
      
      const calculateDirSize = (dir) => {
        try {
          const items = readdirSync(dir);
          for (const item of items) {
            const itemPath = join(dir, item);
            const stats = statSync(itemPath);
            
            if (stats.isDirectory()) {
              calculateDirSize(itemPath);
            } else {
              totalSize += stats.size;
              fileCount++;
            }
          }
        } catch (error) {
          // Ignore errors for inaccessible files
        }
      };
      
             calculateDirSize(rustDir);
       
       // Rust is approximately 20GB, so we'll estimate progress based on that
       const estimatedTotalSize = 20 * 1024 * 1024 * 1024; // 20GB in bytes
       const progress = Math.min((totalSize / estimatedTotalSize) * 100, 99);
       
       console.log(`Progress calculation: ${totalSize} bytes / ${estimatedTotalSize} bytes = ${progress}% (${fileCount} files)`);
       
       return Math.round(progress);
    } catch (error) {
      console.error('Error calculating real progress:', error);
      return 0;
    }
  }

  /**
   * Track real download progress updates
   */
  async trackRealProgress() {
    if (!this.isDownloading) return;
    
    const progressInterval = setInterval(async () => {
      if (!this.isDownloading) {
        clearInterval(progressInterval);
        return;
      }
      
      try {
        const realProgress = await this.calculateRealProgress();
        
                 // Only update if we have meaningful progress
         if (realProgress > this.downloadProgress) {
           console.log(`Progress updated: ${this.downloadProgress}% -> ${realProgress}%`);
           this.downloadProgress = realProgress;
           this.downloadStatus = `Downloading... ${realProgress}%`;
         } else if (realProgress >= 95) {
           // If we're at 95% or higher, show finalizing
           console.log(`Finalizing at ${realProgress}%`);
           this.downloadStatus = `Finalizing... ${realProgress}%`;
         } else {
           console.log(`No progress update: current=${this.downloadProgress}%, calculated=${realProgress}%`);
         }
      } catch (error) {
        console.error('Error tracking real progress:', error);
      }
    }, 5000); // Check every 5 seconds
    
    // Store the interval so we can clear it when needed
    this.progressInterval = progressInterval;
  }

  /**
   * Simulate download progress updates (fallback)
   */
  simulateProgress() {
    if (!this.isDownloading) return;
    
    const progressInterval = setInterval(() => {
      if (!this.isDownloading) {
        clearInterval(progressInterval);
        return;
      }
      
      // Increment progress gradually up to 95%
      if (this.downloadProgress < 95) {
        this.downloadProgress += Math.random() * 3 + 1; // 1-4% increment
        this.downloadStatus = `Downloading... ${Math.round(this.downloadProgress)}%`;
      } else if (this.downloadProgress >= 95 && this.downloadProgress < 99.5) {
        // Slow down near the end
        this.downloadProgress += Math.random() * 1 + 0.5; // 0.5-1.5% increment
        this.downloadStatus = `Finalizing... ${Math.round(this.downloadProgress)}%`;
      } else if (this.downloadProgress >= 99.5) {
        // Very slow progress near completion
        this.downloadProgress += Math.random() * 0.3 + 0.1; // 0.1-0.4% increment
        this.downloadStatus = `Finalizing... ${Math.round(this.downloadProgress)}%`;
      }
    }, 2000); // Update every 2 seconds
    
    // Store the interval so we can clear it when needed
    this.progressInterval = progressInterval;
  }

  /**
   * Process downloaded game files to extract item data and images
   */
  async processGameData() {
    try {
      console.log('Processing game data...');
      
      const itemsDir = join(this.steamCmdDir, 'rust', 'Bundles', 'items');
      const outputDir = join(this.projectRoot, 'static', 'items');
      
      // Create output directory if it doesn't exist
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
        console.log('Created items output directory');
      }
      
      // Get all files in the items directory
      const { readdirSync } = await import('fs');
      const files = readdirSync(itemsDir);
      
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      const pngFiles = files.filter(file => file.endsWith('.png'));
      
      console.log(`Found ${jsonFiles.length} JSON files and ${pngFiles.length} PNG files`);
      
      // Process JSON files to create unified item-data.json
      // Only include items that have corresponding PNG files
      const { readFileSync, writeFileSync, copyFileSync } = await import('fs');
      const allItems = [];
      const validPngFiles = [];
      
      // First, verify which PNG files actually exist on disk
      for (const pngFile of pngFiles) {
        const pngPath = join(itemsDir, pngFile);
        if (existsSync(pngPath)) {
          validPngFiles.push(pngFile);
        } else {
          console.log(`Skipping ${pngFile} - file does not exist on disk`);
        }
      }
      
      console.log(`Found ${validPngFiles.length} valid PNG files out of ${pngFiles.length} listed`);
      
      // Now process JSON files, but only include those with verified PNG files
      for (const jsonFile of jsonFiles) {
        try {
          const jsonPath = join(itemsDir, jsonFile);
          const jsonContent = readFileSync(jsonPath, 'utf8');
          const itemData = JSON.parse(jsonContent);
          
          // Get the filename without extension
          const filename = jsonFile.replace('.json', '');
          
          // Check if corresponding PNG file exists in our verified list
          const pngFile = `${filename}.png`;
          if (validPngFiles.includes(pngFile)) {
            // Add the filename for reference
            itemData.filename = filename;
            allItems.push(itemData);
            console.log(`Including ${jsonFile} - has verified PNG file`);
          } else {
            console.log(`Skipping ${jsonFile} - no verified PNG file found`);
          }
        } catch (error) {
          console.error(`Error processing ${jsonFile}:`, error.message);
        }
      }
      
      // Sort items by name for better organization
      allItems.sort((a, b) => a.Name.localeCompare(b.Name));
      
      // Write unified item data
      const unifiedDataPath = join(outputDir, 'item-data.json');
      writeFileSync(unifiedDataPath, JSON.stringify(allItems, null, 2));
      console.log(`Created unified item data with ${allItems.length} items: ${unifiedDataPath}`);
      
      // Copy only the verified PNG files
      let copiedImages = 0;
      for (const pngFile of validPngFiles) {
        try {
          const sourcePath = join(itemsDir, pngFile);
          const destPath = join(outputDir, pngFile);
          copyFileSync(sourcePath, destPath);
          copiedImages++;
        } catch (error) {
          console.error(`Error copying ${pngFile}:`, error.message);
        }
      }
      
      console.log(`Copied ${copiedImages} image files to ${outputDir}`);
      
      return {
        success: true,
        message: `Successfully processed ${allItems.length} items and copied ${copiedImages} images`,
        itemsProcessed: allItems.length,
        imagesCopied: copiedImages,
        outputPath: outputDir
      };
      
    } catch (error) {
      console.error('Error processing game data:', error);
      return {
        success: false,
        error: `Failed to process game data: ${error.message}`
      };
    }
  }

  /**
   * Test method to verify wrapper is working
   */
  async test() {
    try {
      const checkResult = await this.checkInstallation();
      return {
        success: true,
        message: 'SteamCMD wrapper is working correctly',
        installation: checkResult
      };
    } catch (error) {
      return {
        success: false,
        error: `Test failed: ${error.message}`
      };
    }
  }
}
