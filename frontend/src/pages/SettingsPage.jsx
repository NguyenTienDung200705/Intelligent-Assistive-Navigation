import React from 'react'
import { useApp } from '../context/AppContext'

function Toggle({ label, desc, value, onChange }) {
  return (
    <div className="setting-row">
      <div className="setting-info">
        <div className="setting-label">{label}</div>
        {desc && <div className="setting-desc">{desc}</div>}
      </div>
      <div className={`toggle ${value ? 'on' : ''}`} onClick={() => onChange(!value)}>
        <div className="toggle-knob" />
      </div>
    </div>
  )
}

function Slider({ label, desc, value, min, max, step, unit, onChange }) {
  return (
    <div className="setting-row col">
      <div className="setting-info">
        <div className="setting-label">{label} <span className="setting-val">{value}{unit}</span></div>
        {desc && <div className="setting-desc">{desc}</div>}
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="range-input"
      />
    </div>
  )
}

function Select({ label, desc, value, options, onChange }) {
  return (
    <div className="setting-row">
      <div className="setting-info">
        <div className="setting-label">{label}</div>
        {desc && <div className="setting-desc">{desc}</div>}
      </div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="setting-select"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

export default function SettingsPage() {
  const { settings, updateSettings } = useApp()
  const s = settings

  return (
    <div className="page settings-page">
      <div className="page-header">
        <div>
          <h2 className="page-title">CÀI ĐẶT HỆ THỐNG</h2>
          <p className="page-sub">Điều chỉnh thông số AI và giao diện</p>
        </div>
        <button className="btn-ghost-sm" onClick={() => updateSettings({
          autoPlay: true, beepAlert: true, showDepthOverlay: false,
          frameSkip: 2, confidenceMin: 0.45, language: 'vi', dangerThreshold: 'MEDIUM',
        })}>
          ↺ Reset mặc định
        </button>
      </div>

      <div className="settings-grid">
        {/* AUDIO */}
        <div className="setting-section">
          <div className="setting-section-title">🔊 AUDIO & CẢNH BÁO</div>
          <Toggle
            label="Tự động phát cảnh báo"
            desc="Phát audio TTS tiếng Việt ngay khi có kết quả"
            value={s.autoPlay}
            onChange={v => updateSettings({ autoPlay: v })}
          />
          <Toggle
            label="Âm thanh beep"
            desc="Phát tiếng beep cảnh báo trước khi phát TTS"
            value={s.beepAlert}
            onChange={v => updateSettings({ beepAlert: v })}
          />
          <Select
            label="Ngôn ngữ TTS"
            desc="Ngôn ngữ văn bản chuyển giọng nói"
            value={s.language}
            options={[
              { value: 'vi', label: '🇻🇳 Tiếng Việt' },
              { value: 'en', label: '🇬🇧 English' },
            ]}
            onChange={v => updateSettings({ language: v })}
          />
        </div>

        {/* AI PARAMETERS */}
        <div className="setting-section">
          <div className="setting-section-title">🤖 THAM SỐ AI</div>
          <Slider
            label="Ngưỡng Confidence"
            desc="Chỉ hiển thị detection có confidence ≥ giá trị này"
            value={s.confidenceMin}
            min={0.1} max={0.9} step={0.05} unit=""
            onChange={v => updateSettings({ confidenceMin: v })}
          />
          <Slider
            label="Frame Skip (Video)"
            desc="Bỏ qua mỗi N frames khi xử lý video (tăng = nhanh hơn, ít chính xác hơn)"
            value={s.frameSkip}
            min={1} max={8} step={1} unit=" frame"
            onChange={v => updateSettings({ frameSkip: v })}
          />
          <Select
            label="Mức nguy hiểm tối thiểu"
            desc="Chỉ phát cảnh báo khi đạt mức nguy hiểm này trở lên"
            value={s.dangerThreshold}
            options={[
              { value: 'LOW',      label: '🟢 LOW — Cảnh báo tất cả'   },
              { value: 'MEDIUM',   label: '🟡 MEDIUM — Chú ý trở lên'   },
              { value: 'HIGH',     label: '🟠 HIGH — Nguy hiểm trở lên' },
              { value: 'CRITICAL', label: '🔴 CRITICAL — Khẩn cấp only' },
            ]}
            onChange={v => updateSettings({ dangerThreshold: v })}
          />
        </div>

        {/* DISPLAY */}
        <div className="setting-section">
          <div className="setting-section-title">🖥️ HIỂN THỊ</div>
          <Toggle
            label="Depth overlay"
            desc="Hiển thị lớp depth map bán trong suốt trên ảnh"
            value={s.showDepthOverlay}
            onChange={v => updateSettings({ showDepthOverlay: v })}
          />
        </div>

        {/* SYSTEM INFO */}
        <div className="setting-section">
          <div className="setting-section-title">ℹ️ THÔNG TIN HỆ THỐNG</div>
          <div className="info-grid">
            {[
              ['Version',     'SmartNav v1.0.0'],
              ['Detector',    'YOLO26 (WOTR fine-tune)'],
              ['Tracker',     'ByteTrack (SimpleTracker)'],
              ['Depth',       'MiDaS Small (monocular)'],
              ['TTS Engine',  'gTTS / eSpeak-ng fallback'],
              ['Backend',     'FastAPI + Uvicorn'],
              ['Frontend',    'React 18 + Vite 5'],
              ['WebSocket',   'ws://localhost:8000/ws/stream'],
            ].map(([k, v]) => (
              <div key={k} className="info-row">
                <span className="info-key">{k}</span>
                <span className="info-val">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
