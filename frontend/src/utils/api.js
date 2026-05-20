import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({ baseURL: BASE })

export async function uploadImage(file) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/upload/image', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function uploadVideo(file, onProgress) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/upload/video', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded / e.total) * 50))
      }
    },
  })
  return data
}

export function getMediaUrl(path) {
  if (!path) return null
  return `${BASE}/outputs/${path}`
}

export function getAudioUrl(filename) {
  if (!filename) return null
  return `${BASE}/audio/${filename}`
}
