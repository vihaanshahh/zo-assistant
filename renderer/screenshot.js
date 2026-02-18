
// This function is called from the renderer process
// It uses the IPC bridge to communicate with main process
export async function captureActiveDisplay() {
  // Use the IPC bridge to capture screenshot
  return new Promise((resolve, reject) => {
    if (window.stealth && window.stealth.captureScreenshot) {
      window.stealth.captureScreenshot()
        .then(resolve)
        .catch(reject);
    } else {
      reject(new Error('Screenshot not available - IPC bridge not ready'));
    }
  });
}
