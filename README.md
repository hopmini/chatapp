# Yte360 Livechat — Hệ Thống Trợ Lý Y Tế AI 🏥

Yte360 Livechat là giải pháp chatbot hỗ trợ y tế trực tuyến, kết hợp nền tảng nhắn tin **Tinode** và trí tuệ nhân tạo **LLM Notebook** để tư vấn sức khỏe, tra cứu thông tin cá nhân và đặt lịch khám tự động.

---

## 🌟 Tính năng chính

- **Trợ lý AI thông minh** — Tích hợp LLM Notebook để giải đáp thắc mắc sức khỏe theo thời gian thực
- **Router Agent** — Tự động phân loại câu hỏi: thông tin cá nhân (CRM) hoặc tư vấn chung (Notebook AI)
- **Real-time Messaging** — WebSocket qua Tinode Server, nhắn tin tức thì
- **Quản lý hội thoại** — Lưu lịch sử hội thoại, session, cache CRM bằng SQLite
- **Giao diện hiện đại** — Chat widget tích hợp Web, hỗ trợ Đăng nhập / Đăng ký
- **Multi-domain** — Một bot phục vụ nhiều website khác nhau qua `widget_map.json`

---

## 🏗 Cấu trúc dự án

```
yte360livechat/
├── run.py                  # Khởi động toàn bộ hệ thống
├── requirements.txt        # Danh sách thư viện
├── README.md
├── .gitignore
│
├── src/                    # Mã nguồn nghiệp vụ
│   ├── bot.py              # Logic Bot: intent, tools, agent, Tinode handlers
│   ├── server.py           # Flask Web Server + toàn bộ DB layer
│   ├── config.py           # Hằng số, token, widget map
│   └── moc_crm.py          # Mock CRM API (thay bằng CRM thật khi production)
│
├── data/
│   └── widget_map.json     # Map domain → notebook ID
│
├── database/               # Sinh tự động khi chạy lần đầu
│   ├── bot_sessions.db     # Sessions, cache CRM, lịch sử hội thoại
│   └── yte360_logs.db      # Users, message logs
│
├── templates/              # Giao diện HTML
│   ├── index.html
│   ├── login.html
│   └── register.html
│
└── static/                 # Tài nguyên tĩnh
    ├── script.js
    ├── tinode.js
    └── style.css
```

---

## 🚀 Cài đặt & Chạy Local

### 1. Yêu cầu

- Python **3.10+**
- Tinode Server đang chạy (hoặc dùng `wss://vichat.net`)

### 2. Cài đặt

```bash
# Clone dự án
git clone [https://git.gonstack.com/healthchain/yte360livechat.git](https://github.com/hopmini/chatapp)
cd yte360livechat

# Tạo môi trường ảo
python3 -m venv venv
source venv/bin/activate        # Linux/macOS
# venv\Scripts\activate         # Windows

# Cài đặt thư viện
pip install -r requirements.txt
```

### 3. Cấu hình

Mở `src/config.py` và điền các thông tin:

```python
BOT_USER       = "your_bot_username"
BOT_PASS       = "your_bot_password"
NOTEBOOK_TOKEN = "Bearer your_token"
BOT_SECRET     = "your_internal_secret"   # Phải khớp với moc_crm.py
```

Cập nhật `data/widget_map.json` với domain và notebook ID của bạn:

```json
{
    "yourdomain.vn": "notebook:your_notebook_id",
    "localhost":     "notebook:your_notebook_id"
}
```

### 4. Chạy

```bash
python run.py
```

Lệnh này sẽ tự động:
- Tạo thư mục `database/` nếu chưa có
- Khởi động Flask Web Server tại `http://localhost:5000`
- Khởi động Bot kết nối Tinode

> Để chạy Mock CRM riêng (dev/test):
> ```bash
> python src/moc_crm.py
> ```

---

## 🛠 Cấu hình kỹ thuật

| Thành phần | Chi tiết |
|---|---|
| AI Backend | LLM Notebook (gonapp.net) |
| Web Framework | Flask (Python) — `0.0.0.0:5000` |
| WebSocket | `wss://web.vichat.net/v0/channels` |
| Database | SQLite (2 file tách biệt) |
| Memory | LangChain `InMemoryChatMessageHistory` + SQLite persist |
| Cache CRM | SQLite TTL 5 phút |

---

© 2026 Yte360 Team — Gonstack HealthChain
