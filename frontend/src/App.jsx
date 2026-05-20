import React, { useState, useCallback, useEffect, useRef } from 'react'
import { AppProvider, useApp }  from './context/AppContext'
import { useProcessing }        from './hooks/useProcessing'
import { useAudio }             from './hooks/useAudio'
import UploadZone               from './components/UploadZone'
import RadarPanel               from './components/RadarPanel'
import DangerMeter              from './components/DangerMeter'
import ObjectCard               from './components/ObjectCard'
import AudioPlayer              from './components/AudioPlayer'
import ImageViewer              from './components/ImageViewer'
import WarningCard              from './components/WarningCard'
import CameraStream             from './components/CameraStream'
import SessionStats             from './components/SessionStats'
import ExportButton             from './components/ExportButton'
import HistoryPage              from './pages/HistoryPage'
import SettingsPage             from './pages/SettingsPage'
import ApiDocsPage              from './pages/ApiDocsPage'
import './App.css'

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────────────────────── */
const PAGES = [
  { id: 'main',     icon: 'M', label: 'Phân Tích'  },
  { id: 'history',  icon: 'H', label: 'Lịch Sử'   },
  { id: 'settings', icon: 'S', label: 'Cài Đặt'   },
  { id: 'api',      icon: 'A', label: 'API'        },
]

const LEVEL = {
  LOW:      { label: 'AN TOÀN',   color: '#00ff87', dim: 'rgba(0,255,135,0.12)',  glow: '0 0 30px rgba(0,255,135,0.35)',   ring: 'rgba(0,255,135,0.25)' },
  MEDIUM:   { label: 'CHÚ Ý',     color: '#ffb300', dim: 'rgba(255,179,0,0.12)',  glow: '0 0 30px rgba(255,179,0,0.35)',   ring: 'rgba(255,179,0,0.25)' },
  HIGH:     { label: 'NGUY HIỂM', color: '#ff6d00', dim: 'rgba(255,109,0,0.14)', glow: '0 0 35px rgba(255,109,0,0.4)',   ring: 'rgba(255,109,0,0.28)' },
  CRITICAL: { label: 'KHẨN CẤP',  color: '#ff1744', dim: 'rgba(255,23,68,0.16)', glow: '0 0 40px rgba(255,23,68,0.45)',  ring: 'rgba(255,23,68,0.35)' },
}

/* ─────────────────────────────────────────────────────────────────────────────
   ROOT
───────────────────────────────────────────────────────────────────────────── */
export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   SHELL
───────────────────────────────────────────────────────────────────────────── */
function Shell() {
  const { activePage, setActivePage, addToHistory, settings } = useApp()
  const { result, loading, error, progress, processFile }     = useProcessing()
  const { beep }                                              = useAudio()

  const [inputPreview, setInputPreview] = useState(null)
  const [inputKind,    setInputKind]    = useState('image')   // 'image' | 'video'
  const [filename,     setFilename]     = useState('')
  const [sideTab,      setSideTab]      = useState('upload')  // 'upload' | 'camera'

  const level    = result?.summary?.overall_level || 'LOW'
  const lvlCfg   = LEVEL[level] || LEVEL.LOW
  const objects  = result?.objects  || []
  const critical = objects.filter(o => o.danger_level === 'CRITICAL').length
  const high     = objects.filter(o => o.danger_level === 'HIGH').length
  const topScore = objects[0]?.danger_score ?? 0

  // On new result: save history + beep
  useEffect(() => {
    if (!result) return
    addToHistory(result, filename, inputKind)
    if (settings?.beepAlert !== false) beep(level)
  }, [result]) // eslint-disable-line

  const handleFile = useCallback((file) => {
    const url  = URL.createObjectURL(file)
    const kind = file.type.startsWith('video') ? 'video' : 'image'
    setInputPreview(url)
    setInputKind(kind)
    setFilename(file.name)
    processFile(file)
  }, [processFile])

  const isMain = activePage === 'main'

  return (
    <div className="app" data-level={level}>
      {/* ── decorative layers ── */}
      <div className="bg-grid"    aria-hidden />
      <div className="bg-scan"    aria-hidden />
      <div className="bg-vignette" aria-hidden />

      {/* ────────────── HEADER ────────────── */}
      <header className="header">
        <AppLogo />

        <nav className="nav" role="navigation" aria-label="Main navigation">
          {PAGES.map(p => (
            <NavButton
              key={p.id}
              page={p}
              active={activePage === p.id}
              onClick={() => setActivePage(p.id)}
            />
          ))}
        </nav>

        <div className="header-end">
          {isMain && result && (
            <LevelChip level={level} cfg={lvlCfg} critical={critical} high={high} />
          )}
          <SystemBadges />
        </div>
      </header>

      {/* ────────────── SECONDARY PAGES ────────────── */}
      {activePage === 'history'  && <HistoryPage />}
      {activePage === 'settings' && <SettingsPage />}
      {activePage === 'api'      && <ApiDocsPage />}

      {/* ────────────── MAIN PAGE ────────────── */}
      {isMain && (
        <div className="workspace">

          {/* ── LEFT SIDEBAR ── */}
          <aside className="sidebar sidebar-left">

            {/* side-tab switcher */}
            <div className="side-tabs">
              <SideTab id="upload" current={sideTab} icon="⬆" label="Upload"  onClick={setSideTab} />
              <SideTab id="camera" current={sideTab} icon="◎" label="Camera"  onClick={setSideTab} />
            </div>

            {sideTab === 'upload' ? (
              <>
                <Label>INPUT</Label>
                <UploadZone onFile={handleFile} loading={loading} progress={progress} />

                {error && <ErrorBanner msg={error} />}

                {result && (
                  <>
                    <Label>RADAR ANALYSIS</Label>
                    <RadarPanel level={level} />

                    <DangerMeter score={topScore} level={level} />

                    <Label>AUDIO ALERT · TTS VI</Label>
                    <AudioPlayer
                      audioFile={result.audio_file}
                      level={level}
                      autoPlay={settings?.autoPlay !== false}
                    />

                    <div className="metric-grid">
                      <Metric n={objects.length}    l="VẬT THỂ"    />
                      <Metric n={critical}           l="KHẨN CẤP"   v="crit" />
                      <Metric n={high}               l="NGUY HIỂM"  v="high" />
                      <Metric
                        n={result.processing_time_ms != null ? `${result.processing_time_ms}ms` : '—'}
                        l="XỬ LÝ"
                      />
                    </div>

                    <ExportButton result={result} filename={filename} />
                  </>
                )}

                <SessionStats />
              </>
            ) : (
              <CameraStream />
            )}
          </aside>

          {/* ── CENTER STAGE ── */}
          <main className="stage">
            {result ? (
              <>
                <ImageViewer result={result} inputFile={inputPreview} inputMode={inputKind} />
                <WarningCard summary={result.summary} />
              </>
            ) : loading ? (
              <LoadingStage progress={progress} />
            ) : (
              <WelcomeStage />
            )}
          </main>

          {/* ── RIGHT SIDEBAR ── */}
          <aside className="sidebar sidebar-right">
            <Label>
              PHÁT HIỆN{objects.length > 0 ? ` (${objects.length})` : ''}
            </Label>

            <div className="obj-scroll">
              {objects.length === 0 ? (
                <EmptyObjects hasResult={!!result} />
              ) : (
                objects.map((o, i) => (
                  <ObjectCard key={`${o.id}-${i}`} obj={o} index={i} />
                ))
              )}
            </div>
          </aside>

        </div>
      )}

      {/* ────────────── FOOTER ────────────── */}
      <footer className="footer">
        <span className="footer-brand">SmartNav v1.0</span>
        <span className="footer-dot" />
        <span>YOLO26 · ByteTrack · MiDaS · TTS-VI · FastAPI · React 18</span>
        <span className="footer-dot" />
        <span className="footer-tests">17 Tests ✓</span>
      </footer>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   SMALL MOLECULES
───────────────────────────────────────────────────────────────────────────── */

function NavButton({ page, active, onClick }) {
  const icons = {
    M: <SvgScan />,
    H: <SvgClock />,
    S: <SvgGear />,
    A: <SvgBolt />,
  }
  return (
    <button
      className={`nav-btn${active ? ' active' : ''}`}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
    >
      <span className="nav-btn-icon">{icons[page.icon]}</span>
      <span className="nav-btn-label">{page.label}</span>
    </button>
  )
}

function AppLogo() {
  return (
    <div className="logo">
      <div className="logo-orb">
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
          <circle cx="15" cy="15" r="13" stroke="#00e5ff" strokeWidth="1.5"/>
          <circle cx="15" cy="15" r="6"  stroke="#00e5ff" strokeWidth="1" strokeDasharray="2.5 2.5"/>
          <circle cx="15" cy="15" r="2.5" fill="#00e5ff"/>
          <line x1="15" y1="2"  x2="15" y2="8"  stroke="#00e5ff" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="15" y1="22" x2="15" y2="28" stroke="#00e5ff" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="2"  y1="15" x2="8"  y2="15" stroke="#00e5ff" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="22" y1="15" x2="28" y2="15" stroke="#00e5ff" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <div className="logo-text">
        <span className="logo-name">SMARTNAV</span>
        <span className="logo-sub">DANGER DETECTION · WOTR</span>
      </div>
    </div>
  )
}

function LevelChip({ level, cfg, critical, high }) {
  return (
    <div className="level-chip" style={{ '--chip-color': cfg.color, '--chip-glow': cfg.glow, '--chip-ring': cfg.ring }}>
      <span className="chip-dot" />
      <span className="chip-text">{cfg.label}</span>
      {critical > 0 && <span className="chip-badge red">{critical}×CRIT</span>}
      {high     > 0 && <span className="chip-badge orange">{high}×HIGH</span>}
    </div>
  )
}

function SystemBadges() {
  const items = ['YOLO26', 'MiDaS', 'Track', 'TTS']
  return (
    <div className="sys-badges">
      {items.map(s => (
        <div key={s} className="sys-badge">
          <span className="sys-led" />
          <span>{s}</span>
        </div>
      ))}
    </div>
  )
}

function SideTab({ id, current, icon, label, onClick }) {
  return (
    <button
      className={`side-tab${current === id ? ' active' : ''}`}
      onClick={() => onClick(id)}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

function Label({ children }) {
  return <div className="section-label">{children}</div>
}

function Metric({ n, l, v }) {
  return (
    <div className={`metric${v ? ` metric-${v}` : ''}`}>
      <div className="metric-value">{n}</div>
      <div className="metric-label">{l}</div>
    </div>
  )
}

function ErrorBanner({ msg }) {
  return (
    <div className="error-banner" role="alert">
      <span className="error-icon">⚠</span>
      <span>{msg}</span>
    </div>
  )
}

function EmptyObjects({ hasResult }) {
  return (
    <div className="obj-empty">
      <div className="obj-empty-icon">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 3" opacity=".4"/>
          <circle cx="20" cy="20" r="8"  stroke="currentColor" strokeWidth="1"   strokeDasharray="2 2" opacity=".3"/>
          <circle cx="20" cy="20" r="2"  fill="currentColor" opacity=".4"/>
        </svg>
      </div>
      <p className="obj-empty-text">
        {hasResult
          ? 'Không phát hiện vật thể nguy hiểm'
          : 'Tải ảnh hoặc video để bắt đầu phân tích'}
      </p>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   WELCOME STAGE
───────────────────────────────────────────────────────────────────────────── */
const FEATURES = [
  { icon: '◈', title: 'Object Detection',   desc: 'YOLO26 fine-tune WOTR Dataset · confidence threshold 0.45' },
  { icon: '◎', title: 'Multi-Object Track', desc: 'ByteTrack — persistent ID xuyên frame, phân tích hướng/tốc độ' },
  { icon: '◌', title: 'Depth Estimation',   desc: 'MiDaS monocular — không cần stereo camera, ước lượng relative depth' },
  { icon: '⚡', title: 'Danger Analysis',   desc: 'Fusion scoring: 40% object + 30% distance + 20% speed + 10% direction' },
  { icon: '♫', title: 'Voice Alert',        desc: 'Text-to-Speech tiếng Việt tự nhiên — gTTS online + eSpeak offline' },
  { icon: '⟳', title: 'Live Stream',        desc: 'WebSocket camera pipeline ~5 FPS · annotated frames realtime' },
]

function WelcomeStage() {
  return (
    <div className="welcome">
      {/* animated radar */}
      <div className="welcome-radar" aria-hidden>
        {[0,1,2,3].map(i => (
          <div key={i} className="wr-ring" style={{ '--i': i }} />
        ))}
        <div className="wr-sweep" />
        <div className="wr-cross">
          <div className="wr-h" /><div className="wr-v" />
        </div>
        <div className="wr-dot" />
        <div className="wr-label">AI</div>
      </div>

      <h1 className="welcome-title">SMART NAVIGATION</h1>
      <p  className="welcome-sub">Hệ thống phát hiện nguy hiểm đa mô hình · Near real-time</p>

      <div className="welcome-features">
        {FEATURES.map(f => (
          <div key={f.title} className="feat-card">
            <span className="feat-icon">{f.icon}</span>
            <div className="feat-body">
              <div className="feat-title">{f.title}</div>
              <div className="feat-desc">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="welcome-hint">
        <span className="hint-arrow">←</span>
        Upload ảnh / video hoặc dùng camera để bắt đầu phân tích
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   LOADING STAGE
───────────────────────────────────────────────────────────────────────────── */
const STEPS = [
  'YOLO26 Object Detection',
  'ByteTrack ID Assignment',
  'MiDaS Depth Estimation',
  'Fusion Danger Analysis',
  'TTS Audio Synthesis',
]

function LoadingStage({ progress }) {
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setActiveStep(s => Math.min(s + 1, STEPS.length - 1)), 900)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="loading-stage">
      {/* pulsing orb */}
      <div className="load-orb" aria-hidden>
        <div className="orb-ring or1" />
        <div className="orb-ring or2" />
        <div className="orb-ring or3" />
        <div className="orb-spinner" />
        <div className="orb-core" />
      </div>

      <div className="load-title">Đang xử lý AI...</div>

      <div className="load-steps">
        {STEPS.map((s, i) => (
          <div
            key={i}
            className={`load-step${i <= activeStep ? ' done' : ''}${i === activeStep ? ' current' : ''}`}
            style={{ '--delay': `${i * 0.12}s` }}
          >
            <div className="step-indicator">
              {i < activeStep
                ? <SvgCheck />
                : i === activeStep
                ? <div className="step-spin" />
                : <div className="step-pending" />}
            </div>
            <span>{s}</span>
          </div>
        ))}
      </div>

      {progress > 0 && (
        <div className="load-progress">
          <div className="lp-track">
            <div className="lp-fill" style={{ width: `${Math.min(progress, 99)}%` }} />
            <div className="lp-glow" style={{ left: `${Math.min(progress, 99)}%` }} />
          </div>
          <span className="lp-pct">{Math.min(progress, 99)}%</span>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   SVG ICONS
───────────────────────────────────────────────────────────────────────────── */
function SvgScan() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="7.5" cy="7.5" r="6"/>
      <circle cx="7.5" cy="7.5" r="2.5" fill="currentColor" stroke="none" opacity=".6"/>
      <line x1="7.5" y1="1.5" x2="7.5" y2="3.5"/>
      <line x1="7.5" y1="11.5" x2="7.5" y2="13.5"/>
      <line x1="1.5" y1="7.5" x2="3.5" y2="7.5"/>
      <line x1="11.5" y1="7.5" x2="13.5" y2="7.5"/>
    </svg>
  )
}
function SvgClock() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="7.5" cy="7.5" r="6"/>
      <polyline points="7.5,4 7.5,8 10,9.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function SvgGear() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3">
      <circle cx="7.5" cy="7.5" r="2.2"/>
      <path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M2.6 2.6l1.1 1.1M11.3 11.3l1.1 1.1M11.3 3.7 10.2 4.8M3.8 10.2l-1.1 1.1" strokeLinecap="round"/>
    </svg>
  )
}
function SvgBolt() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4">
      <polyline points="9,1.5 5,8 8.5,8 6,13.5 11,6.5 7,6.5" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  )
}
function SvgCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#00ff87" strokeWidth="2">
      <polyline points="2,6 5,9 10,3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
