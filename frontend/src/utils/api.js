import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({ baseURL: BASE })

// ── Image upload (synchronous) ────────────────────────────────────────────
export async function uploadImage(file) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/upload/image', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

// ── Video upload (async job — returns file_id immediately) ────────────────
export async function uploadVideo(file, onUploadProgress) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/upload/video', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onUploadProgress && e.total) {
        onUploadProgress(Math.round((e.loaded / e.total) * 100))
      }
    },
  })
  // Returns { file_id, status: "processing" }
  return data
}

// ── Poll video processing progress ───────────────────────────────────────
export async function pollVideoProgress(fileId) {
  const { data } = await api.get(`/progress/${fileId}`)
  // Returns { file_id, progress, error, result? }
  return data
}

// ── Media URL helpers ─────────────────────────────────────────────────────
export function getMediaUrl(filename) {
  if (!filename) return null
  return `${BASE}/outputs/${filename}`
}

export function getAudioUrl(filename) {
  if (!filename) return null
  return `${BASE}/audio/${filename}`
}

export function getVideoUrl(filename) {
  if (!filename) return null
  return `${BASE}/video/${filename}`
}

export function getImageUrl(filename) {
  if (!filename) return null
  return `${BASE}/image/${filename}`
}