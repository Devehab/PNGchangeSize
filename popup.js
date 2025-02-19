document.addEventListener('DOMContentLoaded', function() {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const convertButton = document.getElementById('convertButton');
  const status = document.getElementById('status');
  const imagePreview = document.getElementById('imagePreview');
  const sizesContainer = document.getElementById('sizesContainer');
  let selectedFile = null;

  // Check for context menu selected image
  chrome.storage.local.get(['selectedImageUrl'], function(result) {
    if (result.selectedImageUrl) {
      fetchAndProcessImage(result.selectedImageUrl);
      chrome.storage.local.remove('selectedImageUrl');
    }
  });

  // Function to fetch image using XMLHttpRequest
  function fetchImageAsBlob(url) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'blob';
      
      xhr.onload = function() {
        if (this.status === 200) {
          resolve(this.response);
        } else {
          reject(new Error('Failed to load image'));
        }
      };
      
      xhr.onerror = function() {
        reject(new Error('Network error'));
      };
      
      xhr.send();
    });
  }

  // Function to load image from blob
  function loadImageFromBlob(blob) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(blob);
      
      img.onload = function() {
        URL.revokeObjectURL(objectUrl);
        resolve(img);
      };
      
      img.onerror = function() {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to create image from blob'));
      };
      
      img.src = objectUrl;
    });
  }

  // Function to convert image to PNG
  async function convertToPNG(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png');
    });
  }

  // Function to fetch and process image from URL
  async function fetchAndProcessImage(url) {
    try {
      status.textContent = 'Loading image...';
      
      // Fetch the image as blob
      const blob = await fetchImageAsBlob(url);
      
      // Load the image
      const img = await loadImageFromBlob(blob);
      
      // Convert to PNG
      const pngBlob = await convertToPNG(img);
      
      // Create file and process it
      const file = new File([pngBlob], 'image.png', { type: 'image/png' });
      processFile(file);
      
    } catch (error) {
      console.error('Error processing image:', error);
      status.textContent = 'Error loading image. Please try again.';
      status.className = 'error';
    }
  }

  // Define available sizes
  const availableSizes = [
    16, 32, 48, 64, 96, 128, 256, 512
  ];

  // Default sizes
  const defaultSizes = [16, 32, 48, 128];

  // Create size options
  availableSizes.forEach(size => {
    const sizeOption = document.createElement('div');
    sizeOption.className = 'size-option';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `size-${size}`;
    checkbox.value = size;
    checkbox.checked = defaultSizes.includes(size);
    
    const label = document.createElement('label');
    label.htmlFor = `size-${size}`;
    label.textContent = `${size}px`;
    
    sizeOption.appendChild(checkbox);
    sizeOption.appendChild(label);
    sizesContainer.appendChild(sizeOption);
  });

  // Handle drag and drop events
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFile(file);
    }
  });

  // Handle click to select file
  dropZone.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  // Handle paste events
  document.addEventListener('paste', async (e) => {
    e.preventDefault();
    
    const items = e.clipboardData.items;
    let imageItem = null;
    
    // Look for an image in the clipboard
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        imageItem = items[i];
        break;
      }
    }
    
    if (imageItem) {
      const blob = imageItem.getAsFile();
      if (blob) {
        // Create a File object from the blob
        const file = new File([blob], 'pasted-image.png', { type: 'image/png' });
        handleFile(file);
      }
    } else {
      // Check if there's a URL in the clipboard
      const text = e.clipboardData.getData('text');
      if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
        // Check if it's an image URL
        if (text.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)) {
          fetchAndProcessImage(text);
        }
      }
    }
  });

  // Add paste instruction to dropZone
  dropZone.addEventListener('click', () => {
    fileInput.click();
  });

  // Focus the window to enable paste
  window.focus();

  // Handle file selection
  function handleFile(file) {
    if (!file.type.startsWith('image/')) {
      status.textContent = 'Please select an image file.';
      status.className = 'error';
      return;
    }

    selectedFile = file;
    const reader = new FileReader();

    reader.onload = function(e) {
      imagePreview.src = e.target.result;
      imagePreview.style.display = 'block';
      status.textContent = `Selected: ${file.name}`;
      status.className = '';
      convertButton.disabled = false;
    };

    reader.readAsDataURL(file);
  }

  // Process the file after any necessary conversion
  function processFile(file) {
    selectedFile = file;
    const reader = new FileReader();

    reader.onload = function(e) {
      imagePreview.src = e.target.result;
      imagePreview.style.display = 'block';
      status.textContent = `Selected: ${file.name}`;
      status.className = '';
      convertButton.disabled = false;
    };

    reader.readAsDataURL(file);
  }

  convertButton.addEventListener('click', async () => {
    if (!selectedFile) return;

    // Get selected sizes
    const selectedSizes = Array.from(sizesContainer.querySelectorAll('input[type="checkbox"]:checked'))
      .map(checkbox => parseInt(checkbox.value))
      .sort((a, b) => a - b);

    if (selectedSizes.length === 0) {
      status.textContent = 'Please select at least one size';
      status.className = 'error';
      return;
    }

    status.textContent = 'Converting...';
    status.className = '';
    convertButton.disabled = true;

    try {
      const imageUrl = URL.createObjectURL(selectedFile);
      const img = new Image();
      
      img.onload = async () => {
        const zip = new JSZip();
        
        for (const size of selectedSizes) {
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          
          // Improve scaling quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          ctx.drawImage(img, 0, 0, size, size);
          
          // Convert to blob
          const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/png');
          });
          
          zip.file(`icon${size}.png`, blob);
        }

        // Create and download zip file
        const content = await zip.generateAsync({type: 'blob'});
        const downloadUrl = URL.createObjectURL(content);
        
        chrome.downloads.download({
          url: downloadUrl,
          filename: 'icons.zip',
          saveAs: true
        });

        status.textContent = 'Conversion complete! Downloading...';
        status.className = 'success';
        convertButton.disabled = false;
        
        URL.revokeObjectURL(imageUrl);
        URL.revokeObjectURL(downloadUrl);
      };

      img.src = imageUrl;
    } catch (error) {
      status.textContent = 'Error: ' + error.message;
      status.className = 'error';
      convertButton.disabled = false;
    }
  });
});
