// Placeholder icon - you should replace these with actual icon files
// For now, create simple SVG-based icons

const createIconDataUrl = (size) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" fill="#4A90E2" rx="${size/8}"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size/2}" fill="white" text-anchor="middle" dy=".35em">L</text>
    </svg>
  `
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

// Export as data URLs for development
// Replace with actual PNG files for production
export const icon16 = createIconDataUrl(16)
export const icon48 = createIconDataUrl(48)
export const icon128 = createIconDataUrl(128)
