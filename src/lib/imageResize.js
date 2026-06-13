/**
 * imageResize — shrink a photo before sending it to the analyze-showcase
 * function. Gemini internally downscales to ~1568px, so anything larger is
 * wasted bandwidth and tokens.
 *
 * `fitDimensions` is pure and unit-tested; `resizeImageToJpeg` does the canvas
 * work (verified in-browser, since jsdom has no real canvas).
 */

/** Target dimensions that fit `maxEdge` on the long side, preserving aspect. */
export function fitDimensions(width, height, maxEdge) {
  const longest = Math.max(width, height)
  if (longest <= maxEdge) return { width, height }
  const scale = maxEdge / longest
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

/**
 * Downscale a File/Blob to a JPEG Blob no larger than `maxEdge` on the long
 * side. Resolves with the new Blob; rejects if the image can't be decoded.
 */
export function resizeImageToJpeg(file, { maxEdge = 1568, quality = 0.8 } = {}) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const { width, height } = fitDimensions(img.naturalWidth, img.naturalHeight, maxEdge)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('שינוי גודל התמונה נכשל'))),
        'image/jpeg',
        quality,
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('טעינת התמונה נכשלה'))
    }
    img.src = url
  })
}
