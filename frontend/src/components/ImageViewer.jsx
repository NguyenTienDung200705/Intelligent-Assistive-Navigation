import React, { useState, useRef, useEffect } from 'react'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Always use the dedicated /video/ endpoint (supports HTTP Range)
const getVideoUrl  = (f) => f ? `${BASE}/video/${f}`   : null
const getImageUrl  = (f) => f ? `${BASE}/image/${f}`   : null
const getOutputUrl = (f) => f ? `${BASE}/outputs/${f}` : null

const TABS = [
  { key: 'detected', label: 'KẾT QUẢ DETECTION' },
  { key: 'depth',    label: 'DEPTH MAP'          },
  { key: 'original', label: 'ẢNH / VIDEO GỐC'   },
]

const LEVEL_COLOR = {
  LOW:      '#00ff87',
  MEDIUM:   '#ffb300',
  HIGH:     '#ff6d00',
  CRITICAL: '#ff1744',
}

export default function ImageViewer({ result, inputFile, inputMode = 'image' }) {
  const [tab, setTab]       = useState('detected')
  const videoRef            = useRef(null)
  const isVideo             = inputMode === 'video'
  const level               = result?.summary?.overall_level || 'LOW'
  const color               = LEVEL_COLOR[level] || LEVEL_COLOR.LOW

  // When a new video result arrives, switch to 'detected' tab automatically
  useEffect(() => {
    if (result?.output_video) {
      setTab('detected')
    }
  }, [result?.output_video])

  const outputVideoUrl = result?.output_video    ? getVideoUrl(result.output_video)    : null
  const annotatedImgUrl= result?.annotated_image ? getImageUrl(result.annotated_image) : null
  const depthImgUrl    = result?.depth_image     ? getImageUrl(result.depth_image)     : null

  return (
    <div className="image-viewer">
      {/* ── Tabs ── */}
      <div className="viewer-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`tab-btn${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Frame ── */}
      <div
        className="viewer-frame"
        style={{ borderColor: `${color}55`, boxShadow: `0 0 28px ${color}22` }}
      >
        {['tl','tr','bl','br'].map(pos => (
          <div key={pos} className={`vcorner ${pos}`} style={{ borderColor: color }} />
        ))}

        <div className="viewer-content">

          {/* KẾT QUẢ DETECTION */}
          {tab === 'detected' && (
            <>
              {/* VIDEO OUTPUT with bounding boxes */}
              {isVideo && outputVideoUrl ? (
                <VideoPlayer key={outputVideoUrl} src={outputVideoUrl} />
              ) : !isVideo && annotatedImgUrl ? (
                <img src={annotatedImgUrl} alt="Detection result" className="viewer-img" />
              ) : (
                <Empty text="Đang xử lý..." />
              )}
            </>
          )}

          {/* DEPTH MAP */}
          {tab === 'depth' && (
            depthImgUrl
              ? <img src={depthImgUrl} alt="Depth map" className="viewer-img" />
              : <Empty text="Depth map chỉ có với ảnh tĩnh" />
          )}

          {/* ORIGINAL */}
          {tab === 'original' && (
            inputFile
              ? isVideo
                ? <video src={inputFile} controls className="viewer-img" style={{ maxHeight: 480 }} />
                : <img src={inputFile} alt="Original" className="viewer-img" />
              : <Empty text="Chưa có file gốc" />
          )}
        </div>

        {/* ── HUD ── */}
        <div className="viewer-hud">
          <span>
            {result?.frame_size
              ? `${result.frame_size.width}×${result.frame_size.height}`
              : result?.video_info
              ? `${result.video_info.width}×${result.video_info.height} · ${(result.video_info.fps || 0).toFixed(0)}fps`
              : '—'}
          </span>
          <span style={{ color }}>{level}</span>
          <span>
            {result?.processing_time_ms
              ? `${result.processing_time_ms}ms`
              : result?.total_frames
              ? `${result.total_frames} frames`
              : '—'}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ── VideoPlayer ─────────────────────────────────────────────────────────── */
function VideoPlayer({ src }) {
  const ref    = useRef(null)
  const [err, setErr] = useState(false)

  useEffect(() => {
    setErr(false)
    if (ref.current) {
      ref.current.load()   // force reload when src changes
    }
  }, [src])

  if (err) {
    return (
      <div style={{
        display:'flex', flexDirection:'column', alignItems:'center',
        justifyContent:'center', gap:12, padding:40,
        color:'var(--t-muted)', fontFamily:'var(--font-mono)', fontSize:'0.7rem',
        textAlign:'center',
      }}>
        <span style={{ fontSize:'2rem' }}>⚠</span>
        <span>Không thể phát video trong trình duyệt.</span>
        <span style={{ fontSize:'0.6rem', opacity:0.6 }}>
          Nguyên nhân: ffmpeg chưa cài hoặc codec không hỗ trợ.
        </span>
        <a
          href={src}
          download
          style={{
            marginTop:8, padding:'6px 16px',
            background:'rgba(0,229,255,0.1)',
            border:'1px solid rgba(0,229,255,0.3)',
            borderRadius:6, color:'var(--cyan)',
            fontFamily:'var(--font-mono)', fontSize:'0.62rem',
            cursor:'pointer',
          }}
        >
          ⬇ Tải video về máy
        </a>
      </div>
    )
  }

  return (
    <video
      ref={ref}
      controls
      autoPlay={false}
      preload="auto"
      playsInline
      className="viewer-img"
      style={{ maxHeight: 480, width: '100%', display: 'block' }}
      onError={() => setErr(true)}
    >
      <source src={src} type="video/mp4" />
      Trình duyệt không hỗ trợ video.
    </video>
  )
}

function Empty({ text }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'center',
      height:200, width:'100%',
      color:'var(--t-muted)', fontFamily:'var(--font-mono)', fontSize:'0.7rem',
    }}>
      {text}
    </div>
  )
}
