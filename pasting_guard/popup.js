const POST_FILE_TEXT = "This is the text after Ctrl V file";

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

document.getElementById('fileInput').addEventListener('change', async (event) => {
  const files = event.target.files;
  const status = document.getElementById('status');
  
  if (!files?.length) {
    status.textContent = 'No files selected.';
    return;
  }

  status.textContent = `Processing ${files.length} file(s)...`;
  
  try {
    const dataUrls = await Promise.all(Array.from(files).map(readFileAsDataURL));
    const mixedQueue = dataUrls.flatMap(url => [url, POST_FILE_TEXT]);

    chrome.storage.local.set({
      itemQueue: mixedQueue,
      nextItemIndex: 0,
      lastPastedType: null
    }, () => {
      status.textContent = `${mixedQueue.length} paste actions ready in all tabs!`;
      status.style.color = '#4CAF50';
      setTimeout(() => window.close(), 2500);
    });
  } catch (error) {
    status.textContent = 'Error reading files.';
    status.style.color = '#F44336';
  }
});