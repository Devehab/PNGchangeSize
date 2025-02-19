// Create context menu item when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "resizePNG",
    title: "Resize PNG Image",
    contexts: ["image"]
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "resizePNG") {
    // Store the image URL temporarily
    chrome.storage.local.set({ 'selectedImageUrl': info.srcUrl }, () => {
      // Click the extension icon programmatically to open the popup
      chrome.action.openPopup();
    });
  }
});
