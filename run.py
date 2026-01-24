import subprocess
import sys
import time
import os

def run_app():
    print("🚀 Đang khởi động hệ thống Yte360...")
    
    # Xác định đường dẫn file
    current_dir = os.path.dirname(os.path.abspath(__file__))
    server_path = os.path.join(current_dir, "src", "server.py")
    bot_path = os.path.join(current_dir, "src", "bot.py")

    # 1. Khởi động Server Flask (Web)
    print("📡 Đang chạy Web Server (0.0.0.0:5000) ...")
    server_proc = subprocess.Popen([sys.executable, server_path])
    
    # Đợi 2 giây để Web Server ổn định
    time.sleep(2)
    
    # 2. Khởi động Chatbot AI
    print("🤖 Đang kết nối Bot với Vichat.net (Public)...")
    bot_proc = subprocess.Popen([sys.executable, bot_path])
    
    print("\n✅ HỆ THỐNG ĐÃ SẴN SÀNG!")
    print("👉 Hãy truy cập IP Server hoặc Domain qua cổng 5000 (hoặc 80 nếu đã qua HAProxy)")
    print("👉 Nhấn Ctrl + C để dừng.")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Đang tắt ứng dụng...")
        server_proc.terminate()
        bot_proc.terminate()
        print("👋 Đã đóng Server và Bot.")

if __name__ == "__main__":
    run_app()