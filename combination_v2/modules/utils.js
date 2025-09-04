// modules/utils.js: Utility functions for file conversion

/**
 * Converts a data URL string into a File object.
 * @param {string} dataUrl - The data URL to convert.
 * @returns {Promise<File>} A promise that resolves with the File object.
 */
async function dataURLtoFile(dataUrl) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const extension = blob.type.split('/')[1] || 'bin';
  return new File([blob], `file_${Date.now()}.${extension}`, { type: blob.type });
}

/**
 * Reads a File object and converts it to a data URL string.
 * @param {File} file - The file to read.
 * @returns {Promise<string>} A promise that resolves with the data URL.
 */
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}