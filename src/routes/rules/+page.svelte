<script>
  import { onMount } from 'svelte';
  import Navbar from '$lib/components/Navbar.svelte';

  // State for exclusions
  let exclusions = [];
  let newExclusionName = '';
  let showAddExclusionModal = false;
  let selectedExclusionItems = [];
  let exclusionItemsSearch = '';

     // State for variations
   let variationGroups = [];
   let variations = [];
   let showAddVariationModal = false;
   let showEditVariationModal = false;
   let editingGroup = null;
      let newVariationGroupName = '';
    let selectedOriginalItem = '';
   let selectedVariationItems = [];
   let originalItemSearch = '';
   let variationItemsSearch = '';

  // Available items for selection
  let availableItems = [];
  let isLoading = true;
  let loadError = null;

  // Export/Import functions
  function exportExclusions() {
    const data = {
      exclusions: exclusions,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rust-exclusions-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importExclusions(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = JSON.parse(e.target.result);
        if (data.exclusions && Array.isArray(data.exclusions)) {
          exclusions = data.exclusions;
          localStorage.setItem('rust-item-exclusions', JSON.stringify(exclusions));
          alert(`Successfully imported ${data.exclusions.length} exclusions`);
        } else {
          alert('Invalid file format. Please select a valid exclusions export file.');
        }
      } catch (error) {
        alert('Error reading file. Please make sure it\'s a valid JSON file.');
      }
    };
    reader.readAsText(file);
  }

  function exportVariations() {
    const data = {
      variationGroups: variationGroups,
      variations: variations,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rust-variations-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importVariations(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = JSON.parse(e.target.result);
        if (data.variationGroups && Array.isArray(data.variationGroups) && 
            data.variations && Array.isArray(data.variations)) {
          variationGroups = data.variationGroups;
          variations = data.variations;
          localStorage.setItem('rust-variation-groups', JSON.stringify(variationGroups));
          localStorage.setItem('rust-variations', JSON.stringify(variations));
          alert(`Successfully imported ${data.variationGroups.length} variation groups and ${data.variations.length} variations`);
        } else {
          alert('Invalid file format. Please select a valid variations export file.');
        }
      } catch (error) {
        alert('Error reading file. Please make sure it\'s a valid JSON file.');
      }
    };
    reader.readAsText(file);
  }

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    try {
      isLoading = true;
      
      // Load available items
      const itemsResponse = await fetch('/items/item-data.json');
      if (itemsResponse.ok) {
        const rawItems = await itemsResponse.json();
        availableItems = rawItems
          .filter(item => item.filename && item.filename.trim() !== '')
          .map(item => ({
            id: item.itemid || item.shortname,
            name: item.Name || item.shortname || 'Unknown Item',
            shortname: item.shortname,
            category: item.Category || 'Misc',
            filename: item.filename
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
      }

      // Load exclusions from localStorage
      const savedExclusions = localStorage.getItem('rust-item-exclusions');
      if (savedExclusions) {
        exclusions = JSON.parse(savedExclusions);
      }

      // Load variation groups from localStorage
      const savedGroups = localStorage.getItem('rust-variation-groups');
      if (savedGroups) {
        variationGroups = JSON.parse(savedGroups);
      }

      // Load variations from localStorage
      const savedVariations = localStorage.getItem('rust-variations');
      if (savedVariations) {
        variations = JSON.parse(savedVariations);
      }

      isLoading = false;
    } catch (error) {
      console.error('Error loading data:', error);
      loadError = error.message;
      isLoading = false;
    }
  }

  // Exclusion functions
  async function addExclusion() {
    if (selectedExclusionItems.length === 0) {
      alert('Please select at least one item to exclude');
      return;
    }

    try {
      const newExclusions = selectedExclusionItems.map(itemName => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        itemName: itemName.trim(),
        reason: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      exclusions = [...exclusions, ...newExclusions];
      localStorage.setItem('rust-item-exclusions', JSON.stringify(exclusions));
      
      showAddExclusionModal = false;
      selectedExclusionItems = [];
      exclusionItemsSearch = '';
      alert(`Successfully excluded ${newExclusions.length} item(s)!`);
    } catch (error) {
      console.error('Error adding exclusion:', error);
      alert('Failed to add exclusion. Please try again.');
    }
  }

  async function deleteExclusion(id) {
    if (!confirm('Are you sure you want to delete this exclusion?')) {
      return;
    }

    try {
      exclusions = exclusions.filter(e => e.id !== id);
      localStorage.setItem('rust-item-exclusions', JSON.stringify(exclusions));
      alert('Exclusion deleted successfully!');
    } catch (error) {
      console.error('Error deleting exclusion:', error);
      alert('Failed to delete exclusion. Please try again.');
    }
  }

  // Variation functions
  async function addVariationGroup() {
    if (!newVariationGroupName.trim()) {
      alert('Please enter a group name');
      return;
    }

    if (!selectedOriginalItem) {
      alert('Please select an original item');
      return;
    }

    if (selectedVariationItems.length === 0) {
      alert('Please select at least one variation item');
      return;
    }

    try {
      const groupId = Date.now().toString();
             const newGroup = {
         id: groupId,
         name: newVariationGroupName.trim(),
         description: null,
        originalItemId: Date.now().toString(),
        originalItem: {
          id: Date.now().toString(),
          itemName: selectedOriginalItem,
          isOriginal: true
        },
        variations: [
          {
            id: Date.now().toString(),
            itemName: selectedOriginalItem,
            isOriginal: true,
            groupId: groupId
          },
          ...selectedVariationItems.map(itemName => ({
            id: (Date.now() + Math.random()).toString(),
            itemName,
            isOriginal: false,
            groupId: groupId
          }))
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      variationGroups = [...variationGroups, newGroup];
      localStorage.setItem('rust-variation-groups', JSON.stringify(variationGroups));
      
      // Also save variations separately
      variations = [...variations, ...newGroup.variations];
      localStorage.setItem('rust-variations', JSON.stringify(variations));
      
             showAddVariationModal = false;
       newVariationGroupName = '';
       selectedOriginalItem = '';
      selectedVariationItems = [];
      alert('Variation group added successfully!');
    } catch (error) {
      console.error('Error adding variation group:', error);
      alert('Failed to add variation group. Please try again.');
    }
  }

     async function deleteVariationGroup(id) {
     if (!confirm('Are you sure you want to delete this variation group?')) {
       return;
     }

     try {
       const groupToDelete = variationGroups.find(g => g.id === id);
       if (groupToDelete) {
         // Remove variations for this group
         variations = variations.filter(v => v.groupId !== id);
         localStorage.setItem('rust-variations', JSON.stringify(variations));
       }
       
       variationGroups = variationGroups.filter(g => g.id !== id);
       localStorage.setItem('rust-variation-groups', JSON.stringify(variationGroups));
       alert('Variation group deleted successfully!');
     } catch (error) {
       console.error('Error deleting variation group:', error);
       alert('Failed to delete variation group. Please try again.');
     }
   }

   function editVariationGroup(group) {
     editingGroup = group;
     newVariationGroupName = group.name;
     selectedOriginalItem = group.originalItem.itemName;
     selectedVariationItems = group.variations
       .filter(v => !v.isOriginal)
       .map(v => v.itemName);
     showEditVariationModal = true;
   }

   async function updateVariationGroup() {
     if (!newVariationGroupName.trim()) {
       alert('Please enter a group name');
       return;
     }

     if (!selectedOriginalItem) {
       alert('Please select an original item');
       return;
     }

     if (selectedVariationItems.length === 0) {
       alert('Please select at least one variation item');
       return;
     }

     try {
       // Remove old variations for this group
       variations = variations.filter(v => v.groupId !== editingGroup.id);
       
       // Create new variations
       const newVariations = [
         {
           id: Date.now().toString(),
           itemName: selectedOriginalItem,
           isOriginal: true,
           groupId: editingGroup.id
         },
         ...selectedVariationItems.map(itemName => ({
           id: (Date.now() + Math.random()).toString(),
           itemName,
           isOriginal: false,
           groupId: editingGroup.id
         }))
       ];

       // Update the group
       const updatedGroup = {
         ...editingGroup,
         name: newVariationGroupName.trim(),
         originalItem: {
           id: Date.now().toString(),
           itemName: selectedOriginalItem,
           isOriginal: true
         },
         variations: newVariations,
         updatedAt: new Date().toISOString()
       };

       // Update the arrays
       variationGroups = variationGroups.map(g => 
         g.id === editingGroup.id ? updatedGroup : g
       );
       variations = [...variations, ...newVariations];

       // Save to localStorage
       localStorage.setItem('rust-variation-groups', JSON.stringify(variationGroups));
       localStorage.setItem('rust-variations', JSON.stringify(variations));

       // Reset form
       showEditVariationModal = false;
       editingGroup = null;
       newVariationGroupName = '';
       selectedOriginalItem = '';
       selectedVariationItems = [];
       originalItemSearch = '';
       variationItemsSearch = '';

       alert('Variation group updated successfully!');
     } catch (error) {
       console.error('Error updating variation group:', error);
       alert('Failed to update variation group. Please try again.');
     }
   }

  // Helper function to get original item name for a group
  function getOriginalItemName(group) {
    const originalVariation = variations.find(v => v.id === group.originalItemId);
    return originalVariation ? originalVariation.itemName : 'Unknown';
  }

  // Helper function to get variation count for a group
  function getVariationCount(groupId) {
    return variations.filter(v => v.groupId === groupId).length;
  }

  // Computed properties for filtered items
  $: filteredOriginalItems = availableItems.filter(item => 
    item.name.toLowerCase().includes(originalItemSearch.toLowerCase())
  );

  $: filteredVariationItems = availableItems.filter(item => 
    item.name.toLowerCase().includes(variationItemsSearch.toLowerCase()) ||
    selectedVariationItems.includes(item.name)
  );

  $: filteredExclusionItems = availableItems.filter(item => 
    item.name.toLowerCase().includes(exclusionItemsSearch.toLowerCase()) &&
    !exclusions.some(exclusion => exclusion.itemName === item.name)
  );
</script>

<div class="min-h-screen bg-gray-50">
  <Navbar currentPage="rules" />

  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {#if isLoading}
      <div class="text-center py-8">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p class="mt-4 text-gray-600">Loading rules...</p>
      </div>
    {:else if loadError}
      <div class="bg-red-50 border border-red-200 rounded-md p-4">
        <p class="text-red-800">Error loading data: {loadError}</p>
        <button 
          on:click={loadData}
          class="mt-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    {:else}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Item Exclusions -->
        <div class="bg-white rounded-lg shadow">
          <div class="px-6 py-4 border-b border-gray-200">
                                       <div class="flex items-center justify-between">
                <div>
                  <h2 class="text-lg font-semibold text-gray-900">Item Exclusions</h2>
                  <p class="text-sm text-gray-600">Items that will not appear in the available items list</p>
                </div>
                <div class="flex items-center space-x-2">
                  <button
                    on:click={exportExclusions}
                    class="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors flex items-center justify-center"
                    title="Export"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                  </button>
                  <label class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors cursor-pointer flex items-center justify-center" title="Import">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                    </svg>
                    <input
                      type="file"
                      accept=".json"
                      on:change={importExclusions}
                      class="hidden"
                    />
                  </label>
                                     <button
                     on:click={() => showAddExclusionModal = true}
                     class="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors flex items-center justify-center"
                     title="Add Exclusion"
                   >
                     <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                     </svg>
                   </button>
                </div>
              </div>
          </div>
          
                     <div class="p-6">
             {#if exclusions.length === 0}
               <p class="text-gray-500 text-center py-4">No exclusions defined</p>
             {:else}
               <div class="max-h-[40rem] overflow-y-auto space-y-3 pr-2">
                 {#each exclusions as exclusion}
                   <div class="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                     <div class="flex items-center">
                       <img 
                         src="/items/{availableItems.find(item => item.name === exclusion.itemName)?.filename}.png" 
                         alt={exclusion.itemName}
                         class="w-6 h-6 mr-3 object-contain"
                       />
                       <div>
                         <div class="font-medium text-gray-900">{exclusion.itemName}</div>
                         <div class="text-sm text-gray-500">
                           {availableItems.find(item => item.name === exclusion.itemName)?.category || 'Unknown Category'}
                         </div>
                       </div>
                     </div>
                                                                  <button
                         on:click={() => deleteExclusion(exclusion.id)}
                         class="text-red-600 hover:text-red-800 text-sm flex items-center justify-center"
                         title="Delete"
                       >
                         <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                         </svg>
                       </button>
                   </div>
                 {/each}
               </div>
             {/if}
           </div>
        </div>

        <!-- Item Variations -->
        <div class="bg-white rounded-lg shadow">
          <div class="px-6 py-4 border-b border-gray-200">
                                       <div class="flex items-center justify-between">
                <div>
                  <h2 class="text-lg font-semibold text-gray-900">Item Variations</h2>
                  <p class="text-sm text-gray-600">Group items that are functionally the same</p>
                </div>
                <div class="flex items-center space-x-2">
                  <button
                    on:click={exportVariations}
                    class="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors flex items-center justify-center"
                    title="Export"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                  </button>
                  <label class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors cursor-pointer flex items-center justify-center" title="Import">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                    </svg>
                    <input
                      type="file"
                      accept=".json"
                      on:change={importVariations}
                      class="hidden"
                    />
                  </label>
                                     <button
                     on:click={() => showAddVariationModal = true}
                     class="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors flex items-center justify-center"
                     title="Add Variation Group"
                   >
                     <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                     </svg>
                   </button>
                </div>
              </div>
          </div>
          
                     <div class="p-6">
             {#if variationGroups.length === 0}
               <p class="text-gray-500 text-center py-4">No variation groups defined</p>
             {:else}
               <div class="max-h-[40rem] overflow-y-auto space-y-3 pr-2">
                 {#each variationGroups as group}
                   <div class="border border-gray-200 rounded-md p-4">
                     <div class="flex items-center justify-between mb-2">
                       <h3 class="font-medium text-gray-900">{group.name}</h3>
                       <div class="flex space-x-2">
                                                                              <button
                             on:click={() => editVariationGroup(group)}
                             class="text-blue-600 hover:text-blue-800 text-sm flex items-center justify-center"
                             title="Edit"
                           >
                             <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                             </svg>
                           </button>
                                                     <button
                             on:click={() => deleteVariationGroup(group.id)}
                             class="text-red-600 hover:text-red-800 text-sm flex items-center justify-center"
                             title="Delete"
                           >
                             <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                             </svg>
                           </button>
                       </div>
                     </div>

                     <div class="text-sm text-gray-500">
                       Original: {getOriginalItemName(group)} | 
                       Variations: {getVariationCount(group.id)} items
                     </div>
                   </div>
                 {/each}
               </div>
             {/if}
                    </div>
       </div>
     </div>
   {/if}

   <!-- Edit Variation Group Modal -->
   {#if showEditVariationModal}
     <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
       <div class="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
         <div class="flex items-center justify-between mb-4">
           <h3 class="text-lg font-semibold text-gray-900">Edit Variation Group</h3>
           <button
             on:click={() => {
               showEditVariationModal = false;
               editingGroup = null;
               newVariationGroupName = '';
               selectedOriginalItem = '';
               selectedVariationItems = [];
               originalItemSearch = '';
               variationItemsSearch = '';
             }}
             class="text-gray-400 hover:text-gray-600 text-xl"
           >
             ×
           </button>
         </div>

         <div class="flex-1 overflow-y-auto space-y-4">
           <div>
             <label for="editGroupName" class="block text-sm font-medium text-gray-700 mb-2">
               Group Name
             </label>
             <input
               id="editGroupName"
               type="text"
               bind:value={newVariationGroupName}
               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
               placeholder="e.g., Hazmat Suit"
             />
           </div>

           <div>
             <label for="editOriginalItem" class="block text-sm font-medium text-gray-700 mb-2">
               Original Item (Representative)
             </label>
             <input
               type="text"
               bind:value={originalItemSearch}
               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
               placeholder="Search for an original item..."
             />
             
             {#if originalItemSearch && filteredOriginalItems.length > 0}
               <div class="max-h-48 overflow-y-auto border border-gray-300 rounded-md mt-2">
                 {#each filteredOriginalItems as item}
                   <button
                     type="button"
                     on:click={() => {
                       selectedOriginalItem = item.name;
                       originalItemSearch = '';
                     }}
                     class="w-full text-left p-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                   >
                     <div class="flex items-center">
                       <img 
                         src="/items/{item.filename}.png" 
                         alt={item.name}
                         class="w-6 h-6 mr-3 object-contain"
                       />
                       <div>
                         <div class="font-medium text-sm">{item.name}</div>
                         <div class="text-xs text-gray-500">{item.category}</div>
                       </div>
                     </div>
                   </button>
                 {/each}
               </div>
             {/if}
             
             {#if selectedOriginalItem}
               <div class="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                 <div class="flex items-center justify-between">
                   <div class="flex items-center">
                     <img 
                       src="/items/{availableItems.find(item => item.name === selectedOriginalItem)?.filename}.png" 
                       alt={selectedOriginalItem}
                       class="w-6 h-6 mr-3 object-contain"
                     />
                     <span class="text-sm font-medium">{selectedOriginalItem}</span>
                   </div>
                   <button
                     type="button"
                     on:click={() => {
                       selectedOriginalItem = '';
                     }}
                     class="text-red-600 hover:text-red-800 text-sm"
                   >
                     Remove
                   </button>
                 </div>
               </div>
             {/if}
           </div>

           <div>
             <label for="editVariationItemsSearch" class="block text-sm font-medium text-gray-700 mb-2">
               Variation Items (Select multiple)
             </label>
             <input
               id="editVariationItemsSearch"
               type="text"
               bind:value={variationItemsSearch}
               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
               placeholder="Search for variation items..."
             />
             <div class="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-2">
               {#each filteredVariationItems as item}
                 <label class="flex items-center p-2 hover:bg-gray-50 rounded">
                   <input
                     type="checkbox"
                     value={item.name}
                     bind:group={selectedVariationItems}
                     checked={selectedVariationItems.includes(item.name)}
                     class="mr-3"
                   />
                   <div class="flex items-center flex-1">
                     <img 
                       src="/items/{item.filename}.png" 
                       alt={item.name}
                       class="w-6 h-6 mr-3 object-contain"
                     />
                     <div>
                       <div class="text-sm font-medium">{item.name}</div>
                       <div class="text-xs text-gray-500">{item.category}</div>
                     </div>
                   </div>
                 </label>
               {/each}
             </div>
             
             {#if selectedVariationItems.length > 0}
               <div class="mt-2">
                 <div class="text-sm font-medium text-gray-700 mb-2">Selected Items ({selectedVariationItems.length})</div>
                 <div class="flex flex-wrap gap-2">
                   {#each selectedVariationItems as itemName}
                     <div class="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                       <img 
                         src="/items/{availableItems.find(item => item.name === itemName)?.filename}.png" 
                         alt={itemName}
                         class="w-4 h-4 mr-1 object-contain"
                       />
                       <span>{itemName}</span>
                       <button
                         type="button"
                         on:click={() => {
                           selectedVariationItems = selectedVariationItems.filter(name => name !== itemName);
                         }}
                         class="ml-1 text-blue-600 hover:text-blue-800"
                       >
                         ×
                       </button>
                     </div>
                   {/each}
                 </div>
               </div>
             {/if}
           </div>
         </div>

         <div class="mt-6 flex space-x-3">
                       <button
              on:click={updateVariationGroup}
              class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span>Update Variation Group</span>
            </button>
           <button
             on:click={() => {
               showEditVariationModal = false;
               editingGroup = null;
               newVariationGroupName = '';
               selectedOriginalItem = '';
               selectedVariationItems = [];
               originalItemSearch = '';
               variationItemsSearch = '';
             }}
             class="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
           >
             Cancel
           </button>
         </div>
       </div>
     </div>
   {/if}
 </div>

     <!-- Add Exclusion Modal -->
   {#if showAddExclusionModal}
     <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
       <div class="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
         <div class="flex items-center justify-between mb-4">
           <h3 class="text-lg font-semibold text-gray-900">Add Item Exclusions</h3>
           <button
             on:click={() => showAddExclusionModal = false}
             class="text-gray-400 hover:text-gray-600 text-xl"
           >
             ×
           </button>
         </div>

         <div class="flex-1 overflow-y-auto space-y-4">
           <div>
             <label for="exclusionSearch" class="block text-sm font-medium text-gray-700 mb-2">
               Search Items to Exclude
             </label>
             <input
               id="exclusionSearch"
               type="text"
               bind:value={exclusionItemsSearch}
               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
               placeholder="Search for items to exclude..."
             />
           </div>

           <div>
             <label for="exclusionItemsList" class="block text-sm font-medium text-gray-700 mb-2">
               Available Items (Select multiple)
             </label>
             <div id="exclusionItemsList" class="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-2">
                               {#each filteredExclusionItems as item}
                  <label class="flex items-center p-2 hover:bg-gray-50 rounded">
                    <input
                      type="checkbox"
                      value={item.name}
                      bind:group={selectedExclusionItems}
                      checked={selectedExclusionItems.includes(item.name)}
                      class="mr-3"
                    />
                    <div class="flex items-center flex-1">
                      <img 
                        src="/items/{item.filename}.png" 
                        alt={item.name}
                        class="w-6 h-6 mr-3 object-contain"
                      />
                      <div>
                        <div class="text-sm font-medium">{item.name}</div>
                        <div class="text-xs text-gray-500">{item.category}</div>
                      </div>
                    </div>
                  </label>
                {/each}
             </div>
           </div>

           {#if selectedExclusionItems.length > 0}
             <div>
               <div class="text-sm font-medium text-gray-700 mb-2">Selected Items ({selectedExclusionItems.length})</div>
               <div class="flex flex-wrap gap-2">
                 {#each selectedExclusionItems as itemName}
                   <div class="flex items-center bg-red-100 text-red-800 px-2 py-1 rounded text-sm">
                     <img 
                       src="/items/{availableItems.find(item => item.name === itemName)?.filename}.png" 
                       alt={itemName}
                       class="w-4 h-4 mr-1 object-contain"
                     />
                     <span>{itemName}</span>
                     <button
                       type="button"
                       on:click={() => {
                         selectedExclusionItems = selectedExclusionItems.filter(name => name !== itemName);
                       }}
                       class="ml-1 text-red-600 hover:text-red-800"
                     >
                       ×
                     </button>
                   </div>
                 {/each}
               </div>
             </div>
           {/if}
         </div>

         <div class="mt-6 flex space-x-3">
                       <button
              on:click={addExclusion}
              class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors flex items-center space-x-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"></path>
              </svg>
              <span>Exclude {selectedExclusionItems.length} Item{selectedExclusionItems.length !== 1 ? 's' : ''}</span>
            </button>
           <button
             on:click={() => {
               showAddExclusionModal = false;
               selectedExclusionItems = [];
               exclusionItemsSearch = '';
             }}
             class="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
           >
             Cancel
           </button>
         </div>
       </div>
     </div>
   {/if}

  <!-- Add Variation Group Modal -->
  {#if showAddVariationModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">Add Variation Group</h3>
          <button
            on:click={() => showAddVariationModal = false}
            class="text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>
        </div>

        <div class="flex-1 overflow-y-auto space-y-4">
                     <div>
             <label for="groupName" class="block text-sm font-medium text-gray-700 mb-2">
               Group Name
             </label>
             <input
               id="groupName"
               type="text"
               bind:value={newVariationGroupName}
               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
               placeholder="e.g., Hazmat Suit"
             />
           </div>

                     <div>
             <label for="originalItem" class="block text-sm font-medium text-gray-700 mb-2">
               Original Item (Representative)
             </label>
             <input
               type="text"
               bind:value={originalItemSearch}
               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
               placeholder="Search for an original item..."
             />
             
             {#if originalItemSearch && filteredOriginalItems.length > 0}
               <div class="max-h-48 overflow-y-auto border border-gray-300 rounded-md mt-2">
                 {#each filteredOriginalItems as item}
                   <button
                     type="button"
                     on:click={() => {
                       selectedOriginalItem = item.name;
                       originalItemSearch = '';
                     }}
                     class="w-full text-left p-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                   >
                     <div class="flex items-center">
                       <img 
                         src="/items/{item.filename}.png" 
                         alt={item.name}
                         class="w-6 h-6 mr-3 object-contain"
                       />
                       <div>
                         <div class="font-medium text-sm">{item.name}</div>
                         <div class="text-xs text-gray-500">{item.category}</div>
                       </div>
                     </div>
                   </button>
                 {/each}
               </div>
             {/if}
             
             {#if selectedOriginalItem}
               <div class="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                 <div class="flex items-center justify-between">
                   <div class="flex items-center">
                     <img 
                       src="/items/{availableItems.find(item => item.name === selectedOriginalItem)?.filename}.png" 
                       alt={selectedOriginalItem}
                       class="w-6 h-6 mr-3 object-contain"
                     />
                     <span class="text-sm font-medium">{selectedOriginalItem}</span>
                   </div>
                   <button
                     type="button"
                     on:click={() => {
                       selectedOriginalItem = '';
                     }}
                     class="text-red-600 hover:text-red-800 text-sm"
                   >
                     Remove
                   </button>
                 </div>
               </div>
             {/if}
           </div>

                     <div>
             <label for="addVariationItemsSearch" class="block text-sm font-medium text-gray-700 mb-2">
               Variation Items (Select multiple)
             </label>
             <input
               id="addVariationItemsSearch"
               type="text"
               bind:value={variationItemsSearch}
               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
               placeholder="Search for variation items..."
             />
             <div class="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-2">
               {#each filteredVariationItems as item}
                 <label class="flex items-center p-2 hover:bg-gray-50 rounded">
                   <input
                     type="checkbox"
                     value={item.name}
                     bind:group={selectedVariationItems}
                     checked={selectedVariationItems.includes(item.name)}
                     class="mr-3"
                   />
                   <div class="flex items-center flex-1">
                     <img 
                       src="/items/{item.filename}.png" 
                       alt={item.name}
                       class="w-6 h-6 mr-3 object-contain"
                     />
                     <div>
                       <div class="text-sm font-medium">{item.name}</div>
                       <div class="text-xs text-gray-500">{item.category}</div>
                     </div>
                   </div>
                 </label>
               {/each}
             </div>
             
             {#if selectedVariationItems.length > 0}
               <div class="mt-2">
                 <div class="text-sm font-medium text-gray-700 mb-2">Selected Items ({selectedVariationItems.length})</div>
                 <div class="flex flex-wrap gap-2">
                   {#each selectedVariationItems as itemName}
                     <div class="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                       <img 
                         src="/items/{availableItems.find(item => item.name === itemName)?.filename}.png" 
                         alt={itemName}
                         class="w-4 h-4 mr-1 object-contain"
                       />
                       <span>{itemName}</span>
                       <button
                         type="button"
                         on:click={() => {
                           selectedVariationItems = selectedVariationItems.filter(name => name !== itemName);
                         }}
                         class="ml-1 text-blue-600 hover:text-blue-800"
                       >
                         ×
                       </button>
                     </div>
                   {/each}
                 </div>
               </div>
             {/if}
           </div>
        </div>

        <div class="mt-6 flex space-x-3">
                     <button
             on:click={addVariationGroup}
             class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
           >
             <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
             </svg>
             <span>Add Variation Group</span>
           </button>
          <button
            on:click={() => showAddVariationModal = false}
            class="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
