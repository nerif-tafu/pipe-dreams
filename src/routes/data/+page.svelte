<script>
  import { onMount } from 'svelte';
  import Navbar from '$lib/components/Navbar.svelte';

  // State
  let username = '';
  let password = '';
  let isLoggedIn = false;
  let isLoggingIn = false;
  let isUpdating = false;
  let isInstalling = false;
  let loginError = '';
  let updateProgress = 0;
  let updateStatus = '';
  let steamCmdPath = '';
  let steamCmdAvailable = false;
  let isProcessing = false;
  let processingStatus = '';
  let downloadCompleted = false;
  let itemDataStatus = {
    hasData: false,
    itemCount: 0,
    lastProcessed: null,
    message: 'No game data processed yet'
  };

  // Check if steamcmd directory exists
  onMount(async () => {
    await checkSteamCmdStatus();
    await checkItemDataStatus();
  });

  async function checkSteamCmdStatus() {
    try {
      const response = await fetch('/api/steamcmd/check');
      const data = await response.json();
      steamCmdPath = data.path;
      steamCmdAvailable = data.available;
      isLoggedIn = data.isLoggedIn || false;
      
      // Check if there's an existing download in progress
      if (data.downloadStatus && data.downloadStatus.isDownloading) {
        isUpdating = true;
        updateProgress = data.downloadStatus.progress;
        updateStatus = data.downloadStatus.status;
        
        // Set up event source for progress updates
        setupProgressStream();
      }
    } catch (error) {
      console.error('Failed to check steamcmd path:', error);
      steamCmdAvailable = false;
    }
  }

  async function checkItemDataStatus() {
    try {
      const response = await fetch('/api/items/status');
      const data = await response.json();
      itemDataStatus = data;
    } catch (error) {
      console.error('Failed to check item data status:', error);
      itemDataStatus = {
        hasData: false,
        itemCount: 0,
        lastProcessed: null,
        message: 'Failed to check item data status'
      };
    }
  }

  // Install SteamCMD
  async function installSteamCmd() {
    isInstalling = true;
    try {
      const response = await fetch('/api/steamcmd/install', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        await checkSteamCmdStatus();
      } else {
        console.error('Installation failed:', data.error);
      }
    } catch (error) {
      console.error('Installation error:', error);
    } finally {
      isInstalling = false;
    }
  }

  // Login to SteamCMD
  async function loginToSteam() {
    if (!username.trim() || !password.trim()) {
      loginError = 'Please enter both username and password';
      return;
    }

    isLoggingIn = true;
    loginError = '';

    try {
      const response = await fetch('/api/steamcmd/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        isLoggedIn = true;
        // Clear credentials immediately for security
        username = '';
        password = '';
      } else {
        loginError = data.error || 'Login failed. Please check your credentials.';
      }
    } catch (error) {
      loginError = 'Network error. Please try again.';
      console.error('Login error:', error);
    } finally {
      isLoggingIn = false;
    }
  }

  // Set up progress stream
  function setupProgressStream() {
    const eventSource = new EventSource('/api/steamcmd/progress');
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      updateProgress = data.progress;
      updateStatus = data.status;
      
      if (data.complete) {
        eventSource.close();
        isUpdating = false;
        updateStatus = 'Download completed successfully!';
        downloadCompleted = true;
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      isUpdating = false;
      updateStatus = 'Download failed. Please try again.';
    };
  }

  // Update game data
  async function updateGameData() {
    isUpdating = true;
    updateProgress = 0;
    updateStatus = 'Starting download...';

    try {
      const response = await fetch('/api/steamcmd/update', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start update');
      }

      // Check if download is already in progress
      if (data.alreadyInProgress) {
        updateStatus = 'Download already in progress, connecting to existing download...';
        // Set up event source for progress updates
        setupProgressStream();
      } else {
        // Set up event source for progress updates
        setupProgressStream();
      }

    } catch (error) {
      isUpdating = false;
      updateStatus = 'Failed to start download. Please try again.';
      console.error('Update error:', error);
    }
  }

  // Cancel download
  async function cancelDownload() {
    try {
      const response = await fetch('/api/steamcmd/cancel', {
        method: 'POST',
      });
      
      if (response.ok) {
        isUpdating = false;
        updateStatus = 'Download cancelled';
      }
    } catch (error) {
      console.error('Failed to cancel download:', error);
    }
  }

  // Process game data
  async function processGameData() {
    isProcessing = true;
    processingStatus = 'Processing game data...';

    try {
      const response = await fetch('/api/steamcmd/process', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        processingStatus = data.message;
        // Refresh item data status after successful processing
        await checkItemDataStatus();
      } else {
        processingStatus = data.error || 'Failed to process game data';
      }
    } catch (error) {
      processingStatus = 'Network error. Please try again.';
      console.error('Processing error:', error);
    } finally {
      isProcessing = false;
    }
  }

  // Logout
  function logout() {
    isLoggedIn = false;
    updateProgress = 0;
    updateStatus = '';
    downloadCompleted = false;
  }
</script>

<div class="min-h-screen bg-gray-50">
  <Navbar currentPage="data" />

  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="bg-white rounded-lg shadow-sm border p-8">
      
      <!-- Item Data Status -->
      <div class="mb-8">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Item Data Status</h2>
        <div class="bg-gray-50 rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-3 h-3 rounded-full {itemDataStatus.hasData ? 'bg-green-500' : 'bg-yellow-500'}"></div>
              <div class="text-sm text-gray-700">
                <div class="font-medium">{itemDataStatus.message}</div>
                {#if itemDataStatus.hasData && itemDataStatus.lastProcessed}
                  <div class="text-xs text-gray-500">
                    Last processed: {new Date(itemDataStatus.lastProcessed).toLocaleString()}
                  </div>
                {/if}
              </div>
            </div>
            {#if !steamCmdAvailable}
              <button
                on:click={installSteamCmd}
                disabled={isInstalling}
                class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                </svg>
                <span>{isInstalling ? 'Installing...' : 'Install SteamCMD'}</span>
              </button>
            {/if}
          </div>
        </div>
      </div>

      {#if !steamCmdAvailable}
        <!-- Installation Required -->
        <div class="space-y-6">
          <div>
            <h2 class="text-lg font-semibold text-gray-900 mb-4">SteamCMD Installation Required</h2>
            <p class="text-sm text-gray-600 mb-6">
              SteamCMD needs to be installed before you can download Rust game files. 
              Click the "Install SteamCMD" button above to automatically download and install SteamCMD.
            </p>
          </div>
        </div>
      {:else if !isLoggedIn}
        <!-- Login Form -->
        <div class="space-y-6">
          <div>
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Steam Login</h2>
            <p class="text-sm text-gray-600 mb-6">
              Enter your Steam credentials to authenticate with SteamCMD. 
              Your credentials will not be stored and are only used for authentication.
            </p>
          </div>

          <div class="space-y-4">
            <div>
              <label for="username" class="block text-sm font-medium text-gray-700 mb-2">
                Steam Username
              </label>
              <input
                id="username"
                type="text"
                bind:value={username}
                placeholder="Enter your Steam username"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isLoggingIn}
              />
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
                Steam Password
              </label>
              <input
                id="password"
                type="password"
                bind:value={password}
                placeholder="Enter your Steam password"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isLoggingIn}
              />
            </div>

            {#if loginError}
              <div class="bg-red-50 border border-red-200 rounded-md p-3">
                <p class="text-sm text-red-800">{loginError}</p>
              </div>
            {/if}

            <button
              on:click={loginToSteam}
              disabled={isLoggingIn || !username.trim() || !password.trim()}
              class="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
              </svg>
              <span>{isLoggingIn ? 'Logging in...' : 'Login to Steam'}</span>
            </button>
          </div>
        </div>
      {:else}
        <!-- Update Game Data -->
        <div class="space-y-6">
          {#if !downloadCompleted}
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold text-gray-900">Game Data Update</h2>
                <p class="text-sm text-gray-600 mt-1">
                  Download and update Rust game files using SteamCMD
                </p>
              </div>
              <button
                on:click={logout}
                class="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors flex items-center space-x-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                </svg>
                <span>Logout</span>
              </button>
            </div>

            <div class="bg-green-50 border border-green-200 rounded-md p-4">
              <div class="flex items-center space-x-3">
                <div class="w-3 h-3 rounded-full bg-green-500"></div>
                <span class="text-sm text-green-800">Successfully logged in to Steam</span>
              </div>
            </div>
          {:else}
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold text-gray-900">Process Game Data</h2>
                <p class="text-sm text-gray-600 mt-1">
                  Extract item information and images from downloaded game files
                </p>
              </div>
              <button
                on:click={logout}
                class="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors flex items-center space-x-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                </svg>
                <span>Logout</span>
              </button>
            </div>
          {/if}

          {#if !downloadCompleted}
            <div class="space-y-4">
              <div class="flex space-x-4">
                <button
                  on:click={updateGameData}
                  disabled={isUpdating}
                  class="flex-1 bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-lg font-medium flex items-center justify-center space-x-2"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                  </svg>
                  <span>{isUpdating ? 'Updating...' : 'Update Game Data'}</span>
                </button>
                {#if isUpdating}
                  <button
                    on:click={cancelDownload}
                    class="bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 transition-colors text-lg font-medium flex items-center justify-center space-x-2"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                    <span>Cancel</span>
                  </button>
                {/if}
              </div>

              {#if isUpdating || updateStatus}
                <div class="space-y-3">
                  <div class="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <div class="mb-2">
                      <span class="text-sm font-medium text-blue-800">Download Progress</span>
                    </div>
                    <div class="w-full bg-blue-200 rounded-full h-2">
                      <div 
                        class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style="width: {updateProgress}%"
                      ></div>
                    </div>
                    <p class="text-sm text-blue-700 mt-2">{updateStatus}</p>
                  </div>
                </div>
              {/if}
            </div>
          {:else}
            <div class="space-y-4">
              <div class="bg-green-50 border border-green-200 rounded-md p-4">
                <div class="flex items-center space-x-3">
                  <div class="w-3 h-3 rounded-full bg-green-500"></div>
                  <span class="text-sm text-green-800">Download completed! Ready to process game data.</span>
                </div>
              </div>

              <button
                on:click={processGameData}
                disabled={isProcessing}
                class="w-full bg-purple-600 text-white py-3 px-4 rounded-md hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-lg font-medium flex items-center justify-center space-x-2"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
                </svg>
                <span>{isProcessing ? 'Processing...' : 'Process Game Data'}</span>
              </button>

              {#if isProcessing || processingStatus}
                <div class="bg-purple-50 border border-purple-200 rounded-md p-4">
                  <p class="text-sm text-purple-700">{processingStatus}</p>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>
