<script>
  import { onMount } from 'svelte';

  // Items data
  const rustItems = [
    { id: 1, name: 'Stone', category: 'Resources', icon: '🪨' },
    { id: 2, name: 'Metal Ore', category: 'Resources', icon: '⛏️' },
    { id: 3, name: 'Sulfur Ore', category: 'Resources', icon: '🟡' },
    { id: 4, name: 'Wood', category: 'Resources', icon: '🪵' },
    { id: 5, name: 'Cloth', category: 'Components', icon: '🧵' },
    { id: 6, name: 'Leather', category: 'Components', icon: '🦴' },
    { id: 7, name: 'Metal Fragments', category: 'Components', icon: '🔩' },
    { id: 8, name: 'High Quality Metal', category: 'Components', icon: '⚙️' },
    { id: 9, name: 'Scrap', category: 'Components', icon: '🔧' },
    { id: 10, name: 'Gears', category: 'Components', icon: '⚙️' },
    { id: 11, name: 'Rope', category: 'Components', icon: '🪢' },
    { id: 12, name: 'Tarp', category: 'Components', icon: '🏕️' },
    { id: 13, name: 'Road Signs', category: 'Components', icon: '🛣️' },
    { id: 14, name: 'Tech Trash', category: 'Components', icon: '💻' },
    { id: 15, name: 'Empty Propane Tank', category: 'Components', icon: '⛽' },
    { id: 16, name: 'Metal Blade', category: 'Components', icon: '🗡️' },
    { id: 17, name: 'Semi Automatic Body', category: 'Weapons', icon: '🔫' },
    { id: 18, name: 'Rifle Body', category: 'Weapons', icon: '🎯' },
    { id: 19, name: 'SMG Body', category: 'Weapons', icon: '🔫' },
    { id: 20, name: 'Pistol Bullet', category: 'Ammo', icon: '🔫' },
    { id: 21, name: '5.56 Rifle Ammo', category: 'Ammo', icon: '🎯' },
    { id: 22, name: '9mm Ammo', category: 'Ammo', icon: '🔫' },
    { id: 23, name: 'Arrow', category: 'Ammo', icon: '🏹' },
    { id: 24, name: 'Crossbow Bolt', category: 'Ammo', icon: '🏹' },
    { id: 25, name: 'Bandage', category: 'Medical', icon: '🩹' },
    { id: 26, name: 'Syringe', category: 'Medical', icon: '💉' },
    { id: 27, name: 'Medical Syringe', category: 'Medical', icon: '💊' },
    { id: 28, name: 'Anti-Radiation Pills', category: 'Medical', icon: '💊' },
    { id: 29, name: 'Corn', category: 'Food', icon: '🌽' },
    { id: 30, name: 'Potato', category: 'Food', icon: '🥔' },
    { id: 31, name: 'Pumpkin', category: 'Food', icon: '🎃' },
    { id: 32, name: 'Apple', category: 'Food', icon: '🍎' },
    { id: 33, name: 'Blueberry', category: 'Food', icon: '🫐' },
    { id: 34, name: 'Mushroom', category: 'Food', icon: '🍄' },
    { id: 35, name: 'Cooked Chicken', category: 'Food', icon: '🍗' },
    { id: 36, name: 'Cooked Fish', category: 'Food', icon: '🐟' },
    { id: 37, name: 'Water Bottle', category: 'Food', icon: '💧' },
    { id: 38, name: 'Canned Beans', category: 'Food', icon: '🥫' },
    { id: 39, name: 'Canned Tuna', category: 'Food', icon: '🥫' },
    { id: 40, name: 'Canned Corn', category: 'Food', icon: '🥫' }
  ];

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
  }

  // Conveyor actions
  function addConveyor() {
    conveyors = [
      ...conveyors,
      { id: Date.now(), name: `Conveyor ${conveyors.length + 1}`, items: [] }
    ];
  }

  function removeFromConveyor(conveyorId, itemId) {
    conveyors = conveyors.map(c =>
      c.id === conveyorId
        ? { ...c, items: c.items.filter(i => i.id !== itemId) }
        : c
    );
  }

  function removeConveyor(conveyorId) {
    conveyors = conveyors.filter(c => c.id !== conveyorId);
  }

  function openAssignModal(conveyor) {
    currentConveyor = conveyor;
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
    }
  }

  // Computed modal items (sorted)
  $: modalItems = selectedItems.sort((a, b) => {
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
  <!-- Header -->
  <header class="bg-white shadow-sm border-b">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Rust Conveyor Planner</h1>
          <p class="text-gray-600">Plan your item sorting system</p>
        </div>
      </div>
    </div>
  </header>

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
              <span class="text-xl mr-3">{item.icon}</span>
              <div class="text-left flex-1">
                <div class="font-medium">{item.name}</div>
                <div class="text-sm text-gray-500">{item.category}</div>
              </div>
            </button>
          {/each}
        </div>
      </div>

      <!-- Conveyors -->
      <div class="bg-white rounded-lg shadow-sm border p-6 lg:col-span-2 flex flex-col max-h-[78vh]">
        <div class="flex items-center justify-between mb-6 flex-shrink-0">
          <h2 class="text-lg font-semibold text-gray-900">Conveyors</h2>
          <button
            on:click={addConveyor}
            class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
          >
            Add Conveyor
          </button>
        </div>

        <div class="flex-1 overflow-y-auto">
          {#if conveyors.length === 0}
            <div class="text-center py-12">
              <div class="text-gray-400 text-6xl mb-4">🚇</div>
              <p class="text-gray-500">No conveyors yet. Add your first conveyor to get started!</p>
            </div>
          {:else}
            <div class="space-y-4">
              {#each conveyors as conveyor}
                <div class="border border-gray-200 rounded-lg p-4">
                  <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center space-x-3">
                      <h3 class="font-semibold text-gray-900">{conveyor.name}</h3>
                      <span class="text-sm text-gray-500">
                        {conveyor.items.length} items
                      </span>
                    </div>
                    <div class="flex space-x-2">
                      {#if selectedItems.length > 0}
                        <button
                          on:click={() => openAssignModal(conveyor)}
                          class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                        >
                          Add
                        </button>
                      {/if}
                      <button
                        on:click={() => openRenameModal(conveyor)}
                        class="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700 transition-colors"
                      >
                        Rename
                      </button>
                      <button
                        on:click={() => removeConveyor(conveyor.id)}
                        class="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <!-- Conveyor Items -->
                  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {#each conveyor.items as item}
                      <div class="flex items-center p-2 bg-gray-50 rounded border">
                        <span class="text-lg mr-2">{item.icon}</span>
                        <div class="flex-1 min-w-0">
                          <div class="text-sm font-medium truncate">{item.name}</div>
                        </div>
                        <button
                          on:click={() => removeFromConveyor(conveyor.id, item.id)}
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
                </div>
              {/each}
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
            on:click={() => showAssignModal = false}
            class="text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>
        </div>

        <div class="flex-1 overflow-y-auto">
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
                <span class="text-xl mr-3">{item.icon}</span>
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
              on:click={() => showAssignModal = false}
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
              class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
            >
              Rename
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
</div>
