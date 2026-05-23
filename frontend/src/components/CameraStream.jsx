import React, { useRef, useEffect, useState, useCallback } from 'react'
import { getAudioUrl } from '../utils/api'
import ObjectCard from './ObjectCard'

const WS_URL    = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/stream'
const TARGET_FPS = 5   // frames per second sent to backend

export default function CameraStream() {
  const videoRef      = useRef(null)   // hidden <video> from getUserMedia
  const canvasRef     = useRef(null)   // hidden capture canvas (send to WS)
  const displayRef    = useRef(null)   // visible canvas (shows annotated frame)
  const wsRef         = useRef(null)
  const rafRef        = useRef(null)
  const audioRef      = useRef(new Audio())
  const lastSendRef   = useRef(0)

  const [active,      setActive]      = useState(false)
  const [connected,   setConnected]   = useState(false)
  const [streamResult, setStreamResult] = useState(null)
  const [fps,         setFps]         = useState(0)
  const [fpsCounter,  setFpsCounter]  = useState({ count: 0, ts: Date.now() })

  // ── WebSocket helpers ─────────────────────────────────────────────────

  const connectWS = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(WS_URL)

    ws.onopen = () => {
      setConnected(true)
      console.log('[WS] connected')
    }

    ws.onclose = () => {
      setConnected(false)
      console.log('[WS] disconnected')
    }

    ws.onerror = (e) => {
      console.error('[WS] error', e)
      setConnected(false)
    }

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data)
        if (data.error) { console.warn('[WS] server error:', data.error); return }

        // ── Draw annotated frame onto display canvas ──
        if (data.annotated_frame_b64 && displayRef.current) {
          const img = new Image()
          img.onload = () => {
            const ctx = displayRef.current?.getContext('2d')
            if (!ctx) return
            displayRef.current.width  = img.naturalWidth
            displayRef.current.height = img.naturalHeight
            ctx.drawImage(img, 0, 0)
          }
          img.src = `data:image/jpeg;base64,${data.annotated_frame_b64}`
        }

        // ── Play TTS audio when it changes ──
        if (data.audio_file) {
          const url = getAudioUrl(data.audio_file)
          if (audioRef.current.src !== url) {
            audioRef.current.pause()
            audioRef.current.src = url
            audioRef.current.play().catch(() => {})
          }
        }

        // ── Update UI state (danger info, objects) ──
        setStreamResult(data)

        // ── FPS counter ──
        setFpsCounter(prev => {
          const now   = Date.now()
          const delta = now - prev.ts
          if (delta >= 1000) {
            setFps(Math.round(prev.count * 1000 / delta))
            return { count: 1, ts: now }
          }
          return { count: prev.count + 1, ts: prev.ts }
        })

      } catch (e) {
        console.error('[WS] parse error', e)
      }
    }

    wsRef.current = ws
  }, [])

  const disconnectWS = useCallback(() => {
    wsRef.current?.close()
    wsRef.current = null
    setConnected(false)
  }, [])

  // ── Camera helpers ────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'environment' },
        audio: false,
      })
      if (!videoRef.current) return
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      setActive(true)
      startSendLoop()
    } catch (err) {
      console.error('Camera access denied:', err)
      alert('Không thể truy cập camera. Hãy cho phép quyền camera trong trình duyệt.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop())
      videoRef.current.srcObject = null
    }
    // Clear display canvas
    if (displayRef.current) {
      const ctx = displayRef.current.getContext('2d')
      ctx?.clearRect(0, 0, displayRef.current.width, displayRef.current.height)
    }
    setActive(false)
    setStreamResult(null)
    setFps(0)
    audioRef.current.pause()
  }, [])

  // ── Frame send loop ───────────────────────────────────────────────────

  const startSendLoop = useCallback(() => {
    const interval = 1000 / TARGET_FPS

    const tick = (ts) => {
      rafRef.current = requestAnimationFrame(tick)

      // Throttle to TARGET_FPS
      if (ts - lastSendRef.current < interval) return
      lastSendRef.current = ts

      const video  = videoRef.current
      const canvas = canvasRef.current
      const ws     = wsRef.current

      if (!video || !canvas || !ws || ws.readyState !== WebSocket.OPEN) return
      if (video.readyState < 2) return   // not enough data

      // Capture frame onto hidden canvas
      const ctx = canvas.getContext('2d')
      canvas.width  = video.videoWidth  || 640
      canvas.height = video.videoHeight || 480
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Send as JPEG blob
      canvas.toBlob(
        (blob) => {
          if (!blob) return
          blob.arrayBuffer().then((buf) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(buf)
            }
          })
        },
        'image/jpeg',
        0.75,
      )
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [])

  // ── Start / Stop ──────────────────────────────────────────────────────

  const handleStart = useCallback(async () => {
    connectWS()
    // Give WS 400ms to connect before starting camera
    await new Promise(r => setTimeout(r, 400))
    await startCamera()
  }, [connectWS, startCamera])

  const handleStop = useCallback(() => {
    stopCamera()
    disconnectWS()
  }, [stopCamera, disconnectWS])

  // ── Cleanup on unmount ────────────────────────────────────────────────

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current)
    wsRef.current?.close()
    videoRef.current?.srcObject?.getTracks().forEach(t => t.stop())
    audioRef.current.pause()
  }, [])

  // ── Render ────────────────────────────────────────────────────────────

  const level   = streamResult?.summary?.overall_level || 'LOW'
  const COLORS  = { LOW:'#00ff87', MEDIUM:'#ffb300', HIGH:'#ff6d00', CRITICAL:'#ff1744' }
  const color   = COLORS[level] || COLORS.LOW

  return (
    <div className="camera-stream">
      {/* Header row */}
      <div className="camera-header">
        <div className="slabel">📷 CAMERA STREAM</div>
        <div className={`ws-status ${connected ? 'on' : 'off'}`}>
          <span className="ws-dot" />
          {connected ? `Connected · ${fps} FPS` : 'Disconnected'}
        </div>
      </div>

      {/* Hidden elements */}
      <video  ref={videoRef}  muted playsInline style={{ display: 'none' }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Visible display canvas — shows annotated frames */}
      <div className="camera-view" style={{ position: 'relative', background: '#000', minHeight: 120 }}>
        <canvas
          ref={displayRef}
          style={{
            width: '100%',
            height: 'auto',
            display: active ? 'block' : 'none',
            borderRadius: 6,
          }}
        />
        {!active && (
          <div className="camera-placeholder">
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <rect x="2" y="10" width="40" height="26" rx="4" stroke="currentColor" strokeWidth="1.4"/>
              <circle cx="22" cy="23" r="7" stroke="currentColor" strokeWidth="1.4"/>
              <circle cx="22" cy="23" r="3" fill="currentColor" opacity=".35"/>
              <path d="M14 10l3-5h10l3 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <span>Camera chưa bật</span>
          </div>
        )}

        {/* Live danger level overlay */}
        {active && streamResult && (
          <div style={{
            position: 'absolute', top: 6, right: 6,
            padding: '3px 9px',
            background: 'rgba(0,0,0,0.75)',
            border: `1px solid ${color}`,
            borderRadius: 12,
            color: color,
            fontFamily: 'Orbitron, monospace',
            fontSize: '0.55rem',
            letterSpacing: '0.12em',
            fontWeight: 700,
          }}>
            {level}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="camera-controls">
        {!active ? (
          <button className="cam-btn start" onClick={handleStart}>
            ▶ Bắt đầu Camera
          </button>
        ) : (
          <button className="cam-btn stop" onClick={handleStop}>
            ■ Dừng Camera
          </button>
        )}
      </div>

      {/* Live results */}
      {streamResult?.objects?.length > 0 && (
        <div className="stream-results">
          <div className="slabel" style={{ marginBottom: 6 }}>
            KẾT QUẢ · {streamResult.objects.length} VẬT THỂ
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {streamResult.objects.slice(0, 3).map((obj, i) => (
              <ObjectCard key={obj.id || i} obj={obj} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Warning text */}
      {streamResult?.summary?.primary_warning && (
        <div style={{
          padding: '8px 12px',
          background: `${color}14`,
          border: `1px solid ${color}44`,
          borderRadius: 7,
          color: color,
          fontSize: '0.72rem',
          lineHeight: 1.4,
        }}>
          {streamResult.summary.primary_warning}
        </div>
      )}
    </div>
  )
}