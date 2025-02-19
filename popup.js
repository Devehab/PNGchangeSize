document.addEventListener('DOMContentLoaded', function() {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const convertButton = document.getElementById('convertButton');
  const status = document.getElementById('status');
  const imagePreview = document.getElementById('imagePreview');
  const sizesContainer = document.getElementById('sizesContainer');
  let selectedFile = null;

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

  function handleFile(file) {
    selectedFile = file;
    status.textContent = `Selected: ${file.name}`;
    status.className = '';
    convertButton.disabled = false;

    // Show image preview
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = e.target.result;
      imagePreview.style.display = 'block';
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
