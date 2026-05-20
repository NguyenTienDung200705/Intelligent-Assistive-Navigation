import { useState, useRef, useCallback, useEffect } from 'react'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/stream'

export function useWebSocket() {
  const [connected, setConnected] = useState(false)
  const [streamResult, setStreamResult] = useState(null)
  const [streaming, setStreaming] = useState(false)
  const wsRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const rafRef = useRef(null)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(WS_URL)
    ws.onopen    = () => { setConnected(true) }
    ws.onclose   = () => { setConnected(false); setStreaming(false) }
    ws.onerror   = () => { setConnected(false) }
    ws.onmessage = (e) => {
      try { setStreamResult(JSON.parse(e.data)) }
      catch (_) {}
    }
    wsRef.current = ws
  }, [])

  const disconnect = useCallback(() => {
    wsRef.current?.close()
    wsRef.current = null
    setStreaming(false)
  }, [])

  const startCameraStream = useCallback(async (videoEl, canvasEl) => {
    if (!videoEl || !canvasEl) return
    videoRef.current = videoEl
    canvasRef.current = canvasEl

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
      videoEl.srcObject = stream
      await videoEl.play()
      setStreaming(true)
      sendFrames(videoEl, canvasEl)
    } catch (err) {
      console.error('Camera access denied:', err)
    }
  }, [])

  const sendFrames = useCallback((videoEl, canvasEl) => {
    const ctx = canvasEl.getContext('2d')

    const tick = () => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
      if (videoEl.readyState < 2) { rafRef.current = requestAnimationFrame(tick); return }

      ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height)
      canvasEl.toBlob((blob) => {
        if (blob && wsRef.current?.readyState === WebSocket.OPEN) {
          blob.arrayBuffer().then((buf) => wsRef.current.send(buf))
        }
      }, 'image/jpeg', 0.7)

      setTimeout(() => { rafRef.current = requestAnimationFrame(tick) }, 200) // ~5 FPS
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop())
      videoRef.current.srcObject = null
    }
    setStreaming(false)
  }, [])

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current)
    wsRef.current?.close()
  }, [])

  return { connected, streaming, streamResult, connect, disconnect, startCameraStream, stopCamera }
}
