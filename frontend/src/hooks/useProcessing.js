import { useState, useCallback, useRef } from 'react'
import { uploadImage, uploadVideo, pollVideoProgress } from '../utils/api'

export function useProcessing() {
  const [result,   setResult]   = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [progress, setProgress] = useState(0)
  const pollRef = useRef(null)

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
    setProgress(0)
    if (pollRef.current) clearInterval(pollRef.current)
  }, [])

  const processFile = useCallback(async (file) => {
    reset()
    setLoading(true)

    const isVideo = file.type.startsWith('video')

    try {
      if (!isVideo) {
        // ── Image: synchronous ──────────────────────────────────────────
        const data = await uploadImage(file)
        setResult(data)
        setProgress(100)

      } else {
        // ── Video: async with polling ───────────────────────────────────
        // Step 1: upload (returns {file_id, status: "processing"} immediately)
        const { file_id } = await uploadVideo(file, (uploadPct) => {
          // uploadPct 0–50 = upload progress
          setProgress(Math.round(uploadPct / 2))
        })

        // Step 2: poll /progress/{file_id} every 1.5s
        await new Promise((resolve, reject) => {
          pollRef.current = setInterval(async () => {
            try {
              const { progress: pct, result: jobResult, error: jobError } =
                await pollVideoProgress(file_id)

              if (jobError) {
                clearInterval(pollRef.current)
                reject(new Error(jobError))
                return
              }

              // Map server progress (0–100) to UI progress (50–100)
              setProgress(50 + Math.round(pct / 2))

              if (pct >= 100 && jobResult) {
                clearInterval(pollRef.current)
                setResult(jobResult)
                resolve()
              }
            } catch (e) {
              clearInterval(pollRef.current)
              reject(e)
            }
          }, 1500)
        })
      }

    } catch (err) {
      const msg = err?.response?.data?.detail || err.message || 'Lỗi không xác định'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [reset])

  return { result, loading, error, progress, processFile, reset }
}