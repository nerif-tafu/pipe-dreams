<script>
  import { onMount } from 'svelte';
  import Navbar from '$lib/components/Navbar.svelte';
  import Toast from '$lib/components/Toast.svelte';

  // State
  let isRefreshingData = false;
  let refreshStatus = '';
  let itemDataStatus = {
    hasData: false,
    itemCount: 0,
    lastProcessed: null,
    message: 'No item data available'
  };

  // Toast state
  let toastMessage = '';
  let toastType = 'success';
  let showToast = false;

  // Check item data status on mount
  onMount(async () => {
    await checkItemDataStatus();
  });

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

  // Refresh item data from external API
  async function refreshItemData() {
    isRefreshingData = true;
    refreshStatus = 'Fetching item data from external API...';

    try {
      const response = await fetch('/api/items/refresh', {
        method: 'POST'
      });

      const data = await response.json();

      if (response.ok) {
        refreshStatus = data.message;
        showToastMessage(data.message, 'success');
        // Refresh the status display
        await checkItemDataStatus();
      } else {
        refreshStatus = `Error: ${data.error}`;
        showToastMessage(`Failed to refresh data: ${data.error}`, 'error');
      }
    } catch (error) {
      refreshStatus = `Network error: ${error.message}`;
      showToastMessage('Network error while refreshing data', 'error');
      console.error('Refresh error:', error);
    } finally {
      isRefreshingData = false;
    }
  }

  // Show toast message
  function showToastMessage(message, type = 'success') {
    toastMessage = message;
    toastType = type;
    showToast = true;
  }
</script>

<div class="min-h-screen bg-gray-50">
  <Navbar currentPage="data" />

  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="bg-white rounded-lg shadow-sm border p-8">
      
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-gray-900 mb-2">Data Management</h1>
        <p class="text-gray-600">
          Refresh item data and images from the external Rust API. This will update your local data with the latest information.
        </p>
      </div>

      <!-- Item Data Status -->
      <div class="mb-8">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Current Status</h2>
        <div class="bg-gray-50 rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-3 h-3 rounded-full {itemDataStatus.hasData ? 'bg-green-500' : 'bg-yellow-500'}"></div>
              <div class="text-sm text-gray-700">
                <div class="font-medium">{itemDataStatus.message}</div>
                {#if itemDataStatus.hasData && itemDataStatus.lastProcessed}
                  <div class="text-xs text-gray-500">
                    Last updated: {new Date(itemDataStatus.lastProcessed).toLocaleString()}
                  </div>
                {/if}
                {#if itemDataStatus.hasData && itemDataStatus.itemCount > 0}
                  <div class="text-xs text-gray-500">
                    Total items: {itemDataStatus.itemCount}
                  </div>
                {/if}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Refresh Actions -->
      <div class="space-y-6">
        <!-- Refresh Item Data -->
        <div class="border border-gray-200 rounded-lg p-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-lg font-semibold text-gray-900">Refresh Data</h3>
              <p class="text-sm text-gray-600 mt-1">
                Download the latest item definitions, categories, and images from the external API.
              </p>
            </div>
            <button
              on:click={refreshItemData}
              disabled={isRefreshingData}
              class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              <span>{isRefreshingData ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>

          {#if refreshStatus}
            <div class="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div class="flex items-center space-x-3">
                <div class="w-3 h-3 rounded-full bg-blue-500"></div>
                <span class="text-sm text-blue-800">{refreshStatus}</span>
              </div>
              {#if isRefreshingData}
                <div class="mt-3">
                  <div class="w-full bg-blue-200 rounded-full h-2">
                    <div class="bg-blue-600 h-2 rounded-full transition-all duration-1000 animate-pulse" style="width: 100%"></div>
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        </div>


      </div>
    </div>
  </div>

  <!-- Toast Component -->
  <Toast 
    bind:show={showToast}
    bind:message={toastMessage}
    bind:type={toastType}
    duration={5000}
    on:close={() => showToast = false}
  />
</div>
