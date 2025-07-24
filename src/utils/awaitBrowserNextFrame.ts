// A utility function to wait for the next browser repaint.
export const awaitBrowserNextFrame = () => new Promise(requestAnimationFrame);