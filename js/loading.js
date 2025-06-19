// js/components/loading.js
export function showLoading(container, options = {}) {
  const { text = 'Loading...', size = 'medium', fullPage = false } = options;
  
  const sizes = {
    small: 'h-6 w-6',
    medium: 'h-8 w-8',
    large: 'h-12 w-12'
  };
  
  const loader = document.createElement('div');
  loader.className = `loading-spinner flex flex-col items-center justify-center ${fullPage ? 'fixed inset-0 z-50 bg-black/30' : ''}`;
  
  loader.innerHTML = `
    <div class="flex flex-col items-center justify-center space-y-2">
      <svg class="animate-spin ${sizes[size] || sizes.medium} text-sky-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p class="text-sm text-gray-600 dark:text-gray-400">${text}</p>
    </div>
  `;
  
  // Save original content if fullPage
  if (fullPage) {
    loader.dataset.originalContent = container.innerHTML;
    container.innerHTML = '';
    document.body.appendChild(loader);
  } else {
    container.innerHTML = '';
    container.appendChild(loader);
  }
  
  return loader;
}

export function hideLoading(container, loader) {
  if (loader.dataset?.originalContent) {
    container.innerHTML = loader.dataset.originalContent;
    loader.remove();
  } else if (container) {
    container.innerHTML = '';
  }
}