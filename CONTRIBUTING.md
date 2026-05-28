# Contributing to SmartNav 🚀

Cảm ơn bạn đã quan tâm tới việc đóng góp cho **SmartNav — Smart Navigation & Danger Detection System**.

SmartNav là hệ thống AI hỗ trợ điều hướng thông minh sử dụng Computer Vision kết hợp nhiều mô hình như:

- YOLO26 (WOTR fine-tuned)
- ByteTrack
- MiDaS Depth Estimation
- FastAPI + WebSocket
- React + Vite
- Vietnamese Text-to-Speech (TTS)

Mục tiêu của project là xây dựng một hệ thống có khả năng:

- Detect obstacles in real-time
- Estimate relative depth
- Analyze danger levels
- Generate voice alerts
- Support assistive navigation

---

# Code of Conduct

Khi tham gia đóng góp cho project, vui lòng:

- Be respectful
- Keep discussions constructive
- Không toxic hoặc công kích cá nhân
- Tôn trọng coding style của project
- Help beginners when possible

SmartNav welcomes contributors of all levels ❤️

---

# Project Philosophy

## 1. Real-time First

SmartNav được xây dựng theo hướng real-time AI system.

Ưu tiên:

- Low latency
- Stable streaming
- Fast inference
- Responsive UI
- Smooth camera processing

Nếu contribution ảnh hưởng tới FPS hoặc latency, hãy benchmark trước trước khi merge.

---

## 2. Modular Architecture

Mỗi module nên hoạt động độc lập để dễ maintain và replace.

| Module | Responsibility |
|--------|----------------|
| Detector | Object detection |
| Tracker | Multi-object tracking |
| Depth | Distance estimation |
| Fusion | Combine AI outputs |
| Analyzer | Danger scoring |
| TTS | Voice warning |

Avoid tightly-coupled logic whenever possible.

---

## 3. Accessibility-Oriented

Project hướng tới assistive navigation nên cần:

- Reliable detections
- Clear warnings
- Low latency
- Easy deployment
- Voice interaction support

---

# Ways to Contribute

Bạn có thể contribute theo nhiều hướng khác nhau.

## AI / Deep Learning

- Improve YOLO accuracy
- Add segmentation
- Improve tracking stability
- Add trajectory prediction
- Optimize MiDaS inference
- Add temporal depth smoothing

---

## Backend

- Improve FastAPI performance
- Optimize WebSocket streaming
- Reduce memory usage
- Improve async processing
- Better logging system

---

## Frontend

- Improve cyberpunk UI
- Better responsive layout
- Improve rendering performance
- Improve streaming UX
- Accessibility improvements

---

## DevOps

- Docker optimization
- CI/CD pipeline
- GPU deployment
- Edge AI deployment
- Kubernetes support

---

## Documentation

- Improve README
- Add tutorials
- Add benchmark docs
- Create architecture diagrams

---

# Development Setup

## 1. Clone Repository

```bash
git clone https://github.com/NguyenTienDung200705/Intelligent-Assistive-Navigation.git

cd Intelligent-Assistive-Navigation
```

---

## 2. Backend Setup (Windows)

Di chuyển vào backend:

```bash
cd backend
```

Tạo virtual environment:

```bash
python -m venv venv
```

Activate virtual environment:

```bash
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

---

## 3. Frontend Setup

Di chuyển vào frontend:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

---

## 4. Run Development Server

### Backend

```bash
cd backend

venv\Scripts\activate

python run.py
```

---

### Frontend

```bash
cd frontend

npm run dev
```

---

# Project Structure

```bash
SmartNav/
│
├── backend/
│   ├── app/
│   ├── modules/
│   ├── services/
│   ├── routes/
│   ├── utils/
│   ├── models/
│   └── run.py
│
├── frontend/
│   ├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── assets/
│
├── tests/
├── docker/
├── docs/
└── README.md
```

---

# Branch Naming Convention

Please use meaningful branch names.

## Feature

```bash
feature/add-danger-history
```

## Fix

```bash
fix/websocket-reconnect
```

## Docs

```bash
docs/update-install-guide
```

## Refactor

```bash
refactor/tracker-pipeline
```

---

# Commit Convention

Format:

```bash
type(scope): short description
```

Ví dụ:

```bash
feat(detector): add YOLO26 inference pipeline

fix(frontend): resolve webcam streaming bug

docs(readme): update docker section

refactor(tracker): simplify tracking logic
```

---

# Coding Standards

## Python Style

- Follow PEP8
- Use type hints
- Keep functions modular
- Avoid giant classes
- Prefer async for IO tasks

Ví dụ:

```python
async def process_frame(frame):
    results = detector.detect(frame)
    return results
```

---

## React Style

- Use functional components
- Prefer hooks
- Keep components reusable
- Avoid unnecessary re-renders

Ví dụ:

```jsx
export default function DangerCard({ level }) {
  return (
    <div className="danger-card">
      {level}
    </div>
  )
}
```

---

# Backend Guidelines

## API Design

API nên:

- Predictable
- Consistent
- RESTful
- Easy to debug

Ví dụ response:

```json
{
  "success": true,
  "danger_level": "HIGH",
  "objects": []
}
```

---

## WebSocket Rules

Khi xử lý streaming:

- Avoid blocking operations
- Use async processing
- Release resources properly
- Prevent memory leaks

---

## Logging

Use structured logs whenever possible.

Ví dụ:

```python
logger.info("Frame processed", extra={
    "fps": fps,
    "detections": len(objects)
})
```

---

# Frontend Guidelines

SmartNav sử dụng cyberpunk dark theme.

Please maintain:

- Smooth animations
- Good contrast
- Responsive layouts
- Real-time feel

Avoid:

- Heavy re-renders
- Huge component files
- Excessive animations

---

# AI / Model Contribution

## Detection Models

Nếu thêm YOLO model mới, vui lòng include:

- Training config
- Dataset information
- FPS benchmark
- Accuracy metrics

---

## Tracking

Nếu modify tracker:

- Explain tracking logic
- Measure ID switch rate
- Benchmark FPS impact

---

## Depth Estimation

For depth models:

- Explain calibration
- Compare latency
- Provide visual results

---

# Pull Request Process

## Before Opening PR

Please ensure:

- Code runs correctly
- Documentation updated
- No unnecessary files
- No large temporary files

---

## PR Title Format

```bash
[Feature] Add trajectory prediction
```

---

## PR Template

```md
# Description

Explain your changes.

# Type of Change

- [ ] Feature
- [ ] Bug Fix
- [ ] Refactor
- [ ] Documentation
- [ ] Performance Improvement

# Testing

How was this tested?

# Screenshots / Videos

(Optional)

# Checklist

- [ ] Code formatted
- [ ] Tests pass
- [ ] Docs updated
```

---

# Issue Guidelines

Khi report bug, vui lòng include:

- OS
- Python version
- GPU information
- Error logs
- Reproduction steps

Ví dụ:

```md
# Bug Description

WebSocket disconnects after several minutes.

# Steps to Reproduce

1. Start backend
2. Open webcam stream
3. Wait several minutes

# Expected

Stable connection

# Actual

Socket disconnected
```

---

# Performance Guidelines

SmartNav là real-time system nên performance rất quan trọng.

Please consider:

- Batch inference
- GPU acceleration
- Frame skipping
- Async pipeline
- Memory reuse

Avoid:

- Blocking loops
- Heavy synchronous operations
- Excessive logging

---

# Docker Development

## Build Full Stack

```bash
docker-compose up --build
```

---

## Backend Only

```bash
docker-compose up backend
```

---

## Frontend Only

```bash
docker-compose up frontend
```

---

# Documentation Rules

Documentation should be:

- Beginner-friendly
- Technically accurate
- Easy to reproduce

Nếu thay đổi:

- API
- Config
- Model pipeline
- Setup flow

=> hãy update docs tương ứng.

---

# Future Contribution Ideas

Contributors are welcome to work on:

- Official ByteTrack integration
- Stereo depth estimation
- GPS navigation
- Lane detection
- Traffic sign recognition
- Voice interaction (STT + TTS)
- Mobile app
- Jetson Nano optimization
- Coral TPU deployment

---

# Final Notes ❤️

Mọi contribution đều có giá trị:

- Bug fixes
- UI improvements
- AI optimization
- Better documentation
- Performance tuning
- Model training

Thank you for helping build a smarter & more accessible navigation system 🚀