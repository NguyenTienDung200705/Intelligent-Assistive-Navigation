import React, { useRef, useEffect, useState } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'
import ObjectCard from './ObjectCard'

export default function CameraStream({ onResult }) {
  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const [active, setActive] = useState(false)
  const { connected, streaming, streamResult, connect, disconnect, startCameraStream, stopCamera } = useWebSocket()

  useEffect(() => {
    if (streamResult && onResult) onResult(streamResult)
  }, [streamResult])

  const handleStart = async () => {
    connect()
    // Wait briefly for WS to open
    await new Promise(r => setTimeout(r, 300))
    await startCameraStream(videoRef.current, canvasRef.current)
    setActive(true)
  }

  const handleStop = () => {
    stopCamera()
    disconnect()
    setActive(false)
  }

  return (
    <div className="camera-stream">
      <div className="camera-header">
        <div className="slabel">📷 CAMERA STREAM — REAL-TIME</div>
        <div className={`ws-status ${connected ? 'on' : 'off'}`}>
          <span className="ws-dot" />
          {connected ? 'WebSocket Connected' : 'Disconnected'}
        </div>
      </div>

      <div className="camera-view">
        <video ref={videoRef} muted playsInline className="camera-video" style={{ display: active ? 'block' : 'none' }} />
        <canvas ref={canvasRef} width={640} height={480} style={{ display: 'none' }} />
        {!active && (
          <div className="camera-placeholder">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="4" y="12" width="40" height="28" rx="4" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="24" cy="26" r="8" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="24" cy="26" r="3" fill="currentColor" opacity=".4"/>
              <path d="M16 12l3-5h10l3 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <p>Camera chưa bật</p>
          </div>
        )}
      </div>

      <div className="camera-controls">
        {!active ? (
          <button className="cam-btn start" onClick={handleStart}>
            ▶ Bắt đầu Stream
          </button>
        ) : (
          <button className="cam-btn stop" onClick={handleStop}>
            ■ Dừng Stream
          </button>
        )}
      </div>

      {streamResult?.objects?.length > 0 && (
        <div className="stream-results">
          <div className="slabel">KẾT QUẢ REAL-TIME</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            {streamResult.objects.slice(0, 3).map((obj, i) => (
              <ObjectCard key={obj.id || i} obj={obj} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
