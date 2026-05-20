import React, { useState, useRef } from 'react'

const ACCEPT = 'image/jpeg,image/png,image/webp,image/bmp,video/mp4,video/quicktime,video/x-msvideo,video/webm'

export default function UploadZone({ onFile, loading, progress = 0 }) {
  const [drag, setDrag] = useState(false)
  const inputRef = useRef()

  const handle = (file) => { if (file) onFile(file) }

  return (
    <div
      className={`upload-zone${drag ? ' drag' : ''}${loading ? ' processing' : ''}`}
      onDragOver={e => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]) }}
      onClick={() => !loading && inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept={ACCEPT} style={{ display: 'none' }}
        onChange={e => handle(e.target.files[0])} />

      {loading ? (
        <div className="up-loading-inner">
          <div className="spinner" />
          <div className="up-proc-label">Đang xử lý AI...</div>
          <div className="up-proc-sub">YOLO26 · ByteTrack · MiDaS đang phân tích</div>
          {progress > 0 && progress < 100 && (
            <div className="progress-bar-wrap">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
              <span className="progress-pct">{progress}%</span>
            </div>
          )}
        </div>
      ) : (
        <div className="up-idle-inner">
          <div className="up-icon">
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
              <circle cx="26" cy="26" r="24" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4"/>
              <path d="M26 16v14M19 23l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 36h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".5"/>
            </svg>
          </div>
          <p className="up-title">Kéo thả hoặc click để tải lên</p>
          <p className="up-hint">Hỗ trợ ảnh (JPG · PNG · WEBP) và video (MP4 · MOV · AVI)</p>
          <div className="up-tags">
            {['YOLO26','ByteTrack','MiDaS','TTS-VI'].map(t => <span key={t}>{t}</span>)}
          </div>
        </div>
      )}
    </div>
  )
}
