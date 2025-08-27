<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import Navbar from '$lib/components/Navbar.svelte';
  import Toast from '$lib/components/Toast.svelte';

  // Items data - will be loaded from processed game data
  let rustItems = [];
  let isLoading = true;
  let loadError = null;

  // State
  let selectedItems = [];
  let conveyors = [];
  let searchTerm = '';
  let selectedCategory = 'All';
  let showAssignModal = false;
  let currentConveyor = null;
  let showRenameModal = false;
  let renameConveyor = null;
  let newConveyorName = '';
  let showSaveLoadModal = false;
  let saveName = '';
  let saves = [];
  let currentLoadedSave = null;
  let hasUnsavedChanges = false;

  // Toast state
  let toastMessage = '';
  let toastType = 'success';
  let showToast = false;

  // Load item data on mount
  onMount(async () => {
    await loadItemData();
    await loadSaves();
    
    // Check if we have a save in the URL
    const urlSaveName = $page.url.searchParams.get('save');
    if (urlSaveName) {
      await loadSaveFromUrl(urlSaveName);
    }

    // Reload item data when the page becomes visible (in case rules were updated)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadItemData();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  });

  // Save and Load functions
  async function loadSaves() {
    try {
      const savedSaves = localStorage.getItem('rust-conveyor-saves');
      if (savedSaves) {
        saves = JSON.parse(savedSaves);
      }
    } catch (error) {
      console.error('Error loading saves:', error);
      saves = [];
    }
  }

  async function loadSaveFromUrl(saveName) {
    const save = saves.find(s => s.name === saveName);
    if (save) {
      await loadSave(save, false); // false = don't show confirmation
    } else {
      console.warn(`Save "${saveName}" not found in URL`);
    }
  }

  async function saveCurrentState() {
    if (!saveName.trim()) {
      alert('Please enter a save name');
      return;
    }

    const saveData = {
      id: Date.now(),
      name: saveName.trim(),
      timestamp: new Date().toISOString(),
      selectedItems: selectedItems,
      conveyors: conveyors
    };

    // Check if save name already exists
    const existingIndex = saves.findIndex(save => save.name === saveData.name);
    if (existingIndex !== -1) {
      if (!confirm(`A save with the name "${saveData.name}" already exists. Do you want to overwrite it?`)) {
        return;
      }
      saves[existingIndex] = saveData;
    } else {
      saves.push(saveData);
    }

    // Sort saves by timestamp (newest first)
    saves.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Save to localStorage
    try {
      localStorage.setItem('rust-conveyor-saves', JSON.stringify(saves));
      currentLoadedSave = saveData;
      showSaveLoadModal = false;
      saveName = '';
      hasUnsavedChanges = false;
      
      // Update URL to include the save name
      await goto(`/?save=${encodeURIComponent(saveData.name)}`, { replaceState: true });
      
      showToastMessage('Save created successfully!', 'success');
    } catch (error) {
      console.error('Error saving:', error);
      showToastMessage('Failed to save. Please try again.', 'error');
    }
  }

  async function loadSave(saveData, showConfirmation = true) {
    if (showConfirmation && !confirm(`Load save "${saveData.name}"? This will replace your current selection and conveyors.`)) {
      return;
    }

    try {
      selectedItems = saveData.selectedItems;
      conveyors = saveData.conveyors;
      currentLoadedSave = saveData;
      showSaveLoadModal = false;
      hasUnsavedChanges = false;
      
      // Update URL to include the save name
      await goto(`/?save=${encodeURIComponent(saveData.name)}`, { replaceState: true });
      
      if (showConfirmation) {
        showToastMessage('Save loaded successfully!', 'success');
      }
    } catch (error) {
      console.error('Error loading save:', error);
      if (showConfirmation) {
        showToastMessage('Failed to load save. Please try again.', 'error');
      }
    }
  }

  async function deleteSave(saveId) {
    if (!confirm('Are you sure you want to delete this save?')) {
      return;
    }

    const saveToDelete = saves.find(save => save.id === saveId);
    saves = saves.filter(save => save.id !== saveId);
    
    // If we're deleting the currently loaded save, clear the URL
    if (currentLoadedSave && currentLoadedSave.id === saveId) {
      currentLoadedSave = null;
      await goto('/', { replaceState: true });
    }
    
    try {
      localStorage.setItem('rust-conveyor-saves', JSON.stringify(saves));
      showToastMessage('Save deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting save:', error);
      alert('Failed to delete save. Please try again.');
    }
  }

  async function loadItemData() {
    try {
      isLoading = true;
      loadError = null;
      
      const response = await fetch('/api/rules/filtered-items');
      if (!response.ok) {
        throw new Error('Failed to load item data');
      }
      
      const rawItems = await response.json();
      
      // Load rules from localStorage
      const savedExclusions = localStorage.getItem('rust-item-exclusions');
      const savedVariationGroups = localStorage.getItem('rust-variation-groups');
      
      const exclusions = savedExclusions ? JSON.parse(savedExclusions) : [];
      const variationGroups = savedVariationGroups ? JSON.parse(savedVariationGroups) : [];
      
      // Transform the raw item data into the format we need
      const itemsWithFilenames = rawItems
        .filter(item => item.filename && item.filename.trim() !== '') // Only items with valid filenames
        .map((item, index) => ({
          id: item.itemid || index + 1,
          name: item.Name || item.shortname || 'Unknown Item',
          category: item.Category || 'Misc',
          icon: getItemIcon(item.Name || item.shortname, item.Category),
          shortname: item.shortname,
          description: item.Description,
          filename: item.filename,
          isVariationGroup: false,
          variationCount: 0,
          originalName: null
        }));

      // Apply exclusions - filter out excluded items
      const itemsAfterExclusions = itemsWithFilenames.filter(item => 
        !exclusions.some(exclusion => exclusion.itemName === item.name)
      );

      // Apply variation groups
      const processedItems = [];
      const processedItemNames = new Set();

      // First, add all items that are not part of any variation group
      itemsAfterExclusions.forEach(item => {
        const isInVariationGroup = variationGroups.some(group => 
          group.variations.some(variation => variation.itemName === item.name)
        );
        
        if (!isInVariationGroup) {
          processedItems.push(item);
          processedItemNames.add(item.name);
        }
      });

      // Then, add original items from variation groups
      variationGroups.forEach(group => {
        const originalItem = itemsAfterExclusions.find(item => 
          item.name === group.originalItem.itemName
        );
        
        if (originalItem && !processedItemNames.has(originalItem.name)) {
          // Count how many variations this group has (excluding the original)
          const variationCount = group.variations.filter(v => !v.isOriginal).length;
          
          processedItems.push({
            ...originalItem,
            isVariationGroup: true,
            variationCount: variationCount,
            originalName: originalItem.name
          });
          processedItemNames.add(originalItem.name);
        }
      });

      // Sort the processed items
      rustItems = processedItems.sort((a, b) => {
        // First sort by category
        const categoryA = a.category.toLowerCase();
        const categoryB = b.category.toLowerCase();
        if (categoryA !== categoryB) {
          return categoryA.localeCompare(categoryB);
        }
        // Then sort by name alphabetically
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      });
      
      isLoading = false;
    } catch (error) {
      console.error('Error loading item data:', error);
      loadError = error.message;
      isLoading = false;
    }
  }

  // Helper function to get appropriate icons for items
  function getItemIcon(name, category) {
    const lowerName = name.toLowerCase();
    const lowerCategory = category.toLowerCase();
    
    // Weapon icons
    if (lowerCategory.includes('weapon') || lowerName.includes('rifle') || lowerName.includes('pistol') || lowerName.includes('smg')) {
      return '🔫';
    }
    if (lowerName.includes('bow') || lowerName.includes('arrow')) {
      return '🏹';
    }
    if (lowerName.includes('sword') || lowerName.includes('knife') || lowerName.includes('blade')) {
      return '🗡️';
    }
    
    // Ammo icons
    if (lowerCategory.includes('ammo') || lowerName.includes('bullet') || lowerName.includes('ammo')) {
      return '🎯';
    }
    
    // Medical icons
    if (lowerCategory.includes('medical') || lowerName.includes('bandage') || lowerName.includes('syringe') || lowerName.includes('pill')) {
      return '💊';
    }
    
    // Food icons
    if (lowerCategory.includes('food') || lowerName.includes('corn') || lowerName.includes('potato') || lowerName.includes('berry')) {
      return '🍎';
    }
    if (lowerName.includes('water') || lowerName.includes('bottle')) {
      return '💧';
    }
    if (lowerName.includes('can') || lowerName.includes('canned')) {
      return '🥫';
    }
    
    // Resource icons
    if (lowerName.includes('stone') || lowerName.includes('rock')) {
      return '🪨';
    }
    if (lowerName.includes('metal') || lowerName.includes('ore')) {
      return '⛏️';
    }
    if (lowerName.includes('wood')) {
      return '🪵';
    }
    if (lowerName.includes('cloth') || lowerName.includes('fabric')) {
      return '🧵';
    }
    if (lowerName.includes('leather')) {
      return '🦴';
    }
    if (lowerName.includes('scrap')) {
      return '🔧';
    }
    if (lowerName.includes('gear')) {
      return '⚙️';
    }
    if (lowerName.includes('rope')) {
      return '🪢';
    }
    if (lowerName.includes('tarp')) {
      return '🏕️';
    }
    if (lowerName.includes('road') || lowerName.includes('sign')) {
      return '🛣️';
    }
    if (lowerName.includes('tech') || lowerName.includes('trash')) {
      return '💻';
    }
    if (lowerName.includes('propane') || lowerName.includes('tank')) {
      return '⛽';
    }
    
    // Default icons based on category
    switch (lowerCategory) {
      case 'weapon': return '🔫';
      case 'ammo': return '🎯';
      case 'medical': return '💊';
      case 'food': return '🍎';
      case 'resource': return '🪨';
      case 'component': return '🔩';
      default: return '📦';
    }
  }

  // Categories
  $: categories = ['All', ...new Set(rustItems.map(item => item.category))];

  // Filtered items for main list
  $: filteredItems = rustItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Toggle selection in main list
  function toggleItem(item) {
    const exists = selectedItems.some(i => i.id === item.id);
    selectedItems = exists
      ? selectedItems.filter(i => i.id !== item.id)
      : [...selectedItems, item];
    hasUnsavedChanges = true;
  }

  // Conveyor actions
  function addConveyor() {
    conveyors = [
      ...conveyors,
      { id: Date.now(), name: `Conveyor ${conveyors.length + 1}`, items: [], isCollapsed: false }
    ];
    hasUnsavedChanges = true;
  }

  function removeFromConveyor(conveyorId, itemId) {
    conveyors = conveyors.map(c =>
      c.id === conveyorId
        ? { ...c, items: c.items.filter(i => i.id !== itemId) }
        : c
    );
    hasUnsavedChanges = true;
  }

  function removeConveyor(conveyorId) {
    conveyors = conveyors.filter(c => c.id !== conveyorId);
    hasUnsavedChanges = true;
  }

  // Copy conveyor items to JSON format
  function copyConveyorToJson(conveyor) {
    const jsonData = conveyor.items.map(item => ({
      "TargetCategory": null,
      "MaxAmountInOutput": 0,
      "BufferAmount": 0,
      "MinAmountInInput": 0,
      "IsBlueprint": false,
      "BufferTransferRemaining": 0,
      "TargetItemName": item.shortname
    }));

    const jsonString = JSON.stringify(jsonData, null, 2);
    
    navigator.clipboard.writeText(jsonString).then(() => {
      showToastMessage(`Copied ${conveyor.items.length} items from "${conveyor.name}" to clipboard!`, 'success');
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = jsonString;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showToastMessage(`Copied ${conveyor.items.length} items from "${conveyor.name}" to clipboard!`, 'success');
    });
  }

  // Show toast message
  function showToastMessage(message, type = 'success') {
    toastMessage = message;
    toastType = type;
    showToast = true;
  }

  function toggleConveyorCollapse(conveyorId) {
    conveyors = conveyors.map(c =>
      c.id === conveyorId ? { ...c, isCollapsed: !c.isCollapsed } : c
    );
    hasUnsavedChanges = true;
  }

  // Drag and drop functionality
  let draggedConveyor = null;
  let draggedItem = null;
  let draggedItemSource = null;
  let dropZoneIndex = null;

  function handleDragStart(e, conveyor) {
    draggedConveyor = conveyor;
    draggedItem = null;
    draggedItemSource = null;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ''); // Required for some browsers
    e.target.style.opacity = '0.5';
  }

  function handleDragEnd(e) {
    e.target.style.opacity = '1';
    draggedConveyor = null;
    draggedItem = null;
    draggedItemSource = null;
    dropZoneIndex = null;
  }

  function handleDragOver(e, conveyor) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedItem && draggedItemSource && draggedItemSource.id !== conveyor.id) {
      // Dragging an item to a different conveyor - always allow drop
      dropZoneIndex = null; // No drop zone indicator for item drops
    } else if (draggedConveyor && draggedConveyor.id !== conveyor.id) {
      // Dragging a conveyor
      const conveyorRect = e.currentTarget.getBoundingClientRect();
      const mouseY = e.clientY;
      const conveyorCenterY = conveyorRect.top + conveyorRect.height / 2;
      
      const conveyorIndex = conveyors.findIndex(c => c.id === conveyor.id);
      
      // Determine if we're dropping above or below the conveyor
      let newDropZoneIndex;
      const threshold = 10; // Increased threshold for more stability
      
      if (mouseY < conveyorCenterY - threshold) {
        // Dropping above - insert at this index
        newDropZoneIndex = conveyorIndex;
      } else if (mouseY > conveyorCenterY + threshold) {
        // Dropping below - insert at next index
        newDropZoneIndex = conveyorIndex + 1;
      } else {
        // Within threshold - keep current drop zone or default to below
        newDropZoneIndex = dropZoneIndex !== null ? dropZoneIndex : conveyorIndex + 1;
      }
      
      // Only update if the drop zone has actually changed
      if (dropZoneIndex !== newDropZoneIndex) {
        dropZoneIndex = newDropZoneIndex;
      }
    }
  }

  function handleDrop(e, targetConveyor) {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedItem && draggedItemSource && draggedItemSource.id !== targetConveyor.id) {
      // Moving an item from one conveyor to another
      const sourceConveyor = conveyors.find(c => c.id === draggedItemSource.id);
      const targetConveyorIndex = conveyors.findIndex(c => c.id === targetConveyor.id);
      
      if (sourceConveyor && targetConveyorIndex !== -1) {
        // Remove item from source conveyor
        const updatedSourceConveyor = {
          ...sourceConveyor,
          items: sourceConveyor.items.filter(item => item.id !== draggedItem.id)
        };
        
        // Add item to target conveyor
        const updatedTargetConveyor = {
          ...targetConveyor,
          items: [...targetConveyor.items, draggedItem]
        };
        
        // Update conveyors array
        conveyors = conveyors.map(c => {
          if (c.id === sourceConveyor.id) return updatedSourceConveyor;
          if (c.id === targetConveyor.id) return updatedTargetConveyor;
          return c;
        });
        
        hasUnsavedChanges = true;
      }
    } else if (draggedConveyor && draggedConveyor.id !== targetConveyor.id && dropZoneIndex !== null) {
      // Moving a conveyor
      const draggedIndex = conveyors.findIndex(c => c.id === draggedConveyor.id);
      
      // Create a new array and perform the move
      const newConveyors = [...conveyors];
      const [draggedItem] = newConveyors.splice(draggedIndex, 1);
      
      // Adjust the target index if we're moving an item from a higher position to a lower position
      let targetIndex = dropZoneIndex;
      if (draggedIndex < targetIndex) {
        targetIndex--;
      }
      
      newConveyors.splice(targetIndex, 0, draggedItem);
      conveyors = newConveyors;
      hasUnsavedChanges = true;
    }
    
    draggedConveyor = null;
    draggedItem = null;
    draggedItemSource = null;
    dropZoneIndex = null;
  }

  function openAssignModal(conveyor) {
    currentConveyor = conveyor;
    assignModalSearch = '';
    showAssignModal = true;
  }

  function openRenameModal(conveyor) {
    renameConveyor = conveyor;
    newConveyorName = conveyor.name;
    showRenameModal = true;
  }

  function renameConveyorHandler() {
    if (renameConveyor && newConveyorName.trim()) {
      conveyors = conveyors.map(c =>
        c.id === renameConveyor.id ? { ...c, name: newConveyorName.trim() } : c
      );
      showRenameModal = false;
      renameConveyor = null;
      newConveyorName = '';
      hasUnsavedChanges = true;
    }
  }

  // Assign items to conveyor (fully reactive)
  function assignToConveyor(item) {
    if (!currentConveyor) return;
    if (!currentConveyor.items.some(i => i.id === item.id)) {
      currentConveyor.items = [...currentConveyor.items, item];
      conveyors = conveyors.map(c =>
        c.id === currentConveyor.id ? { ...currentConveyor } : c
      );
      hasUnsavedChanges = true;
    }
  }

  // Search state for assign modal
  let assignModalSearch = '';
  
  // Computed modal items (sorted and filtered)
  $: modalItems = selectedItems
    .filter(item => 
      item.name.toLowerCase().includes(assignModalSearch.toLowerCase()) ||
      item.category.toLowerCase().includes(assignModalSearch.toLowerCase())
    )
    .sort((a, b) => {
      const aAssigned = conveyors.some(c => c.items.some(i => i.id === a.id) && c.id !== currentConveyor?.id);
      const bAssigned = conveyors.some(c => c.items.some(i => i.id === b.id) && c.id !== currentConveyor?.id);
      if (aAssigned && !bAssigned) return 1;
      if (!aAssigned && bAssigned) return -1;
      return 0;
    });

  function isItemAssignedToCurrentConveyor(itemId) {
    return currentConveyor?.items.some(i => i.id === itemId);
  }

  function isItemAssignedToOtherConveyors(itemId) {
    return conveyors.some(c => c.id !== currentConveyor?.id && c.items.some(i => i.id === itemId));
  }
</script>

<div class="min-h-screen bg-gray-50">
  <Navbar 
    currentPage="planner" 
    {hasUnsavedChanges}
    onSave={() => {
      // Prefill save name if we have a loaded save
      if (currentLoadedSave) {
        saveName = currentLoadedSave.name;
      }
      showSaveLoadModal = true;
    }}
  />

  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Available Items -->
      <div class="bg-white rounded-lg shadow-sm border p-6 lg:col-span-1">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Available Items</h2>
        
        <!-- Search and Filter -->
        <div class="space-y-3 mb-4">
          <input
            type="text"
            placeholder="Search items..."
            bind:value={searchTerm}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            bind:value={selectedCategory}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {#each categories as category}
              <option value={category}>{category}</option>
            {/each}
          </select>
        </div>

        <!-- Selected Count -->
        <div class="mb-4 p-3 bg-blue-50 rounded-md">
          <p class="text-sm text-blue-800">
            Selected: <span class="font-semibold">{selectedItems.length}</span> items
          </p>
        </div>

        <!-- Items List -->
        <div class="space-y-2 max-h-[50vh] overflow-y-auto">
          {#if isLoading}
            <div class="text-center py-8">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p class="text-gray-500">Loading items...</p>
            </div>
          {:else if loadError}
            <div class="text-center py-8">
              <div class="text-red-500 text-4xl mb-4">⚠️</div>
              <p class="text-red-600 mb-2">Failed to load items</p>
              <p class="text-sm text-gray-500 mb-4">{loadError}</p>
              <button
                on:click={loadItemData}
                class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
              >
                Retry
              </button>
            </div>
          {:else if filteredItems.length === 0}
            <div class="text-center py-8">
              <div class="text-gray-400 text-4xl mb-4">🔍</div>
              <p class="text-gray-500">No items found matching your search</p>
            </div>
          {:else}
            {#each filteredItems as item}
              {@const isSelected = selectedItems.some(i => i.id === item.id)}
              <button
                on:click={() => toggleItem(item)}
                class="w-full flex items-center p-3 rounded-md border transition-colors"
                class:bg-green-50={isSelected}
                class:border-green-200={isSelected}
                class:text-green-900={isSelected}
                class:bg-white={!isSelected}
                class:border-gray-200={!isSelected}
                class:hover:bg-gray-50={!isSelected}
              >
                <img 
                  src="/items/{item.filename}.png" 
                  alt={item.name}
                  class="w-8 h-8 mr-3 object-contain"
                />
                <div class="text-left flex-1">
                  <div class="font-medium">{item.name}</div>
                  <div class="text-sm text-gray-500">
                    {item.category}
                    {#if item.isVariationGroup && item.variationCount > 0}
                      <span class="ml-2 text-blue-600">(+{item.variationCount} variations)</span>
                    {/if}
                  </div>
                </div>
              </button>
            {/each}
          {/if}
        </div>
      </div>

      <!-- Conveyors -->
      <div class="bg-white rounded-lg shadow-sm border p-6 lg:col-span-2 flex flex-col max-h-[78vh]">
        <div class="flex items-center justify-between mb-6 flex-shrink-0">
          <h2 class="text-lg font-semibold text-gray-900">Conveyors</h2>
          <button
            on:click={addConveyor}
            class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            <span>Add Conveyor</span>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto">
          {#if conveyors.length === 0}
            <div class="text-center py-12">
              <div class="text-gray-400 text-6xl mb-4">🚇</div>
              <p class="text-gray-500">No conveyors yet. Add your first conveyor to get started!</p>
            </div>
          {:else}
            <div 
              class="space-y-4"
              role="list"
              aria-label="Conveyor list"
              on:dragenter={(e) => e.preventDefault()}
              on:dragover={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (draggedConveyor) {
                  dropZoneIndex = conveyors.length;
                }
              }}
              on:drop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (draggedConveyor && dropZoneIndex === conveyors.length) {
                  const draggedIndex = conveyors.findIndex(c => c.id === draggedConveyor.id);
                  const newConveyors = [...conveyors];
                  const [draggedItem] = newConveyors.splice(draggedIndex, 1);
                  newConveyors.push(draggedItem);
                  conveyors = newConveyors;
                  hasUnsavedChanges = true;
                }
                draggedConveyor = null;
                dropZoneIndex = null;
              }}
            >
              {#each conveyors as conveyor, index}
                <div class="relative" role="listitem">
                  <!-- Drop zone indicator above conveyor -->
                  {#if dropZoneIndex === index}
                    <div class="absolute -top-1 left-0 right-0 h-2 bg-blue-400 rounded-full transition-all duration-200 pointer-events-none z-10"></div>
                  {/if}
                  
                  <div 
                    class="border border-gray-200 rounded-lg p-4 transition-all duration-200"
                    role="button"
                    tabindex="0"
                    aria-label="Conveyor {conveyor.name} with {conveyor.items.length} items"
                    on:dragenter={(e) => e.preventDefault()}
                    on:dragover={(e) => handleDragOver(e, conveyor)}
                    on:drop={(e) => handleDrop(e, conveyor)}
                  >
                  <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center space-x-3">
                      <div 
                        class="text-gray-400 cursor-move" 
                        role="button"
                        tabindex="0"
                        aria-label="Drag handle for {conveyor.name}"
                        title="Drag to reorder"
                        draggable="true"
                        on:dragstart={(e) => handleDragStart(e, conveyor)}
                        on:dragend={handleDragEnd}
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"></path>
                        </svg>
                      </div>
                      <button
                        on:click={() => toggleConveyorCollapse(conveyor.id)}
                        class="text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        {#if conveyor.isCollapsed}
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                          </svg>
                        {:else}
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                          </svg>
                        {/if}
                      </button>
                      <h3 class="font-semibold text-gray-900">{conveyor.name}</h3>
                      <span class="text-sm text-gray-500">
                        {conveyor.items.length} items
                      </span>
                    </div>
                    <div class="flex space-x-2">
                      {#if selectedItems.length > 0}
                        <button
                          on:click={() => openAssignModal(conveyor)}
                          class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors flex items-center justify-center"
                          title="Add Items"
                          aria-label="Add items to {conveyor.name}"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                          </svg>
                        </button>
                      {/if}
                      <button
                        on:click={() => openRenameModal(conveyor)}
                        class="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700 transition-colors flex items-center justify-center"
                        title="Rename"
                        aria-label="Rename {conveyor.name}"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                      </button>
                      <button
                        on:click={() => copyConveyorToJson(conveyor)}
                        class="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700 transition-colors flex items-center justify-center"
                        title="Copy JSON"
                        aria-label="Copy {conveyor.name} items as JSON"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                        </svg>
                      </button>
                      <button
                        on:click={() => removeConveyor(conveyor.id)}
                        class="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors flex items-center justify-center"
                        title="Remove"
                        aria-label="Remove {conveyor.name}"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                      </button>
                    </div>
                  </div>

                  {#if !conveyor.isCollapsed}
                    <!-- Conveyor Items -->
                    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {#each conveyor.items as item}
                        <div 
                          class="flex items-center p-2 bg-gray-50 rounded border cursor-move hover:bg-gray-100 transition-colors"
                          role="button"
                          tabindex="0"
                          aria-label="Item {item.name} in {conveyor.name}"
                          draggable="true"
                          on:dragstart={(e) => {
                            draggedItem = item;
                            draggedItemSource = conveyor;
                            draggedConveyor = null;
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', '');
                            e.target.style.opacity = '0.5';
                          }}
                          on:dragend={(e) => {
                            e.target.style.opacity = '1';
                            draggedItem = null;
                            draggedItemSource = null;
                            draggedConveyor = null;
                          }}
                          title="Drag to move to another conveyor"
                        >
                          <img 
                            src="/items/{item.filename}.png" 
                            alt={item.name}
                            class="w-6 h-6 mr-2 object-contain"
                          />
                          <div class="flex-1 min-w-0">
                            <div class="text-sm font-medium truncate">{item.name}</div>
                          </div>
                          <button
                            on:click={(e) => {
                              e.stopPropagation();
                              removeFromConveyor(conveyor.id, item.id);
                            }}
                            class="text-red-500 hover:text-red-700 text-sm"
                          >
                            ×
                          </button>
                        </div>
                      {/each}
                    </div>

                    {#if conveyor.items.length === 0}
                      <p class="text-gray-500 text-center py-4">No items assigned to this conveyor</p>
                    {/if}
                  {/if}
                </div>
              </div>
                {/each}
                
                <!-- Drop zone indicator at the end -->
                {#if dropZoneIndex === conveyors.length}
                  <div class="relative">
                    <div class="absolute -top-1 left-0 right-0 h-2 bg-blue-400 rounded-full transition-all duration-200 pointer-events-none z-10"></div>
                  </div>
                {/if}
              </div>
            {/if}
        </div>
      </div>
    </div>
  </div>

  <!-- Assign Items Modal -->
  {#if showAssignModal && currentConveyor}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">
            Assign Items to {currentConveyor.name}
          </h3>
          <button
            on:click={() => {
              showAssignModal = false;
              assignModalSearch = '';
            }}
            class="text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>
        </div>

        <div class="flex-1 overflow-y-auto">
          <!-- Search Input -->
          <div class="mb-4">
            <input
              type="text"
              bind:value={assignModalSearch}
              placeholder="Search items by name or category..."
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {#each modalItems as item}
              {@const isAssignedToCurrent = isItemAssignedToCurrentConveyor(item.id)}
              {@const isAssignedToOther = isItemAssignedToOtherConveyors(item.id)}
              <button
                on:click={() => assignToConveyor(item)}
                class="flex items-center p-3 rounded-md border transition-colors"
                class:bg-green-50={isAssignedToCurrent}
                class:border-green-200={isAssignedToCurrent}
                class:text-green-900={isAssignedToCurrent}
                class:bg-gray-100={isAssignedToOther}
                class:border-gray-300={isAssignedToOther}
                class:text-gray-500={isAssignedToOther}
                class:bg-white={!isAssignedToCurrent && !isAssignedToOther}
                class:border-gray-200={!isAssignedToCurrent && !isAssignedToOther}
                class:hover:bg-gray-50={!isAssignedToCurrent && !isAssignedToOther}
                disabled={isAssignedToOther}
              >
                <img 
                  src="/items/{item.filename}.png" 
                  alt={item.name}
                  class="w-8 h-8 mr-3 object-contain"
                />
                <div class="text-left">
                  <div class="font-medium">{item.name}</div>
                  <div class="text-sm text-gray-500">{item.category}</div>
                </div>
                {#if isAssignedToCurrent}
                  <span class="text-green-600 text-sm ml-2">✓</span>
                {/if}
              </button>
            {/each}
          </div>
          
          {#if modalItems.length === 0}
            <p class="text-gray-500 text-center py-8">No items selected. Select items from the Available Items list first.</p>
          {/if}
        </div>

        <div class="mt-4 pt-4 border-t border-gray-200">
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-500">
              {currentConveyor.items.length} items assigned to this conveyor
            </span>
            <button
              on:click={() => {
                showAssignModal = false;
                assignModalSearch = '';
              }}
              class="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Rename Conveyor Modal -->
  {#if showRenameModal && renameConveyor}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">
            Rename {renameConveyor.name}
          </h3>
          <button
            on:click={() => showRenameModal = false}
            class="text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>
        </div>

        <div class="flex-1 overflow-y-auto">
          <div class="space-y-3">
            <input
              type="text"
              bind:value={newConveyorName}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="New conveyor name"
            />
          </div>
        </div>

        <div class="mt-4 pt-4 border-t border-gray-200">
          <div class="flex space-x-3">
            <button
              on:click={renameConveyorHandler}
              class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors flex items-center space-x-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
              <span>Rename</span>
            </button>
            <button
              on:click={() => showRenameModal = false}
              class="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Save/Load Modal -->
  {#if showSaveLoadModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-6xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-gray-900">Save & Load</h3>
          <button
            on:click={() => {
              showSaveLoadModal = false;
              saveName = '';
            }}
            class="text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>
        </div>

        <div class="flex-1 overflow-y-auto">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Save Column -->
            <div class="space-y-4">
              <h4 class="text-md font-semibold text-gray-900 border-b border-gray-200 pb-2">Save Current State</h4>
              
              <div>
                <label for="saveName" class="block text-sm font-medium text-gray-700 mb-2">
                  Save Name
                </label>
                <input
                  id="saveName"
                  type="text"
                  bind:value={saveName}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter save name"
                />
              </div>

              <div class="bg-gray-50 p-3 rounded-md">
                <p class="text-sm text-gray-600">
                  This will save:
                </p>
                <ul class="text-sm text-gray-600 mt-1 space-y-1">
                  <li>• {selectedItems.length} selected items</li>
                  <li>• {conveyors.length} conveyors</li>
                  <li>• All conveyor assignments</li>
                </ul>
              </div>

              <button
                on:click={saveCurrentState}
                class="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
                </svg>
                <span>Save</span>
              </button>
            </div>

            <!-- Load Column -->
            <div class="space-y-4">
              <h4 class="text-md font-semibold text-gray-900 border-b border-gray-200 pb-2">Load Saved State</h4>
              
              {#if saves.length === 0}
                <div class="text-center py-8">
                  <div class="text-gray-400 text-4xl mb-4">💾</div>
                  <p class="text-gray-500">No saves found. Create a save first!</p>
                </div>
              {:else}
                <div class="space-y-3 max-h-96 overflow-y-auto">
                  {#each saves as save}
                    <div class="border border-gray-200 rounded-lg p-4">
                      <div class="flex items-center justify-between">
                        <div class="flex-1">
                          <h4 class="font-medium text-gray-900">{save.name}</h4>
                          <p class="text-sm text-gray-500">
                            {new Date(save.timestamp).toLocaleString()}
                          </p>
                          <div class="text-xs text-gray-400 mt-1">
                            {save.selectedItems.length} items, {save.conveyors.length} conveyors
                          </div>
                        </div>
                        <div class="flex space-x-2">
                          <button
                            on:click={() => loadSave(save)}
                            class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors flex items-center space-x-1"
                          >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                            </svg>
                            <span>Load</span>
                          </button>
                          <button
                            on:click={() => {
                              saveName = save.name;
                              saveCurrentState();
                            }}
                            class="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700 transition-colors flex items-center space-x-1"
                          >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                            </svg>
                            <span>Override</span>
                          </button>
                          <button
                            on:click={() => deleteSave(save.id)}
                            class="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors flex items-center space-x-1"
                          >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        </div>

        <div class="mt-6 flex justify-end">
          <button
            on:click={() => {
              showSaveLoadModal = false;
              saveName = '';
            }}
            class="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Toast Component -->
  <Toast 
    bind:show={showToast}
    bind:message={toastMessage}
    bind:type={toastType}
    duration={3000}
    on:close={() => showToast = false}
  />

</div>
