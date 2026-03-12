import json, os, logging

logger = logging.getLogger("BOT_YTE360")

# ── Tinode ────────────────────────────────────────────────────────────────────
WEBSOCKET_HOST = "wss://web.vichat.net/v0/channels?apikey=AQEAAAABAAD_rAp4DJh05a1HAwFT3A6K"
BOT_USER       = "chatai"
BOT_PASS       = "123456abcA"

# ── Notebook AI ───────────────────────────────────────────────────────────────
NOTEBOOK_URL   = "https://llmnotebook-api.gonapp.net/api/chat"
NOTEBOOK_TOKEN = "Bearer 123456abcA"
NOTEBOOK_HEADERS = {
    "Authorization": NOTEBOOK_TOKEN,
    "Content-Type":  "application/json",
    "Origin":        "https://llmnotebook.gonapp.net",
    "Referer":       "https://llmnotebook.gonapp.net/",
    "User-Agent":    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
}

# ── CRM ───────────────────────────────────────────────────────────────────────
CRM_URL       = "http://localhost:5001/api/crm"
BOT_SECRET    = "yte360_bot_internal_secret"
CRM_CACHE_TTL = 300  # giây

# ── Timeout ───────────────────────────────────────────────────────────────────
TIMEOUT_SHORT = 10
TIMEOUT_LONG  = 30

# ── Rate limit ────────────────────────────────────────────────────────────────
RATE_LIMIT_SECONDS = 1.5

# ── Widget Map ────────────────────────────────────────────────────────────────
_DEFAULT_WIDGET_MAP = {
    "thanhnhanhospital.vn": "notebook:pdur6g15vzcwvxb3h3u6",
    "heovang.vn":           "notebook:91pya73ug6ep9830b1as",
    "healthchain.vn":       "notebook:b7nmkld9tud4zlgswh2d",
    "ipos.vn":              "notebook:84k0723a2hpuvw595o78",
    "fta.upgoweb.com":      "notebook:pgsppw9l11yaoxakghup",
    "localhost":            "notebook:91pya73ug6ep9830b1as",
    "127.0.0.1":            "notebook:pdur6g15vzcwvxb3h3u6",
}

def get_widget_map() -> dict:
    path = os.path.join(os.path.dirname(__file__), "../data/widget_map.json")
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
            logger.info(f"[CONFIG] Loaded {len(data)} domains from widget_map.json")
            return data
    except FileNotFoundError:
        logger.warning("[CONFIG] widget_map.json not found — using default")
    except json.JSONDecodeError as e:
        logger.error(f"[CONFIG] widget_map.json parse error: {e} — using default")
    return _DEFAULT_WIDGET_MAP.copy()

WIDGET_MAP = get_widget_map()