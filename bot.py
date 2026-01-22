import websocket
import json
import base64
import time
import logging
from openai import OpenAI

logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(message)s', datefmt='%H:%M:%S')
logger = logging.getLogger("BOT")

# --- CẤU HÌNH SERVER ---
WEBSOCKET_HOST = "ws://localhost:6060/v0/channels?apikey=AQEAAAABAAD_rAp4DJh05a1HAwFT3A6K"
BOT_USER = "chatbot"
BOT_PASS = "chatbot"

# --- CẤU HÌNH AI ---
GROQ_API_KEY = "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"
client = OpenAI(api_key=GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")
SYSTEM_PROMPT = """
Bạn là trợ lý ảo của ứng dụng quản lý tài chính "Heo Vàng" .
- Giọng điệu: Nhẹ nhàng, tận tâm, doanh nghiệp, IT, ngôn ngữ tư vấn.
- Địa chỉ: Phú Lương - Hà Đông - Hà Nội, nói ngắn gọn tư vấn.
- Nếu khách hỏi câu gì không liên quan đến tài chính, hãy từ chối khéo.
- Nếu khách muốn gặp người thật, hãy bảo họ gõ "gặp nhân viên".
"""
MY_BOT_ID = None 

def goi_api_chatgpt(cau_hoi_khach):
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": cau_hoi_khach}
            ],
            temperature=0.7, max_tokens=200
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"Lỗi AI: {e}")
        return "Bot đang bận xíu nha 😴"
def lay_ten_nguoi_dung(ws, user_id):
    # Gửi yêu cầu lấy thông tin desc của user đó
    ws.send(json.dumps({"sub": {"id": f"get_desc_{user_id}", "topic": user_id, "get": {"what": "desc"}}}))
def on_message(ws, message):
    global MY_BOT_ID
    try:
        msg = json.loads(message)

        # 1. LOGIN & AUTO SUB (Giữ nguyên)
        if msg.get("ctrl"):
            params = msg.get("ctrl").get("params")
            if params and params.get("user"):
                MY_BOT_ID = params.get("user")
                print(f"\n✅ BOT ONLINE! ID: {MY_BOT_ID}")
                ws.send(json.dumps({"sub": {"id": "sub_me", "topic": "me", "get": {"what": "desc sub"}}}))

        # 2. CONNECT KHÁCH CŨ (Giữ nguyên)
        if msg.get("meta") and msg.get("meta").get("sub"):
            subs = msg.get("meta").get("sub")
            for contact in subs:
                topic_id = contact.get("topic")
                if topic_id and (topic_id.startswith("usr") or topic_id.startswith("p2p")):
                    ws.send(json.dumps({"sub": {"id": f"sub_{topic_id}", "topic": topic_id, "get": {"what": "desc sub"}}}))

        # 3. KHÁCH MỚI (Giữ nguyên)
        if msg.get("pres"):
            src = msg.get("pres").get("src")
            if src and (src.startswith("usr") or src.startswith("p2p")):
                ws.send(json.dumps({"sub": {"id": f"sub_{src}", "topic": src, "get": {"what": "desc sub"}}}))

        # 4. XỬ LÝ TIN NHẮN (CẬP NHẬT MỚI)
        if msg.get("data"):
            data = msg.get("data")
            sender = data.get("from")
            content = data.get("content")
            topic = data.get("topic")

            if sender == MY_BOT_ID or sender == BOT_USER: return
            if not content: return

            print(f"📩 Khách ({sender}): {content}")

            # --- [LOGIC MỚI] XỬ LÝ LỜI CHÀO TỰ ĐỘNG ---
            if content.startswith("/start_greet"):
                # Tách lấy tên khách từ lệnh gửi lên
                # Vd: "/start_greet Nguyễn Văn A" -> ten_khach = "Nguyễn Văn A"
                parts = content.split(" ", 1)
                ten_khach = parts[1] if len(parts) > 1 else "bạn"
                
                # Bot trả lời ngay lập tức (Không cần gọi AI cho tốn tiền)
                reply = f"Xin chào {ten_khach}! 👋 Heo Vàng có thể giúp gì cho bạn hôm nay?"
                
                # Gửi trả lời
                time.sleep(1) # Delay nhẹ 1s cho tự nhiên
                ws.send(json.dumps({
                    "pub": {
                        "id": str(int(time.time() * 1000)),
                        "topic": topic,
                        "content": reply
                    }
                }))
                print(f"🚀 [AUTO-GREET] Đã chào: {ten_khach}")
                return # Dừng hàm, không gọi AI nữa
            # ------------------------------------------

            # Nếu không phải lệnh chào thì gọi AI như bình thường
            reply = goi_api_chatgpt(content)
            
            print("⏳ Đang suy nghĩ...")
            time.sleep(2) 

            ws.send(json.dumps({
                "pub": {
                    "id": str(int(time.time() * 1000)),
                    "topic": topic,
                    "content": reply
                }
            }))
            print(f"🚀 Bot đáp: {reply}")

    except Exception as e:
        print(f"❌ Lỗi: {e}")
        
def on_open(ws):
    print("🔌 Đang kết nối Tinode...")
    ws.send(json.dumps({"hi": {"id": "hi1", "ver": "0.25.1", "ua": "PythonBot", "lang": "en"}}))
    auth = base64.b64encode(f"{BOT_USER}:{BOT_PASS}".encode("utf-8")).decode("utf-8")
    ws.send(json.dumps({"login": {"id": "login1", "scheme": "basic", "secret": auth}}))

if __name__ == "__main__":
    while True:
        try:
            ws = websocket.WebSocketApp(WEBSOCKET_HOST, on_open=on_open, on_message=on_message)
            ws.run_forever()
        except Exception as e:
            print(f"⚠️ Mất kết nối. Thử lại sau 3s...")
            time.sleep(3)