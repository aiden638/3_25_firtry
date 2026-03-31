# Flatfoot Analysis Web App

이 프로젝트는 발 사진을 분석하여 평발 여부를 진단하고 특징점(거골점, 종골점, 하지축)을 시각화하는 웹 애플리케이션입니다.

## 기술 스택
- **Backend**: FastAPI, OpenCV, Scikit-learn, Rembg, Joblib
- **Frontend**: Vite + React, Vanilla CSS (Premium Dark Theme)

## 시작하기

### 1. 백엔드 실행
```bash
cd backend
pip install -r requirements.txt
python main.py
```

### 2. 프론트엔드 실행
```bash
cd frontend
npm install
npm run dev
```
flatfoot_webapp에서
git add .
git commit -m "메세지"
git push


## 주요 기능
- **자동 배경 제거**: `rembg`를 활용하여 발 영역만 정밀하게 추출합니다.
- **특징점 추출**: 거골점(Talus), 종골점(Calcaneus), 하지축(Leg Axis)을 자동으로 탐지합니다.
- **AI 분석**: 학습된 SVM 모델을 통해 평발 확률(%)을 계산합니다.
- **시각화**: 분석된 특징점을 이미지 위에 오버레이하여 보여줍니다.
