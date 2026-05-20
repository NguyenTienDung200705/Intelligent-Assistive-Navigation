# 🎯 SmartNav — Smart Navigation & Danger Detection System

> Hệ thống AI đa mô hình phát hiện nguy hiểm thời gian thực  
> **YOLO26 (WOTR) · ByteTrack · MiDaS · FastAPI · React · TTS Tiếng Việt**

---

## 📌 Tổng quan

SmartNav là hệ thống hỗ trợ điều hướng thông minh sử dụng Computer Vision kết hợp:

| Module | Công nghệ | Chức năng |
|--------|-----------|-----------|
| **Object Detection** | YOLO26 (fine-tune WOTR) | Phát hiện người, xe cộ, chướng ngại vật |
| **Multi-Object Tracking** | ByteTrack | Gán ID & theo dõi xuyên frame |
| **Depth Estimation** | MiDaS (monocular) | Ước lượng khoảng cách không cần stereo cam |
| **Danger Analysis** | Fusion Engine | Tổng hợp & đánh giá mức nguy hiểm |
| **Voice Alert** | gTTS / eSpeak | Cảnh báo giọng nói tiếng Việt |
| **Backend** | FastAPI + WebSocket | API xử lý ảnh/video + streaming |
| **Frontend** | React + Vite | UI cyberpunk dark theme |

---

## 🏗️ Kiến trúc hệ thống

```
                    ┌─────────────────────┐
                    │  Image / Video / Cam │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Parallel AI       │
                    │   Processing        │
                    └──────┬──────┬───────┘
                           │      │
                    ┌──────▼──┐  ┌▼──────────┐
                    │ YOLO26  │  │   MiDaS   │
                    │Detector │  │   Depth   │
                    └──────┬──┘  └──────┬────┘
                           │            │
                    ┌──────▼────────────▼────┐
                    │    ByteTrack Tracker   │
                    └──────────┬─────────────┘
                               │
                    ┌──────────▼─────────────┐
                    │    Fusion Pipeline     │
                    └──────────┬─────────────┘
                               │
                    ┌──────────▼─────────────┐
                    │    Danger Analyzer     │
                    └──────┬─────────────────┘
                           │
                  ┌────────▼────────┐
                  │  Text-to-Speech │
                  └────────┬────────┘
                           │
              ┌────────────▼────────────┐
              │   React Frontend + API  │
              └─────────────────────────┘
```

---

## 📁 Cấu trúc thư mục

```
smart-navigation/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app + lifespan
│   │   ├── config.py        # Cấu hình hệ thống
│   │   ├── pipeline.py      # Pipeline tổng hợp
│   │   └── routes/
│   │       ├── image_routes.py   # POST /upload/image
│   │       ├── video_routes.py   # POST /upload/video
│   │       ├── audio_routes.py   # GET /audio/{file}
│   │       └── stream_routes.py  # WS /ws/stream
│   ├── modules/
│   │   ├── detector/
│   │   │   └── yolo_detector.py  # YOLO26 wrapper
│   │   ├── tracker/
│   │   │   └── bytetrack.py      # SimpleTracker (ByteTrack-style)
│   │   ├── depth/
│   │   │   ├── depth_estimator.py  # MiDaS wrapper
│   │   │   └── distance_utils.py   # Score → distance label
│   │   ├── danger/
│   │   │   ├── danger_analyzer.py  # Fusion + scoring
│   │   │   └── rules.py            # Configurable weights
│   │   ├── speech/
│   │   │   ├── tts_engine.py       # Multi-backend TTS
│   │   │   └── audio_generator.py  # Cache helper
│   │   └── utils/
│   │       ├── drawing.py          # OpenCV annotations
│   │       ├── geometry.py         # bbox utilities
│   │       ├── image_utils.py      # image I/O
│   │       ├── video_utils.py      # video I/O
│   │       └── logger.py           # logging setup
│   ├── models/
│   │   ├── yolo/yolo26.pt    ← ĐẶT MODEL YOLO26 TẠI ĐÂY
│   │   └── depth/midas.pt    ← (tùy chọn)
│   ├── tests/
│   │   └── test_pipeline.py  # 17 unit tests
│   ├── requirements.txt
│   ├── run.py
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Root component
│   │   ├── App.css           # Cyberpunk dark theme
│   │   ├── components/
│   │   │   ├── UploadZone.jsx
│   │   │   ├── RadarPanel.jsx
│   │   │   ├── DangerMeter.jsx
│   │   │   ├── ObjectCard.jsx
│   │   │   ├── AudioPlayer.jsx
│   │   │   ├── ImageViewer.jsx
│   │   │   ├── WarningCard.jsx
│   │   │   └── CameraStream.jsx
│   │   ├── hooks/
│   │   │   ├── useProcessing.js
│   │   │   ├── useAudio.js
│   │   │   └── useWebSocket.js
│   │   └── utils/
│   │       └── api.js
│   ├── package.json
│   ├── vite.config.js
│   └── .env.example
│
├── setup.sh          # Cài đặt tự động
├── start.sh          # Khởi động tất cả services
├── docker-compose.yml
└── README.md
```

---

## 🚀 Cài đặt & Chạy

### Yêu cầu

| Phần mềm | Phiên bản |
|----------|-----------|
| Python   | 3.10+     |
| Node.js  | 18+       |
| CUDA     | 12.x (nếu dùng GPU) |
| RAM      | 8GB+ (16GB khuyến nghị) |
| GPU      | RTX 3060+ (khuyến nghị) |

### Bước 1 — Clone & Setup

```bash
git clone https://github.com/your-repo/smart-navigation.git
cd smart-navigation
bash setup.sh
```

### Bước 2 — Đặt model YOLO26

```bash
cp /path/to/your/yolo26.pt backend/models/yolo/yolo26.pt
```

### Bước 3 — Khởi động

```bash
bash start.sh
```

Hoặc chạy riêng:

```bash
# Terminal 1 — Backend
cd backend
source venv/bin/activate
python run.py

# Terminal 2 — Frontend
cd frontend
npm run dev
```

### Bước 4 — Truy cập

| URL | Mô tả |
|-----|-------|
| http://localhost:5173 | Giao diện chính |
| http://localhost:8000/docs | Swagger API docs |
| ws://localhost:8000/ws/stream | WebSocket streaming |

---

## 📡 API Reference

### POST `/upload/image`

Upload ảnh để phân tích.

**Request:** `multipart/form-data` với field `file`

**Response:**
```json
{
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
      "warning_text": "⚡ Chú ý! Phát hiện ô tô ở khoảng cách gần đang tiến về phía bạn"
    }
  ],
  "summary": {
    "overall_level": "HIGH",
    "overall_color": "#ff6d00",
    "primary_warning": "⚡ Có phương tiện đang tiến nhanh phía trước",
    "tts_text": "Cảnh báo nguy hiểm...",
    "object_count": 1,
    "critical_count": 0,
    "high_count": 1
  },
  "audio_file": "tts_abc123.mp3",
  "annotated_image": "abc_detected.jpg",
  "depth_image": "abc_depth.jpg",
  "processing_time_ms": 54.2,
  "frame_size": {"width": 1920, "height": 1080}
}
```

### POST `/upload/video`

Upload video để xử lý từng frame.

### GET `/audio/{filename}`

Lấy file audio TTS.

### GET `/image/{filename}` / `/video/{filename}`

Lấy kết quả annotated media.

### WS `/ws/stream`

WebSocket cho streaming real-time. Client gửi raw JPEG bytes, server trả JSON result.

---

## ⚙️ Danger Scoring Formula

```
Danger Score =
  0.40 × object_weight      (truck=1.0, car=0.8, person=0.55...)
+ 0.30 × distance_weight    (very_close=1.0, close=0.75, medium=0.45...)
+ 0.20 × speed_score        (fast=1.0, medium=0.6, slow=0.3...)
+ 0.10 × direction_modifier (approaching=1.0, stationary=0.5, receding=0.25)
```

| Score | Level | Màu |
|-------|-------|-----|
| 0.00–0.30 | LOW | 🟢 #00ff87 |
| 0.30–0.55 | MEDIUM | 🟡 #ffb300 |
| 0.55–0.78 | HIGH | 🟠 #ff6d00 |
| 0.78–1.00 | CRITICAL | 🔴 #ff1744 |

---

## 🐳 Docker

```bash
# Build và chạy toàn bộ stack
docker-compose up --build

# Chỉ backend
docker-compose up backend

# Chỉ frontend
docker-compose up frontend
```

---

## 🧪 Tests

```bash
cd backend
source venv/bin/activate
python -m pytest tests/ -v
```

17 unit tests covering: geometry, depth, danger analysis, tracker, image utils.

---

## 🔧 Cấu hình

Chỉnh sửa `backend/app/config.py` hoặc file `.env`:

| Biến | Mặc định | Mô tả |
|------|----------|-------|
| `CONFIDENCE_THRESHOLD` | 0.45 | Ngưỡng confidence YOLO |
| `IOU_THRESHOLD` | 0.45 | Ngưỡng IOU cho NMS |
| `IMAGE_SIZE` | 640 | Kích thước input YOLO |
| `FRAME_SKIP` | 2 | Bỏ qua mỗi N frame (video) |
| `TTS_LANG` | vi | Ngôn ngữ TTS |

---

## 🚧 Giới hạn hiện tại

- Depth estimation MiDaS chỉ cho khoảng cách tương đối (không phải tuyệt đối)
- Real-time camera streaming ~5 FPS (phụ thuộc phần cứng)
- Chất lượng TTS offline (eSpeak) thấp hơn online (gTTS)
- Video xử lý nặng với độ phân giải cao (>1080p)

---

## 🔮 Cải tiến tương lai

- [ ] ByteTrack chính thức (thay SimpleTracker)
- [ ] Stereo camera support → depth tuyệt đối
- [ ] GPS integration → outdoor navigation
- [ ] Lane detection & traffic sign recognition
- [ ] Edge AI optimization (Jetson Nano, Coral TPU)
- [ ] Voice interaction (STT + TTS dialog)
- [ ] Mobile app (React Native)

---

## 📄 License

MIT License — Free for personal and commercial use.

---

*Built with ❤️ — YOLO26 WOTR Dataset Fine-tune*