<script>
  import { createEventDispatcher } from 'svelte';
  
  export let message = '';
  export let type = 'success'; // success, error, info
  export let duration = 3000;
  export let show = false;
  
  const dispatch = createEventDispatcher();
  
  let timeoutId;
  
  $: if (show && duration > 0) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      show = false;
      dispatch('close');
    }, duration);
  }
  
  function closeToast() {
    show = false;
    dispatch('close');
  }
  

  
  function getColors() {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      case 'info':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  }
</script>

{#if show}
  <div class="fixed top-4 right-4 z-50 animate-slide-in">
    <div class="flex items-center p-4 rounded-lg shadow-lg {getColors()} max-w-sm">
      <div class="flex-shrink-0 mr-3">
        {#if type === 'success'}
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        {:else if type === 'error'}
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        {:else if type === 'info'}
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        {/if}
      </div>
      <div class="flex-1">
        <p class="text-sm font-medium">{message}</p>
      </div>
      <button
        on:click={closeToast}
        class="flex-shrink-0 ml-3 text-white hover:text-gray-200 transition-colors"
        aria-label="Close notification"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  </div>
{/if}

<style>
  @keyframes slide-in {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  .animate-slide-in {
    animation: slide-in 0.3s ease-out;
  }
</style>
