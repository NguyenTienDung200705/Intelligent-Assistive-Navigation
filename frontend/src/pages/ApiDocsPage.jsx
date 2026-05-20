import React, { useState } from 'react'

const ENDPOINTS = [
  {
    method: 'POST',
    path: '/upload/image',
    desc: 'Upload ảnh để phân tích. Trả về detection, depth, danger level và audio TTS.',
    body: 'multipart/form-data — field: file (image/jpeg, image/png, image/webp)',
    response: `{
  "objects": [
    {
      "id": 1,
      "class_name": "car",
      "label_vi": "ô tô",
      "confidence": 0.95,
      "bbox": [100, 150, 400, 350],
      "distance_label": "gần",
      "distance_key": "close",
      "direction": "approaching",
      "speed_label": "di chuyển nhanh",
      "danger_level": "HIGH",
      "danger_score": 0.72,
      "danger_color": "#ff6d00",
      "warning_text": "⚡ Chú ý! Phát hiện ô tô ở khoảng cách gần"
    }
  ],
  "summary": {
    "overall_level": "HIGH",
    "overall_color": "#ff6d00",
    "primary_warning": "⚡ Nguy hiểm! Ô tô tiến nhanh phía trước",
    "tts_text": "Cảnh báo nguy hiểm...",
    "object_count": 1,
    "critical_count": 0,
    "high_count": 1
  },
  "audio_file": "tts_abc123.mp3",
  "annotated_image": "abc_detected.jpg",
  "depth_image": "abc_depth.jpg",
  "processing_time_ms": 54.2,
  "frame_size": { "width": 1920, "height": 1080 }
}`,
  },
  {
    method: 'POST',
    path: '/upload/video',
    desc: 'Upload video để xử lý từng frame. Trả về video annotated và summary tổng hợp.',
    body: 'multipart/form-data — field: file (video/mp4, video/avi, video/mov)',
    response: `{
  "objects": [...],
  "summary": { "overall_level": "CRITICAL", ... },
  "audio_file": "tts_xyz.mp3",
  "output_video": "abc_detected.mp4",
  "total_frames": 150,
  "processed_frames": 75,
  "processing_time_ms": 4500.0
}`,
  },
  {
    method: 'GET',
    path: '/progress/{file_id}',
    desc: 'Lấy tiến độ xử lý video (0-100).',
    body: '—',
    response: `{ "progress": 67 }`,
  },
  {
    method: 'GET',
    path: '/audio/{filename}',
    desc: 'Tải file audio TTS đã tạo.',
    body: '—',
    response: 'Binary audio/mpeg stream',
  },
  {
    method: 'GET',
    path: '/image/{filename}',
    desc: 'Tải ảnh annotated hoặc depth map.',
    body: '—',
    response: 'Binary image/jpeg stream',
  },
  {
    method: 'GET',
    path: '/video/{filename}',
    desc: 'Tải video annotated.',
    body: '—',
    response: 'Binary video/mp4 stream',
  },
  {
    method: 'WS',
    path: '/ws/stream',
    desc: 'WebSocket cho streaming real-time. Client gửi raw JPEG bytes, server trả về JSON result.',
    body: 'Raw JPEG bytes (ArrayBuffer)',
    response: `{
  "objects": [...],
  "summary": { "overall_level": "HIGH", ... },
  "processing_time_ms": 45.0
}`,
  },
  {
    method: 'GET',
    path: '/health',
    desc: 'Kiểm tra trạng thái hệ thống và các model AI.',
    body: '—',
    response: `{
  "status": "ok",
  "service": "SmartNavigation API v1.0",
  "models": {
    "detector": "YOLO26 (WOTR fine-tune)",
    "tracker": "ByteTrack",
    "depth": "MiDaS Small",
    "tts": "gTTS Vietnamese"
  }
}`,
  },
]

const METHOD_COLOR = {
  GET:  '#00e5ff',
  POST: '#00ff87',
  WS:   '#ffb300',
}

export default function ApiDocsPage() {
  const [open, setOpen] = useState(null)

  return (
    <div className="page api-page">
      <div className="page-header">
        <div>
          <h2 className="page-title">API DOCUMENTATION</h2>
          <p className="page-sub">SmartNav REST API v1.0 — FastAPI + WebSocket</p>
        </div>
        <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" className="btn-ghost-sm">
          ↗ Swagger UI
        </a>
      </div>

      <div className="api-base">
        <span className="api-base-label">BASE URL</span>
        <code className="api-base-url">http://localhost:8000</code>
        <span className="api-base-label" style={{ marginLeft: '20px' }}>WEBSOCKET</span>
        <code className="api-base-url">ws://localhost:8000</code>
      </div>

      {/* Danger scoring formula */}
      <div className="api-formula">
        <div className="api-formula-title">📐 DANGER SCORING FORMULA</div>
        <code className="formula-code">
          {`Score = 0.40 × object_weight
        + 0.30 × distance_weight
        + 0.20 × speed_score
        + 0.10 × direction_modifier

truck=1.0 | car=0.8 | motorcycle=0.75 | person=0.55
very_close=1.0 | close=0.75 | medium=0.45 | far=0.20
approaching=1.0 | stationary=0.5 | receding=0.25`}
        </code>
        <div className="api-levels">
          {[['0.00–0.30','LOW','#00ff87'],['0.30–0.55','MEDIUM','#ffb300'],['0.55–0.78','HIGH','#ff6d00'],['0.78–1.00','CRITICAL','#ff1744']].map(([r,l,c])=>(
            <div key={l} className="api-level-item">
              <span style={{width:10,height:10,borderRadius:'50%',background:c,display:'inline-block',marginRight:6,boxShadow:`0 0 5px ${c}`}}/>
              <span style={{color:c,fontFamily:'var(--font-display)',fontSize:'.6rem'}}>{l}</span>
              <span style={{marginLeft:6,color:'var(--text-secondary)',fontSize:'.62rem'}}>{r}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Endpoints */}
      <div className="api-list">
        {ENDPOINTS.map((ep, i) => (
          <div key={i} className={`api-item ${open === i ? 'open' : ''}`}>
            <div className="api-item-header" onClick={() => setOpen(open === i ? null : i)}>
              <span className="api-method" style={{ color: METHOD_COLOR[ep.method] || '#fff', borderColor: METHOD_COLOR[ep.method] + '44' }}>
                {ep.method}
              </span>
              <code className="api-path">{ep.path}</code>
              <span className="api-desc-short">{ep.desc.substring(0, 60)}{ep.desc.length > 60 ? '…' : ''}</span>
              <span className="api-chevron">{open === i ? '▲' : '▼'}</span>
            </div>
            {open === i && (
              <div className="api-item-body">
                <p className="api-full-desc">{ep.desc}</p>
                <div className="api-section">
                  <div className="api-section-label">REQUEST BODY</div>
                  <code className="api-code">{ep.body}</code>
                </div>
                <div className="api-section">
                  <div className="api-section-label">RESPONSE</div>
                  <pre className="api-pre">{ep.response}</pre>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
