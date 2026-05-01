"""
vision_service.py — Plant Disease Vision API
=============================================
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import numpy as np
import io, json, os
from tensorflow.keras.models import load_model

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

MODEL_PATH       = "plant_disease_model.h5"
CLASS_INDEX_PATH = "class_indices.json"
IMG_SIZE         = 224        # must match train_model.py
THRESHOLD        = 0.50       # below this → uncertain

for p in [MODEL_PATH, CLASS_INDEX_PATH]:
    if not os.path.exists(p):
        raise FileNotFoundError(f"❌ {p} not found. Run train_model.py first.")

model = load_model(MODEL_PATH)
with open(CLASS_INDEX_PATH) as f:
    class_indices = json.load(f)

inv_map = {v: k for k, v in class_indices.items()}
print(f"✅ Vision server ready | {len(inv_map)} classes: {list(inv_map.values())}")

# ── Full disease database ──────────────────────────────────────────────────────
def normalize(s):
    return s.lower().replace("___","__").replace(" ","_")

DISEASE_DB = {}

entries = [
    ("potato__early_blight", {
        "display": "Potato — Early Blight",
        "status":  "moderate",
        "advice":  "Apply copper-based or chlorothalonil fungicide every 7-10 days. Remove infected lower leaves immediately. Use drip irrigation — keep foliage dry. Rotate crops annually to break disease cycle.",
    }),
    ("potato__late_blight", {
        "display": "Potato — Late Blight",
        "status":  "severe",
        "advice":  "URGENT: Late Blight can destroy crops in 10 days. Apply metalaxyl or mancozeb fungicide immediately. Remove and bag ALL infected material — do not compost. Improve drainage and air circulation.",
    }),
    ("potato__healthy", {
        "display": "Potato — Healthy ✓",
        "status":  "healthy",
        "advice":  "Your potato plant looks healthy! Water consistently at the base, ensure good drainage, and monitor weekly for early disease symptoms. Apply preventive fungicide during humid weather.",
    }),
    ("tomato__tomato_yellow_leaf_curl_virus", {
        "display": "Tomato — Yellow Leaf Curl Virus",
        "status":  "severe",
        "advice":  "No cure — remove and destroy infected plants immediately. Control whitefly vectors using yellow sticky traps and neem oil spray. Use reflective silver mulch. Plant TYLCV-resistant varieties next season.",
    }),
    ("tomato__early_blight", {
        "display": "Tomato — Early Blight",
        "status":  "moderate",
        "advice":  "Remove infected leaves. Apply mancozeb or copper fungicide every 7-10 days. Water at soil level only. Space plants 60cm apart for airflow. Stake plants to keep leaves off ground.",
    }),
    ("tomato__late_blight", {
        "display": "Tomato — Late Blight",
        "status":  "severe",
        "advice":  "Serious disease — apply systemic fungicide immediately. Remove all visibly infected tissue. Avoid wetting foliage. Improve drainage. Monitor neighbouring plants closely for spread.",
    }),
    ("tomato__healthy", {
        "display": "Tomato — Healthy ✓",
        "status":  "healthy",
        "advice":  "Your tomato plant looks healthy! Maintain consistent watering at the base, use mulch, stake plants well, and check weekly for any early disease symptoms.",
    }),
    ("tomato__bacterial_spot", {
        "display": "Tomato — Bacterial Spot",
        "status":  "moderate",
        "advice":  "Apply copper-based bactericide weekly during wet weather. Remove infected plant material. Avoid overhead irrigation. Use certified disease-free seeds. Disinfect tools between plants.",
    }),
    ("corn_(maize)__common_rust_", {
        "display": "Corn — Common Rust",
        "status":  "mild",
        "advice":  "Apply propiconazole fungicide if rust appears before tasseling. Plant resistant corn hybrids for next season. Early planting helps crops mature before rust pressure peaks.",
    }),
    ("corn_(maize)__healthy", {
        "display": "Corn — Healthy ✓",
        "status":  "healthy",
        "advice":  "Your corn plant looks healthy! Ensure adequate nitrogen fertilisation, consistent watering, and monitor for pest damage on leaves and silk.",
    }),
]

for key, val in entries:
    DISEASE_DB[key] = val

DEFAULT  = {"display":"Unknown Condition",       "status":"moderate","advice":"Could not match to database. Consult your local agricultural extension office."}
UNCERTAIN= {"display":"Uncertain — Low Confidence","status":"mild","advice":"AI confidence is low. Please retake the photo: use a single leaf, natural lighting, close-up focus on affected area, no blurring."}


def preprocess(image_bytes):
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize((IMG_SIZE, IMG_SIZE), Image.LANCZOS)
    arr = np.array(img, dtype=np.float32) / 255.0
    return np.expand_dims(arr, axis=0)


@app.route('/')
def home():
    return jsonify({"status": "Vision API", "port": 4000, "classes": list(inv_map.values())})

@app.route('/health')
def health():
    return jsonify({"status": "ok", "classes": list(inv_map.values()), "threshold": THRESHOLD})

@app.route('/predict', methods=['POST', 'OPTIONS'])
def predict():
    if request.method == 'OPTIONS':
        res = jsonify({'status': 'ok'})
        res.headers.add('Access-Control-Allow-Origin',  '*')
        res.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        res.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        return res, 200

    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded."}), 400

    try:
        img = preprocess(request.files['file'].read())
    except Exception as e:
        return jsonify({"error": f"Image error: {e}"}), 400

    try:
        preds      = model.predict(img, verbose=0)
        class_idx  = int(np.argmax(preds[0]))
        confidence = float(np.max(preds[0]))
        all_probs  = {inv_map[i]: round(float(p), 4) for i, p in enumerate(preds[0])}
        print(f"\n🔍 {all_probs}\n   Top: {inv_map.get(class_idx)} ({confidence*100:.1f}%)")
    except Exception as e:
        return jsonify({"error": f"Prediction error: {e}"}), 500

    if confidence < THRESHOLD:
        return jsonify({"disease":"Uncertain","display":UNCERTAIN["display"],
                        "confidence":confidence,"status":UNCERTAIN["status"],
                        "advice":UNCERTAIN["advice"],"all_probs":all_probs})

    raw_key = inv_map.get(class_idx, "Unknown")
    info    = DISEASE_DB.get(normalize(raw_key), DEFAULT)

    return jsonify({"disease":raw_key,"display":info["display"],
                    "confidence":confidence,"status":info["status"],
                    "advice":info["advice"],"all_probs":all_probs})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=4000, debug=True)