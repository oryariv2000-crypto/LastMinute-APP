import { useRef, useState } from 'react'
import { CameraIcon, XIcon } from '../icons'
import './CameraCaptureSection.css'

/**
 * CameraCaptureSection — Photo upload tile with file/camera picker and previews.
 *
 * Props:
 *   onChange  fn(files) — called with full file array on each add/remove
 *   max       number    — maximum number of photos (default 6)
 */
export default function CameraCaptureSection({ onChange, max = 6 }) {
  const [photos, setPhotos] = useState([]) // [{ id, url, file }]
  const inputRef = useRef(null)

  function addFiles(fileList) {
    const next = [...photos]
    for (const file of fileList) {
      if (next.length >= max) break
      next.push({
        id: `${file.name}-${file.lastModified}-${Math.random()}`,
        url: URL.createObjectURL(file),
        file,
      })
    }
    setPhotos(next)
    onChange?.(next.map(p => p.file))
  }

  function remove(id) {
    const next = photos.filter(p => p.id !== id)
    const removed = photos.find(p => p.id === id)
    if (removed) URL.revokeObjectURL(removed.url)
    setPhotos(next)
    onChange?.(next.map(p => p.file))
  }

  return (
    <section className="camera-capture" aria-label="צילום מוצרים">
      <div className="camera-capture__header">
        <h2 className="camera-capture__title">הוסף תמונות</h2>
        <span className="camera-capture__count">
          {photos.length} / {max}
        </span>
      </div>

      <div className="camera-capture__grid">
        {photos.map((p) => (
          <div key={p.id} className="camera-capture__tile">
            <img src={p.url} alt="תצוגה מקדימה" />
            <button
              type="button"
              className="camera-capture__remove"
              onClick={() => remove(p.id)}
              aria-label="הסר תמונה"
            >
              <XIcon />
            </button>
          </div>
        ))}

        {photos.length < max && (
          <button
            type="button"
            className="camera-capture__add"
            onClick={() => inputRef.current?.click()}
            aria-label="הוסף תמונה"
          >
            <CameraIcon />
            <span>צלם / העלה</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files)
          e.target.value = ''
        }}
      />

      <p className="camera-capture__hint">
        טיפ: תמונה ברורה של המוצר עוזרת ל-AI לזהות אותו במדויק
      </p>
    </section>
  )
}

