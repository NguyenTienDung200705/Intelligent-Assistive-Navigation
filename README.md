# SmartNav — Smart Navigation & Danger Detection System

> Hệ thống AI đa mô hình phát hiện nguy hiểm thời gian thực  
> **YOLO26 (WOTR) · ByteTrack · MiDaS · FastAPI · React · TTS Tiếng Việt**

---

## Tổng quan

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

## Kiến trúc hệ thống

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
## Cài đặt & Chạy

### Bước 1 — Clone & Setup

```bash
git clone https://github.com/NguyenTienDung200705/Intelligent-Assistive-Navigation.git
```

### Bước 2 — Khởi động

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