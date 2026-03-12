import sqlite3, json, time, threading, logging, os
from flask import Flask, request, jsonify, render_template
from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_core.messages import HumanMessage, AIMessage
from config import CRM_CACHE_TTL

# --- LOGGING ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - SERVER - %(message)s')
logger = logging.getLogger("Yte360_Server")

# --- ĐƯỜNG DẪN ---
current_dir  = os.path.dirname(os.path.abspath(__file__))
root_path    = os.path.abspath(os.path.join(current_dir, '..'))
template_dir = os.path.join(root_path, 'templates')
static_dir   = os.path.join(root_path, 'static')

app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)

# =============================================================================
# DATABASE — Flask DB (users, messages) + Bot DB (sessions, cache, memory)
# =============================================================================
FLASK_DB = os.path.join(root_path, "database", "yte360_logs.db")
BOT_DB   = os.path.join(root_path, "database", "bot_sessions.db")
_lock    = threading.Lock()

# ── Flask DB ──────────────────────────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(FLASK_DB)
    conn.row_factory = sqlite3.Row
    return conn

def init_flask_db():
    try:
        with get_db() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sender TEXT, content TEXT, timestamp REAL, step TEXT
                );
                CREATE TABLE IF NOT EXISTS users (
                    username TEXT PRIMARY KEY, password TEXT, fullname TEXT
                );
            """)
            conn.commit()
        logger.info(f"✅ Flask DB ready: {FLASK_DB}")
    except Exception as e:
        logger.error(f"❌ Flask DB init error: {e}")

# ── Bot DB ────────────────────────────────────────────────────────────────────
def init_bot_db():
    with _lock:
        conn = sqlite3.connect(BOT_DB)
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS topic_state (
                topic TEXT PRIMARY KEY, notebook_id TEXT, session_id TEXT, updated_at INTEGER
            );
            CREATE TABLE IF NOT EXISTS topic_users (
                topic TEXT PRIMARY KEY, username TEXT NOT NULL, updated_at INTEGER
            );
            CREATE TABLE IF NOT EXISTS crm_cache (
                username TEXT PRIMARY KEY, data_json TEXT NOT NULL, cached_at INTEGER
            );
            CREATE TABLE IF NOT EXISTS chat_memory (
                topic TEXT PRIMARY KEY, messages_json TEXT NOT NULL, updated_at INTEGER
            );
        """)
        conn.commit()
        conn.close()
    logger.info(f"✅ Bot DB ready: {BOT_DB}")

# ── topic_state ───────────────────────────────────────────────────────────────
def get_topic(topic):
    with _lock:
        conn = sqlite3.connect(BOT_DB)
        row  = conn.execute("SELECT notebook_id, session_id FROM topic_state WHERE topic=?", (topic,)).fetchone()
        conn.close()
    return row

def set_topic(topic, notebook_id=None, session_id=None):
    now = int(time.time())
    with _lock:
        conn = sqlite3.connect(BOT_DB)
        row  = conn.execute("SELECT notebook_id, session_id FROM topic_state WHERE topic=?", (topic,)).fetchone()
        nb   = notebook_id if notebook_id is not None else (row[0] if row else "")
        sid  = session_id  if session_id  is not None else (row[1] if row else "")
        conn.execute("INSERT OR REPLACE INTO topic_state VALUES (?,?,?,?)", (topic, nb, sid, now))
        conn.commit()
        conn.close()

def clear_session(topic):
    set_topic(topic, session_id="")

# ── topic_users ───────────────────────────────────────────────────────────────
def get_username(topic) -> str | None:
    with _lock:
        conn = sqlite3.connect(BOT_DB)
        row  = conn.execute("SELECT username FROM topic_users WHERE topic=?", (topic,)).fetchone()
        conn.close()
    return row[0] if row else None

def set_username(topic, username: str):
    with _lock:
        conn = sqlite3.connect(BOT_DB)
        conn.execute("INSERT OR REPLACE INTO topic_users VALUES (?,?,?)", (topic, username, int(time.time())))
        conn.commit()
        conn.close()
    logger.info(f"[DB] Bind {topic} → '{username}'")

# ── crm_cache ─────────────────────────────────────────────────────────────────
def get_crm_cache(username: str) -> dict | None:
    with _lock:
        conn = sqlite3.connect(BOT_DB)
        row  = conn.execute("SELECT data_json, cached_at FROM crm_cache WHERE username=?", (username,)).fetchone()
        conn.close()
    if row and int(time.time()) - row[1] < CRM_CACHE_TTL:
        return json.loads(row[0])
    return None

def set_crm_cache(username: str, data: dict):
    with _lock:
        conn = sqlite3.connect(BOT_DB)
        conn.execute(
            "INSERT OR REPLACE INTO crm_cache VALUES (?,?,?)",
            (username, json.dumps(data, ensure_ascii=False), int(time.time()))
        )
        conn.commit()
        conn.close()

# ── chat_memory ───────────────────────────────────────────────────────────────
def load_memory(topic) -> InMemoryChatMessageHistory:
    history = InMemoryChatMessageHistory()
    with _lock:
        conn = sqlite3.connect(BOT_DB)
        row  = conn.execute("SELECT messages_json FROM chat_memory WHERE topic=?", (topic,)).fetchone()
        conn.close()
    if row:
        try:
            for m in json.loads(row[0])[-20:]:
                (history.add_user_message if m["type"] == "human" else history.add_ai_message)(m["content"])
        except Exception as e:
            logger.error(f"[DB] load_memory error: {e}")
    return history

def save_memory(topic, history: InMemoryChatMessageHistory):
    msgs = [
        {"type": "human" if isinstance(m, HumanMessage) else "ai", "content": m.content}
        for m in history.messages
    ]
    with _lock:
        conn = sqlite3.connect(BOT_DB)
        conn.execute(
            "INSERT OR REPLACE INTO chat_memory VALUES (?,?,?)",
            (topic, json.dumps(msgs, ensure_ascii=False), int(time.time()))
        )
        conn.commit()
        conn.close()

# =============================================================================
# FLASK ROUTES
# =============================================================================
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/register')
def register_page():
    return render_template('register.html')

@app.route('/api/register', methods=['POST'])
def register():
    data  = request.json
    user  = data.get('username')
    pw    = data.get('password')
    fname = data.get('fullname')
    if not user or not pw:
        return jsonify({"status": "error", "message": "Thiếu thông tin đăng nhập"}), 400
    try:
        with get_db() as conn:
            conn.execute("INSERT INTO users (username, password, fullname) VALUES (?,?,?)", (user, pw, fname))
            conn.commit()
        return jsonify({"status": "success", "message": "Đăng ký thành công"})
    except sqlite3.IntegrityError:
        return jsonify({"status": "error", "message": "Tên đăng nhập đã tồn tại"}), 400
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    user = data.get('username')
    pw   = data.get('password')
    try:
        with get_db() as conn:
            row = conn.execute(
                "SELECT username, fullname FROM users WHERE username=? AND password=?", (user, pw)
            ).fetchone()
        if row:
            return jsonify({"status": "success", "user": {"username": row['username'], "fullname": row['fullname']}})
        return jsonify({"status": "error", "message": "Sai tài khoản hoặc mật khẩu"}), 401
    except Exception as e:
        return jsonify({"status": "error", "message": "Lỗi server"}), 500

@app.route('/api/log', methods=['POST'])
def log_message():
    data = request.json
    try:
        with get_db() as conn:
            conn.execute(
                "INSERT INTO messages (sender, content, timestamp, step) VALUES (?,?,?,?)",
                (data.get('sender'), data.get('content'), time.time(), data.get('step', 'unknown'))
            )
            conn.commit()
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# =============================================================================
# MAIN
# =============================================================================
if __name__ == '__main__':
    init_flask_db()
    init_bot_db()
    print("🚀 Yte360 Server running on 0.0.0.0:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)