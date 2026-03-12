import logging
from functools import wraps
from flask import Flask, request, jsonify

app = Flask(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - MOCK CRM - %(message)s')
logger = logging.getLogger("MOCK_CRM")

# Secret nội bộ — phải khớp với BOT_SECRET trong bot.py
# Chỉ bot.py được phép gọi API này, không expose ra ngoài
BOT_SECRET = "yte360_bot_internal_secret"

# =============================================================================
# FAKE DB
# =============================================================================
FAKE_DB = {
    "user123": {
        "fullname": "Nguyễn Văn A",
        "phone": "0901234567",
        "vouchers": [
            {"id": "V1", "name": "Giảm 50k phí khám",       "status": "active"},
            {"id": "V2", "name": "Miễn phí siêu âm",        "status": "used"},
            {"id": "V3", "name": "Voucher sinh nhật 100k",   "status": "active"}
        ],
        "loyalty_points": 1500
    },
    "hop_vip": {
        "fullname": "Hợp Sếp Lớn",
        "phone": "0999999999",
        "vouchers": [{"id": "V99", "name": "Giảm 100% độ ngáo", "status": "active"}],
        "loyalty_points": 99999
    }
}

# =============================================================================
# AUTH MIDDLEWARE — Chỉ bot.py (có X-Bot-Secret) mới được gọi
# =============================================================================
def require_bot_auth(f):
    """Decorator kiểm tra header X-Bot-Secret trước khi vào route."""
    @wraps(f)
    def decorated(*args, **kwargs):
        secret = request.headers.get("X-Bot-Secret", "")
        if secret != BOT_SECRET:
            client_ip = request.remote_addr
            logger.warning(
                f"🚨 [AUTH FAIL] Unauthorized request to {request.path} "
                f"from IP={client_ip} | secret='{secret[:8]}...'"
            )
            return jsonify({"status": "error", "message": "Unauthorized"}), 403
        return f(*args, **kwargs)
    return decorated

# =============================================================================
# HELPER
# =============================================================================
def _get_user_or_404(username: str):
    """Lấy user từ FAKE_DB, trả (data, None) hoặc (None, error_response)."""
    if not username:
        return None, (jsonify({"status": "error", "message": "Thiếu parameter username"}), 400)
    if username not in FAKE_DB:
        logger.info(f"🔍 [CRM] Không tìm thấy user='{username}'")
        return None, (jsonify({"status": "error", "message": "Không tìm thấy khách hàng"}), 404)
    return FAKE_DB[username], None

# =============================================================================
# ENDPOINTS
# =============================================================================

@app.route('/api/crm/user_info', methods=['GET'])
@require_bot_auth
def get_user_info():
    """
    Endpoint chính — bot.py gọi để lấy toàn bộ thông tin cá nhân:
    tên, SĐT, điểm tích lũy, và danh sách voucher đang active.
    """
    username = request.args.get('username', '').strip()
    logger.info(f"📥 [user_info] Request username='{username}'")

    user_data, error = _get_user_or_404(username)
    if error:
        return error

    active_vouchers = [v for v in user_data['vouchers'] if v['status'] == 'active']

    return jsonify({
        "status": "success",
        "data": {
            "fullname":              user_data['fullname'],
            "phone":                 user_data['phone'],
            "loyalty_points":        user_data['loyalty_points'],
            "total_active_vouchers": len(active_vouchers),
            "voucher_details":       active_vouchers
        }
    })


@app.route('/api/crm/vouchers', methods=['GET'])
@require_bot_auth
def get_vouchers():
    """
    Endpoint legacy — chỉ trả voucher (giữ lại để tương thích ngược).
    Cũng được bảo vệ bởi BOT_SECRET.
    """
    username = request.args.get('username', '').strip()
    logger.info(f"📥 [vouchers] Request username='{username}'")

    user_data, error = _get_user_or_404(username)
    if error:
        return error

    active_vouchers = [v for v in user_data['vouchers'] if v['status'] == 'active']

    return jsonify({
        "status": "success",
        "data": {
            "fullname":              user_data['fullname'],
            "loyalty_points":        user_data['loyalty_points'],
            "total_active_vouchers": len(active_vouchers),
            "voucher_details":       active_vouchers
        }
    })


@app.route('/health', methods=['GET'])
def health():
    """Health check — không cần auth, dùng cho monitoring."""
    return jsonify({"status": "ok", "service": "mock_crm"}), 200


# =============================================================================
# MAIN
# =============================================================================
if __name__ == '__main__':
    print("🛠️  Mock CRM đang chạy ở port 5001")
    print(f"🔐  BOT_SECRET đã set: '{BOT_SECRET[:8]}...'")
    print("⚠️   Nhớ chỉ cho bot.py gọi vào, không expose port 5001 ra internet!")
    app.run(host='0.0.0.0', port=5001, debug=True)