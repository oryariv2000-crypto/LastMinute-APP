import { supabase } from './supabase'
import { resizeImageToJpeg } from './imageResize'

/**
 * aiVision — client wrapper for the "AI Vision" new-deal flow.
 *
 * The Gemini API key lives ONLY in the analyze-showcase Edge Function. Here we
 * downscale the photo, guard its size, and POST it to that function (which
 * attaches the user's JWT). The function does the Gemini call + parsing and
 * returns normalized items. Public contract is unchanged: takes an image
 * File/Blob, resolves to the items array, throws (Hebrew message) on failure.
 */

const MAX_BYTES = 6 * 1024 * 1024 // hard cap; the function re-checks server-side
const MAX_EDGE = 1568             // Gemini's internal tile resolution
const JPEG_QUALITY = 0.8

/**
 * Analyze a showcase photo and return normalized deal items.
 * @param {File|Blob} file image from the camera/upload picker
 * @returns {Promise<Array<{id,title,category,quantity,original_price,discount_price}>>}
 */
export async function analyzeShowcaseImage(file) {
  if (!file || !String(file.type || '').startsWith('image/')) {
    throw new Error('יש לספק קובץ תמונה תקין')
  }

  const blob = await resizeImageToJpeg(file, { maxEdge: MAX_EDGE, quality: JPEG_QUALITY })
  if (blob.size > MAX_BYTES) {
    throw new Error('התמונה גדולה מדי')
  }

  const image = await blobToBase64(blob)
  const { data, error } = await supabase.functions.invoke('analyze-showcase', {
    body: { image, mimeType: 'image/jpeg' },
  })
  if (error) {
    throw new Error(messageForStatus(error?.context?.status))
  }
  return Array.isArray(data?.items) ? data.items : []
}

/* ── Helpers ─────────────────────────────────────────────────────── */

/** Read a Blob as a bare base64 string (no data: prefix). */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(new Error('קריאת התמונה נכשלה'))
    reader.readAsDataURL(blob)
  })
}

/** Map the Edge Function's HTTP status to a user-facing Hebrew message. */
function messageForStatus(status) {
  switch (status) {
    case 401: return 'לא מחובר. התחבר מחדש.'
    case 403: return 'אין הרשאה'
    case 413: return 'התמונה גדולה מדי'
    case 400: return 'יש לספק קובץ תמונה תקין'
    default:  return 'ניתוח התמונה נכשל, נסה/י שוב'
  }
}
