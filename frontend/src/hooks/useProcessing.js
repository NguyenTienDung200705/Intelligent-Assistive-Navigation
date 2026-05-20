import { useState, useCallback, useRef } from 'react'
import { uploadImage, uploadVideo } from '../utils/api'

export function useProcessing() {
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [progress, setProgress] = useState(0)
  const abortRef = useRef(null)

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
    setProgress(0)
  }, [])

  const processFile = useCallback(async (file) => {
    reset()
    setLoading(true)

    const isVideo = file.type.startsWith('video')

    try {
      const data = isVideo
        ? await uploadVideo(file, (pct) => setProgress(pct))
        : await uploadImage(file)

      setResult({ ...data, fileType: isVideo ? 'video' : 'image' })
    } catch (err) {
      const msg = err?.response?.data?.detail || err.message || 'Lỗi không xác định'
      setError(msg)
    } finally {
      setLoading(false)
      setProgress(100)
    }
  }, [reset])

  return { result, loading, error, progress, processFile, reset }
}
