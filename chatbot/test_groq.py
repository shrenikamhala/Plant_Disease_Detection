from dotenv import load_dotenv
import os
from groq import Groq

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

key = os.getenv('GROQ_API_KEY')
print(f'Key found: {key}')
print(f'Key length: {len(key) if key else 0}')

try:
    client = Groq(api_key=key)
    response = client.chat.completions.create(
        messages=[{'role': 'user', 'content': 'say hello'}],
        model='llama3-8b-8192',
        max_tokens=50
    )
    print('SUCCESS:', response.choices[0].message.content)
except Exception as e:
    print(f'ERROR TYPE: {type(e).__name__}')
    print(f'ERROR MSG: {e}')