import os
import sqlite3
import time
import logging
from flask import Flask, request, jsonify, render_template

logging.basicConfig(level=logging.INFO, format='%(asctime)s - YTE360_SERVER - %(message)s')
logger = logging.getLogger("Server")

root_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
app = Flask(__name__, template_folder=os.path.join(root_path, 'templates'), static_folder=os.path.join(root_path, 'static'))
DB_NAME = os.path.join(root_path, "yte360_logs.db")

def init_db():
    conn = sqlite3.connect(DB_NAME); c = conn.cursor()
    c.execute('CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, sender TEXT, content TEXT, timestamp REAL, step TEXT)')
    c.execute('CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, password TEXT, fullname TEXT)')
    conn.commit(); conn.close()

@app.route('/')
def index(): return render_template('index.html')

@app.route('/login')
def login_page(): return render_template('login.html')

@app.route('/register')
def register_page(): return render_template('register.html')

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    conn = sqlite3.connect(DB_NAME); c = conn.cursor()
    c.execute("SELECT username, fullname FROM users WHERE username=? AND password=?", (data.get('username'), data.get('password')))
    row = c.fetchone(); conn.close()
    if row: return jsonify({"status": "success", "user": {"username": row[0], "fullname": row[1]}})
    return jsonify({"status": "error", "message": "Sai tài khoản hoặc mật khẩu"}), 401

# --- Các API khác giữ nguyên logic ---

if __name__ == '__main__':
    init_db()
    # Chỉnh cấu hình theo yêu cầu của anh để deploy server
    logger.info("🚀 Yte360 App đang lắng nghe tại 0.0.0.0:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)