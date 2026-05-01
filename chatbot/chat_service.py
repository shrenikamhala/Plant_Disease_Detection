import os
import pandas as pd
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from groq import Groq
from dotenv import load_dotenv
import time

# Load .env file — looks one folder up (project root)
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

app = Flask(__name__)
CORS(app, supports_credentials=True)

print("✅ PlantBot server running on http://localhost:5001")

# =========================
# GROQ CLIENT SETUP
# =========================
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    print("❌ ERROR: GROQ_API_KEY not found in .env file!")
else:
    print(f"🔑 API Key loaded: {GROQ_API_KEY[:15]}... (length: {len(GROQ_API_KEY)})")

client = Groq(api_key=GROQ_API_KEY)

# =========================
# LOAD YOUR CSV
# =========================
df = pd.read_csv(
    os.path.join(os.path.dirname(__file__), "plant_faq.csv"),
    on_bad_lines='skip',
    encoding='utf-8'
)

print(f"📂 Loaded {len(df)} questions from plant_faq.csv")

# =========================
# TF-IDF SETUP
# =========================
def preprocess(text):
    return str(text).lower().strip()

vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words='english')
preprocessed_questions = df['question'].apply(preprocess)
faq_vectors = vectorizer.fit_transform(preprocessed_questions)

# =========================
# GROQ SYSTEM PROMPT
# =========================
SYSTEM_PROMPT = """You are PlantBot, an expert plant disease assistant for farmers and gardeners.

You ONLY answer questions about:
- Plant diseases: early blight, late blight, powdery mildew, bacterial spot, rust, viral infections, root rot
- Crops: tomato, potato, corn and general vegetables
- Treatments: fungicide, neem oil, copper spray, mancozeb, bactericide
- Farming: watering, soil, fertilizer, crop rotation, pest control, plant revival
- Saving or reviving sick or dying plants

Rules:
- Keep answers short and practical (3-5 sentences max)
- Use simple farmer-friendly language
- Give actionable step-by-step advice when asked how to fix something
- If asked anything NOT related to plants, farming, or gardening, say exactly:
  "I can only help with plant diseases and crop care. Please ask me about your plants!"
- Never make up diseases or treatments you are not sure about
- Always be helpful and encouraging to the farmer"""

# =========================
# AMBIGUOUS WORDS — go straight to Groq AI
# These words cause wrong CSV matches so we skip CSV for them
# =========================
AMBIGUOUS_TRIGGERS = [
    "save", "dying", "help my", "fix my", "revive", "rescue",
    "not growing", "wilting badly", "almost dead", "looks sick",
    "suddenly", "overnight", "emergency", "urgent", "falling off",
    "dropping", "rotting", "mushy", "smells", "weird", "strange",
    "turning", "gone wrong", "what happened", "why is my",
    "fuzzy", "white stuff", "found", "spots on", "patches",
    "cure", "red plant",
]

# =========================
# CHECK CSV FIRST
# =========================
def check_csv(user_query):
    query = preprocess(user_query)

    # ── Greetings ──
    if query in ["hi", "hello", "hey", "hii", "helo", "hii there", "hi there"]:
        return "Hello! 🌱 I'm PlantBot. Ask me anything about plant diseases or crop care!"

    if "thank" in query:
        return "You're welcome! Happy to help with your plants. 🌿"

    if query in ["bye", "goodbye", "see you", "ok bye"]:
        return "Goodbye! 🌿 Take good care of your plants!"

    # ── Skip CSV for ambiguous questions — send to Groq AI instead ──
    for trigger in AMBIGUOUS_TRIGGERS:
        if trigger in query:
            print(f"⚡ Ambiguous trigger '{trigger}' found → sending to Groq AI")
            return None  # Skip CSV entirely

    # ── TF-IDF matching ──
    query_vector = vectorizer.transform([query])
    similarity = cosine_similarity(query_vector, faq_vectors).flatten()
    best_index = similarity.argmax()
    score = similarity[best_index]

    print(f"📊 CSV Score: {score:.3f} | Query: {user_query}")

    # FIXED: Lowered threshold from 0.45 to 0.38
    # to catch more natural phrasings like "what is potato early blight"
    if score >= 0.38:
        print(f"✅ CSV match found: {df.iloc[best_index]['question']}")
        return df.iloc[best_index]['answer']

    print(f"🤖 Score too low ({score:.3f}) → sending to Groq AI")
    return None


# =========================
# ROUTE 1: Normal (non-streaming) — kept for testing/fallback
# =========================
@app.route('/ask', methods=['POST'])
def ask():
    data = request.get_json(force=True)
    user_query = data.get("query", "").strip()

    if not user_query:
        return jsonify({"error": "No query provided"}), 400

    # Try CSV first
    csv_answer = check_csv(user_query)
    if csv_answer:
        return jsonify({"answer": csv_answer, "source": "csv"})

    # Use Groq AI
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_query}
            ],
            model="llama-3.1-8b-instant",
            max_tokens=300,
            temperature=0.4,
        )
        answer = chat_completion.choices[0].message.content
        return jsonify({"answer": answer, "source": "groq_ai"})
    except Exception as e:
        print(f"❌ Groq error: {type(e).__name__}: {e}")
        return jsonify({"error": str(e)}), 500


# =========================
# ROUTE 2: Streaming — REALTIME word by word ✅
# =========================
@app.route('/ask-stream', methods=['GET'])
def ask_stream():
    user_query = request.args.get("query", "").strip()

    if not user_query:
        return Response("data: [DONE]\n\n", mimetype='text/event-stream')

    # Try CSV first — stream it word by word
    csv_answer = check_csv(user_query)
    if csv_answer:
        print(f"📖 Streaming CSV answer for: {user_query}")
        def stream_csv():
            for word in csv_answer.split(" "):
                yield f"data: {word} \n\n"
                time.sleep(0.04)
            yield "data: [DONE]\n\n"
        return Response(
            stream_csv(),
            mimetype='text/event-stream',
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
        )

    # Stream Groq AI response live
    print(f"🤖 Streaming Groq AI answer for: {user_query}")
    def stream_groq():
        try:
            stream = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_query}
                ],
                model="llama-3.1-8b-instant",
                max_tokens=300,
                temperature=0.4,
                stream=True,
            )
            for chunk in stream:
                token = chunk.choices[0].delta.content
                if token:
                    yield f"data: {token}\n\n"
        except Exception as e:
            print(f"❌ Groq streaming error: {type(e).__name__}: {e}")
            yield f"data: Sorry, an error occurred: {type(e).__name__}\n\n"
        yield "data: [DONE]\n\n"

    return Response(
        stream_groq(),
        mimetype='text/event-stream',
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )


# =========================
# ROUTE 3: Health check
# =========================
@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "PlantBot running",
        "port": 5001,
        "csv_questions": len(df),
        "groq_model": "llama-3.1-8b-instant"
    })


# =========================
# RUN
# =========================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)