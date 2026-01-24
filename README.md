Yte360 Livechat - Hệ Thống Trợ Lý Y Tế AI 🏥

Yte360 Livechat là giải pháp chatbot hỗ trợ y tế trực tuyến, kết hợp giữa nền tảng nhắn tin Tinode và trí tuệ nhân tạo LLM (Llama 3) để tư vấn sức khỏe và đặt lịch khám tự động.

🌟 Tính năng chính

Tư vấn Y tế AI: Tích hợp Groq Cloud (Llama 3) để giải đáp thắc mắc sức khỏe theo thời gian thực.


Real-time Messaging: Sử dụng giao thức WebSockets qua Tinode Server để đảm bảo tốc độ nhắn tin tức thì.


Quản lý hội thoại: Hệ thống lưu trữ lịch sử tin nhắn và thông tin người dùng bằng SQLite.

Giao diện hiện đại: Chat widget tích hợp sẵn trên nền tảng Web, hỗ trợ Đăng nhập/Đăng ký.

Quản lý tiến trình: Tự động vận hành và theo dõi sức khỏe của cả Bot và Server thông qua trình quản lý tập trung.

🏗 Cấu trúc dự án
Dự án được tổ chức theo cấu trúc chuẩn để dễ dàng bảo trì và triển khai:

Plaintext
yte360livechat/
├── run.py                # Manager: Khởi động và giám sát hệ thống
├── requirements.txt      # Danh sách thư viện cần thiết
├── src/                  # Thư mục chứa mã nguồn nghiệp vụ
│   ├── bot.py            # Logic Chatbot AI và kết nối Tinode 
│   └── server.py         # Flask Web Server và API 
├── templates/            # Giao diện HTML (Yte360 Branding) 
│   ├── index.html        # Trang chủ & Chat Widget
│   ├── login.html        # Trang Đăng nhập
│   └── register.html     # Trang Đăng ký
└── static/               # Tài nguyên tĩnh (CSS, JS, Images) 
    └── tinode.js         # Thư viện kết nối Tinode
🚀 Hướng dẫn cài đặt & Chạy Local
1. Chuẩn bị môi trường
Python: Phiên bản 3.8 trở lên.

Docker: Để chạy Tinode Backend Server.

2. Cài đặt
Bash
# Clone dự án từ Gonstack
git clone https://git.gonstack.com/healthchain/yte360livechat.git
cd yte360livechat

# Tạo môi trường ảo
python3 -m venv chatbot
source chatbot/bin/activate  # Linux/macOS
# chatbot\Scripts\activate   # Windows

# Cài đặt thư viện
pip install -r requirements.txt
3. Vận hành
Chỉ cần chạy một lệnh duy nhất để khởi động toàn bộ hệ thống (Docker + Bot + Server):

Bash
python run.py

Web UI: http://localhost:5000.


Tinode Port: 6060.

🌐 Triển khai lên Server (Production)
Hệ thống được thiết kế để chạy sau bộ lọc tải HAProxy tại địa chỉ 103.74.122.215 và kết nối tới service vichat.net.

Các lệnh quản trị dịch vụ:
Sử dụng systemd để quản lý dịch vụ trên server Ubuntu:

Bash
# Khởi động lại dịch vụ sau khi update code
sudo systemctl restart yte360chat.service

# Kiểm tra trạng thái hoạt động
sudo systemctl status yte360chat.service

# Xem log thời gian thực
journalctl -u yte360chat.service -f
🛠 Cấu hình kỹ thuật

AI Model: llama-3.3-70b-versatile qua Groq Cloud.


Backend: Flask (Python) lắng nghe tại 0.0.0.0:5000.


WebSocket: wss://vichat.net/v0/channels.

© 2026 Yte360 Team - Gonstack HealthChain.