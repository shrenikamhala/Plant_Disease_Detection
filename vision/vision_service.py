from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import numpy as np
import io
import json
import os
from tensorflow.keras.models import load_model

app = Flask(__name__)

# ── Fix: Allow ALL origins so browser can reach this from localhost:5173 ──────
CORS(app)

print("Vision server starting on http://localhost:4000 ...")

# ── Load model ────────────────────────────────────────────────────────────────
MODEL_PATH        = "plant_disease_model.h5"
CLASS_INDEX_PATH  = "class_indices.json"

if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"Model not found: {MODEL_PATH}. Run train_model.py first.")

if not os.path.exists(CLASS_INDEX_PATH):
    raise FileNotFoundError(f"class_indices.json not found. Run train_model.py first.")

try:
    model = load_model(MODEL_PATH)
except Exception as e:
    print("Model loading failed:", e)
    model = None
with open(CLASS_INDEX_PATH) as f:
    class_indices = json.load(f)

# Reverse mapping  {0: 'Potato___Early_blight', 1: 'Tomato___...'}
inv_map = {v: k for k, v in class_indices.items()}

# Advice per disease
DISEASE_ADVICE = {
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus": "Use resistant varieties and control whitefly populations with insecticides or sticky traps. Remove and destroy infected plants.",
    "Potato___Early_blight":                  "Apply fungicide (e.g., chlorothalonil) and avoid overwatering. Remove infected lower leaves and practice crop rotation.",
}
DEFAULT_ADVICE = "Consult a plant specialist or local agricultural extension office for treatment advice."


def preprocess_image(image_bytes: bytes) -> np.ndarray:
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize((128, 128))
    img_array = np.array(img, dtype=np.float32) / 255.0
    return np.expand_dims(img_array, axis=0)   # shape (1, 128, 128, 3)


@app.route('/')
def home():
    return jsonify({"status": "Vision API running", "port": 4000})


@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "vision running", "port": 4000, "classes": list(inv_map.values())})


@app.route('/predict', methods=['POST', 'OPTIONS'])
def predict():
    # Handle preflight CORS request from browser
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin',  '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        return response, 200

    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded. Send a multipart/form-data request with key 'file'."}), 400

    file_data = request.files['file']

    try:
        img_bytes = file_data.read()
        img       = preprocess_image(img_bytes)
    except Exception as e:
        return jsonify({"error": f"Could not read image: {str(e)}"}), 400

    try:
        prediction = model.predict(img)
        class_idx  = int(np.argmax(prediction[0]))
        confidence = float(np.max(prediction[0]))
        disease    = inv_map.get(class_idx, "Unknown")
        advice     = DISEASE_ADVICE.get(disease, DEFAULT_ADVICE)
    except Exception as e:
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500

    return jsonify({
        "disease":    disease,
        "confidence": confidence,
        "advice":     advice,
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=4000, debug=True)
