<script>
  export let currentPage = '';
  export let hasUnsavedChanges = false;
  export let onSave = () => {};
  
  let showUnsavedWarning = false;
  let pendingNavigation = null;
  
  function handleNavigation(href) {
    if (currentPage === 'planner' && hasUnsavedChanges) {
      showUnsavedWarning = true;
      pendingNavigation = href;
    } else {
      window.location.href = href;
    }
  }
  
  function confirmNavigation() {
    showUnsavedWarning = false;
    if (pendingNavigation) {
      window.location.href = pendingNavigation;
      pendingNavigation = null;
    }
  }
  
  function cancelNavigation() {
    showUnsavedWarning = false;
    pendingNavigation = null;
  }
</script>

<header class="bg-white shadow-sm border-b">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Rust Conveyor Planner</h1>
        <p class="text-gray-600">Plan your item sorting system</p>
      </div>
                   <nav class="flex items-center space-x-4">
        {#if currentPage === 'planner'}
          <button
            on:click={onSave}
            class="px-4 py-2 rounded-md transition-colors flex items-center space-x-2 {!hasUnsavedChanges ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-orange-600 text-white hover:bg-orange-700'}"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
            </svg>
            <span>Layouts</span>
          </button>
          
          <div class="text-gray-400">|</div>
        {/if}
        
        <button
          on:click={() => handleNavigation('/')}
          class="px-4 py-2 rounded-md transition-colors {currentPage === 'planner' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-white hover:bg-gray-700'}"
        >
          Planner
        </button>
        <button
          on:click={() => handleNavigation('/rules')}
          class="px-4 py-2 rounded-md transition-colors {currentPage === 'rules' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-white hover:bg-gray-700'}"
        >
          Rules
        </button>
        <button
          on:click={() => handleNavigation('/data')}
          class="px-4 py-2 rounded-md transition-colors {currentPage === 'data' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-white hover:bg-gray-700'}"
        >
          Game Data
        </button>
      </nav>
    </div>
  </div>
</header>

<!-- Unsaved Changes Warning Modal -->
{#if showUnsavedWarning}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900">Unsaved Changes</h3>
        <button
          on:click={cancelNavigation}
          class="text-gray-400 hover:text-gray-600 text-xl"
        >
          ×
        </button>
      </div>

      <div class="mb-6">
        <p class="text-gray-600">
          You have unsaved changes in your planner. Are you sure you want to leave? Your changes will be lost.
        </p>
      </div>

      <div class="flex space-x-3">
        <button
          on:click={confirmNavigation}
          class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
        >
          Leave Anyway
        </button>
        <button
          on:click={cancelNavigation}
          class="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
        >
          Stay
        </button>
      </div>
    </div>
  </div>
{/if}
