# KrishiMitra 🌿

Plant AI is a full-stack AI-powered agricultural assistant that helps users detect plant diseases from leaf images and receive treatment recommendations instantly.
The platform combines **computer vision**, **natural language processing**, and a **modern interactive frontend** to deliver a complete plant-care assistant for farmers, researchers, and plant enthusiasts.

---

## 🚀 Key Features

* **AI Disease Detection**

  * Upload plant leaf images for instant disease prediction
  * Detects multiple diseases across different crops
  * Provides confidence score and probability breakdown

* **Treatment Recommendation Engine**

  * Suggests disease-specific treatment and care advice
  * Includes severity/health status classification

* **Plant AI Chat Assistant**

  * Ask plant-care questions in natural language
  * TF-IDF based FAQ retrieval chatbot
  * Supports voice input/output interaction

* **Modern Interactive UI**

  * Animated landing page with hero video
  * Floating AI assistant widget
  * Real-time typing indicators and speech synthesis
  * Drag & drop image upload

---

## 🧠 Tech Stack

### Frontend

* **React 19**
* **TypeScript**
* **Vite**
* **Tailwind CSS**
* **Lucide React Icons**

### Backend

* **Python**
* **Flask**
* **REST APIs**

### AI / ML

* **TensorFlow / Keras**
* **MobileNetV2**
* **TF-IDF Vectorization**
* **Scikit-learn**

---

## 🏗️ Project Architecture

```bash
PlantProject/
│
├── chatbot/                    # Flask Chatbot Service (Port 5001)
│   ├── chat_service.py         # TF-IDF chatbot API
│   └── plant_faq.csv           # 80+ Q&A database
│
├── vision/                     # Flask Vision Service (Port 4000)
│   ├── vision_service.py       # Disease prediction API
│   ├── train_model.py          # MobileNetV2 training script
│   ├── prepare_dataset.py      # Dataset balancing script
│   ├── plant_disease_model.h5  # Trained model
│   ├── class_indices.json      # Class mapping
│   └── dataset/                # Balanced training dataset
│
├── frontend/                   # React Frontend (Port 5173)
│   ├── src/
│   │   ├── App.tsx             # Main Application UI
│   │   ├── main.tsx            # Entry Point
│   │   └── index.css           # Global Styles
│   ├── public/
│   │   └── crop.mp4            # Hero Background Video
│   ├── package.json
│   └── vite.config.ts
│
└── venv/                       # Python Virtual Environment
```

---

## 🔍 Supported Plant Classes

### Potato

* Early Blight
* Late Blight
* Healthy

### Tomato

* Early Blight
* Late Blight
* Healthy
* Yellow Leaf Curl Virus
* Bacterial Spot

### Corn (Maize)

* Common Rust
* Healthy

---

## ⚙️ System Workflow

1. User uploads plant leaf image
2. Frontend sends image to Vision API
3. MobileNetV2 model predicts disease
4. Backend returns:

   * Predicted disease
   * Confidence score
   * Probability distribution
   * Treatment advice
5. User can ask follow-up questions to Plant AI Chatbot

---

## 📊 Machine Learning Pipeline

### Image Classification Model

* **Architecture:** MobileNetV2 Transfer Learning
* **Framework:** TensorFlow / Keras
* **Dataset Balancing:** Custom preprocessing pipeline
* **Output:** Multi-class disease classification

### Chatbot Model

* **Method:** TF-IDF Similarity Matching
* **Knowledge Base:** 80+ Plant FAQ Entries
* **Response Type:** Retrieval-Based

---

## 🌐 API Services

### Vision Service

**Base URL:** `http://localhost:4000`

| Endpoint   | Method | Description                      |
| ---------- | ------ | -------------------------------- |
| `/predict` | POST   | Predict plant disease from image |

---

### Chatbot Service

**Base URL:** `http://localhost:5001`

| Endpoint  | Method | Description                |
| --------- | ------ | -------------------------- |
| `/chat`   | POST   | Standard chatbot response  |
| `/stream` | GET    | Streaming chatbot response |

---

## 🖥️ Local Setup Instructions

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd PlantProject
```

---

### 2. Backend Setup

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

---

### 3. Start Vision Service

```bash
cd vision
python vision_service.py
```

---

### 4. Start Chatbot Service

```bash
cd chatbot
python chat_service.py
```

---

### 5. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 📈 Future Enhancements

* Support for additional crop species
* Multilingual chatbot support
* Weather-aware disease recommendations
* Fertilizer recommendation engine
* User plant health history dashboard
* Cloud deployment for public access

---

## 🎯 Use Cases

* Smart Agriculture Platforms
* Farmer Assistance Tools
* Plant Disease Research
* Agricultural Education
* Home Gardening Assistants

---

## 👩‍💻 Developed By

**Shrenika Mhala**
B.Tech Engineering Student
AI/ML & Full Stack Developer

---

## 📄 License

This project is intended for educational and research purposes.

---
