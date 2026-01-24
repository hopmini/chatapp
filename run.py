import subprocess
import sys
import time
import os

def run_app():
    print("🚀 Đang khởi động hệ thống Heo Vàng...")
    
    # Đường dẫn tới các file trong thư mục nghiệp vụ
    server_path = os.path.join("src", "server.py")
    bot_path = os.path.join("src", "bot.py")

    # 1. Khởi động Server Flask
    print("📡 Đang chạy Server tại http://localhost:5000 ...")
    server_proc = subprocess.Popen([sys.executable, server_path])
    
    # Đợi 2 giây để Server khởi động xong rồi mới chạy Bot
    time.sleep(2)
    
    # 2. Khởi động Chatbot
    print("🤖 Đang kết nối Bot với Tinode Server...")
    bot_proc = subprocess.Popen([sys.executable, bot_path])
    
    print("\n✅ TẤT CẢ ĐÃ SẴN SÀNG!")
    print("👉 Nhấn Ctrl + C để dừng toàn bộ ứng dụng.")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Đang tắt ứng dụng...")
        server_proc.terminate()
        bot_proc.terminate()
        print("👋 Đã đóng Server và Bot. Hẹn gặp lại!")

if __name__ == "__main__":
    run_app()