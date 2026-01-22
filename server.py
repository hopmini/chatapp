import sqlite3
import time
import logging
from flask import Flask, request, jsonify, render_template

logging.basicConfig(level=logging.INFO, format='%(asctime)s - SERVER - %(message)s')
logger = logging.getLogger("Server")

app = Flask(__name__)
DB_NAME = "chat_logs.db"

# --- DATABASE ---
def init_db():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    # Bảng tin nhắn
    c.execute('''CREATE TABLE IF NOT EXISTS messages
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  sender TEXT, content TEXT, timestamp REAL, step TEXT)''')
    
    # Bảng User (Cập nhật thêm cột fullname)
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (username TEXT PRIMARY KEY, password TEXT, fullname TEXT)''')
    conn.commit()
    conn.close()

# --- ROUTES (ĐIỀU HƯỚNG TRANG) ---
@app.route('/')
def index(): return render_template('index.html')

@app.route('/login')
def login_page(): return render_template('login.html')

@app.route('/register')
def register_page(): return render_template('register.html')

# --- API XỬ LÝ DỮ LIỆU ---
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    user = data.get('username')
    pw = data.get('password')
    fname = data.get('fullname')
    
    try:
        conn = sqlite3.connect(DB_NAME)
        c = conn.cursor()
        c.execute("INSERT INTO users (username, password, fullname) VALUES (?, ?, ?)", (user, pw, fname))
        conn.commit()
        conn.close()
        return jsonify({"status": "success", "message": "Đăng ký thành công"})
    except sqlite3.IntegrityError:
        return jsonify({"status": "error", "message": "Tên đăng nhập đã tồn tại"}), 400
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    user = data.get('username')
    pw = data.get('password')
    
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("SELECT username, fullname FROM users WHERE username=? AND password=?", (user, pw))
    row = c.fetchone()
    conn.close()
    
    if row:
        # Trả về cả Họ tên để hiển thị
        return jsonify({"status": "success", "user": {"username": row[0], "fullname": row[1]}})
    else:
        return jsonify({"status": "error", "message": "Sai tài khoản hoặc mật khẩu"}), 401

@app.route('/api/log', methods=['POST'])
def log_message():
    data = request.json
    try:
        conn = sqlite3.connect(DB_NAME)
        c = conn.cursor()
        c.execute("INSERT INTO messages (sender, content, timestamp, step) VALUES (?, ?, ?, ?)",
                  (data.get('sender'), data.get('content'), time.time(), data.get('step', 'unknown')))
        conn.commit()
        conn.close()
        return jsonify({"status": "success"})
    except:
        return jsonify({"status": "error"})

if __name__ == '__main__':
    init_db()
    logger.info("🚀 Heo Vàng App chạy tại http://localhost:5000")
    app.run(port=5000, debug=True)