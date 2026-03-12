import subprocess, sys, time, os

def run_app():
    print("🚀 Đang khởi động hệ thống...")

    root_dir = os.path.dirname(os.path.abspath(__file__))
    src_dir  = os.path.join(root_dir, "src")

    db_dir = os.path.join(root_dir, "database")
    os.makedirs(db_dir, exist_ok=True)
    print(f"📁 Database dir: {db_dir}")

    server_path = os.path.join(src_dir, "server.py")
    bot_path    = os.path.join(src_dir, "bot.py")

    # 1. Khởi động Flask server
    print("📡 Đang chạy Web Server (0.0.0.0:5000)...")
    server_proc = subprocess.Popen([sys.executable, server_path])
    time.sleep(2)

    # 2. Khởi động Bot
    print("🤖 Đang kết nối Bot với Vichat.net...")
    bot_proc = subprocess.Popen([sys.executable, bot_path])

    print("\n✅ HỆ THỐNG ĐÃ SẴN SÀNG!")
    print("👉 Truy cập IP Server hoặc Domain qua cổng 5000")
    print("👉 Nhấn Ctrl+C để dừng.\n")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Đang tắt...")
        server_proc.terminate()
        bot_proc.terminate()
        print("👋 Đã đóng Server và Bot.")

if __name__ == "__main__":
    run_app()