import sqlite3
import time
import logging
import os
from flask import Flask, request, jsonify, render_template

# --- CẤU HÌNH LOGGING ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - SERVER - %(message)s')
logger = logging.getLogger("Yte360_Server")

# --- CẤU HÌNH ĐƯỜNG DẪN ---
# Xác định thư mục gốc (Root) của dự án
# Giả sử cấu trúc: /src/server.py và /templates, /static nằm cùng cấp với /src
current_dir = os.path.dirname(os.path.abspath(__file__))
root_path = os.path.abspath(os.path.join(current_dir, '..'))

# Trỏ đúng đường dẫn tới thư mục templates và static ở Root
template_dir = os.path.join(root_path, 'templates')
static_dir = os.path.join(root_path, 'static')

# Khởi tạo Flask App
app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)

# File Database (Lưu ngay tại thư mục gốc)
DB_NAME = os.path.join(root_path, "yte360_logs.db")

# --- DATABASE HELPER ---
def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    try:
        with get_db_connection() as conn:
            c = conn.cursor()
            # Bảng tin nhắn
            c.execute('''CREATE TABLE IF NOT EXISTS messages
                         (id INTEGER PRIMARY KEY AUTOINCREMENT,
                          sender TEXT, content TEXT, timestamp REAL, step TEXT)''')
            
            # Bảng User
            c.execute('''CREATE TABLE IF NOT EXISTS users
                         (username TEXT PRIMARY KEY, password TEXT, fullname TEXT)''')
            conn.commit()
        logger.info(f"✅ Database Yte360 đã sẵn sàng tại: {DB_NAME}")
    except Exception as e:
        logger.error(f"❌ Lỗi khởi tạo Database: {e}")

# --- ROUTES ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/register')
def register_page():
    return render_template('register.html')

# --- API ---
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    user = data.get('username')
    pw = data.get('password')
    fname = data.get('fullname')
    
    if not user or not pw:
        return jsonify({"status": "error", "message": "Thiếu thông tin đăng nhập"}), 400

    try:
        with get_db_connection() as conn:
            c = conn.cursor()
            c.execute("INSERT INTO users (username, password, fullname) VALUES (?, ?, ?)", (user, pw, fname))
            conn.commit()
        return jsonify({"status": "success", "message": "Đăng ký thành công"})
    except sqlite3.IntegrityError:
        return jsonify({"status": "error", "message": "Tên đăng nhập đã tồn tại"}), 400
    except Exception as e:
        logger.error(f"Register Error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    user = data.get('username')
    pw = data.get('password')
    
    try:
        with get_db_connection() as conn:
            c = conn.cursor()
            c.execute("SELECT username, fullname FROM users WHERE username=? AND password=?", (user, pw))
            row = c.fetchone()
        
        if row:
            return jsonify({"status": "success", "user": {"username": row['username'], "fullname": row['fullname']}})
        else:
            return jsonify({"status": "error", "message": "Sai tài khoản hoặc mật khẩu"}), 401
    except Exception as e:
        logger.error(f"Login Error: {e}")
        return jsonify({"status": "error", "message": "Lỗi server"}), 500

@app.route('/api/log', methods=['POST'])
def log_message():
    data = request.json
    try:
        with get_db_connection() as conn:
            c = conn.cursor()
            c.execute("INSERT INTO messages (sender, content, timestamp, step) VALUES (?, ?, ?, ?)",
                      (data.get('sender'), data.get('content'), time.time(), data.get('step', 'unknown')))
            conn.commit()
        return jsonify({"status": "success"})
    except Exception as e:
        logger.error(f"Log Message Error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

# --- MAIN RUN ---
if __name__ == '__main__':
    if not os.path.exists(template_dir):
        logger.warning(f"⚠️ CẢNH BÁO: Không tìm thấy thư mục templates tại: {template_dir}")
    
    init_db()
    # Lắng nghe 0.0.0.0 để mở cổng ra ngoài mạng LAN/Server
    print("🚀 Yte360 Server đang chạy trên tất cả các interface (0.0.0.0:5000)...")
    app.run(host='0.0.0.0', port=5000, debug=True)