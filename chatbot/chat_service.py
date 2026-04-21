import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

app = Flask(__name__)

# ── Fix: Allow ALL origins so browser can reach this from localhost:5173 ──────
CORS(app, supports_credentials=True)

print("Chatbot server starting on http://localhost:5001 ...")

# Load dataset
df = pd.read_csv("plant_faq.csv")

# Build TF-IDF vectors
vectorizer = TfidfVectorizer()
faq_vectors = vectorizer.fit_transform(df['question'])


def get_answer(user_query: str) -> str:
    query_vector = vectorizer.transform([user_query])
    similarity   = cosine_similarity(query_vector, faq_vectors).flatten()
    best_index   = similarity.argmax()
    score        = similarity[best_index]

    if score < 0.2:
        return "Sorry, I don't have information about that. Try asking about plant diseases, watering, or care tips."

    return df.iloc[best_index]['answer']


@app.route('/ask', methods=['POST'])
def ask():
    data = request.get_json(force=True)
    user_query = data.get("query", "").strip()

    if not user_query:
        return jsonify({"error": "No query provided"}), 400

    answer = get_answer(user_query)
    return jsonify({"answer": answer})

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "chatbot running", "port": 5001})


if __name__ == "__main__":
    # Changed to port 5001 to avoid conflict with Vite (5173) or other services
    app.run(host="0.0.0.0", port=5001, debug=True)
