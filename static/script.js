const TINODE_HOST = "web.vichat.net";
const API_KEY = "AQEAAAABAAD_rAp4DJh05a1HAwFT3A6K";
const BOT_ID = "usrYNFP5st2G0g";

// =============================================================================
// LOGGER — Console đẹp có màu + group
// =============================================================================
const Log = {
    _style: {
        tag: 'font-weight:600; padding:2px 6px; border-radius:3px; color:#fff;',
        reset: 'color:inherit; font-weight:normal;',
    },
    _fmt(color, label) {
        return [`%c ${label} %c`, `background:${color};` + this._style.tag, this._style.reset];
    },
    info(label, ...args) {
        const [fmt, s1, s2] = this._fmt('#2196f3', label);
        console.log(fmt, s1, s2, ...args);
    },
    ok(label, ...args) {
        const [fmt, s1, s2] = this._fmt('#4caf50', label);
        console.log(fmt, s1, s2, ...args);
    },
    warn(label, ...args) {
        const [fmt, s1, s2] = this._fmt('#ff9800', label);
        console.warn(fmt, s1, s2, ...args);
    },
    error(label, ...args) {
        const [fmt, s1, s2] = this._fmt('#f44336', label);
        console.error(fmt, s1, s2, ...args);
    },
    group(label, color, fn) {
        const [fmt, s1, s2] = this._fmt(color, label);
        console.groupCollapsed(fmt, s1, s2);
        fn();
        console.groupEnd();
    },
    msg(dir, topic, content) {
        const icon = dir === 'in' ? '📨' : '📤';
        const color = dir === 'in' ? '#7b1fa2' : '#00796b';
        const label = dir === 'in' ? 'MSG IN' : 'MSG OUT';
        this.group(`${icon} ${label}`, color, () => {
            console.log('Topic  :', topic);
            console.log('Content:', content);
        });
    },
};


/**
 * Tự động nhận diện Key dựa trên Domain hiện tại
 */
function getWidgetKey() {
    const host = window.location.hostname;
    Log.info("🔍 Domain", host);
    return host;
}

let chatClient = null;
let myTopic = null;
let currentUser = JSON.parse(localStorage.getItem('yte360_user'));
let myCurrentID = null;
let isConnected = false;

// ✅ Lazy init — chỉ kết nối Tinode khi user mở chat lần đầu
let chatInitialized = false;

// ----------- INDEX UI -----------
function initUI() {
    const nav = document.getElementById('navAuth');
    const greet = document.getElementById('greeting');
    if (currentUser && nav && greet) {
        nav.innerHTML = `<span>Hi, ${currentUser.fullname}</span> <button class="nav-btn" onclick="logout()">Thoát</button>`;
        greet.innerText = `Chào mừng trở lại, ${currentUser.fullname}!`;
    }
}

function logout() {
    Log.warn("🚪 Logout", "User đăng xuất");
    localStorage.removeItem('yte360_user');
    localStorage.removeItem('guest_ss');
    sessionStorage.clear();
    window.location.reload();
}

function toggleChat() {
    const win = document.getElementById('chatWindow');
    const quickMenu = document.getElementById('quickMenu');

    if (win.classList.contains('open')) {
        win.classList.remove('open');
        if (quickMenu) quickMenu.classList.remove('show');
        setTimeout(() => win.style.display = 'none', 300);
    } else {
        win.style.display = 'flex';
        void win.offsetWidth;
        win.classList.add('open');
        const box = document.getElementById('messages');
        if (box) box.scrollTop = box.scrollHeight;

        // ✅ Lazy init: chỉ khởi tạo Tinode lần đầu mở chat
        if (!chatInitialized) {
            Log.info("💬 Chat", "Lần đầu mở → khởi tạo Tinode");
            chatInitialized = true;
            initChat();
        } else {
            Log.info("💬 Chat", `Mở lại — connected=${isConnected}`);
            if (isConnected && myTopic) sendGreeting();
        }
    }
}

function toggleQuickMenu() {
    const menu = document.getElementById('quickMenu');
    if (menu) menu.classList.toggle('show');
}

function sendQuickAction(text) {
    handleSend(text);
    const menu = document.getElementById('quickMenu');
    if (menu) menu.classList.remove('show');
}

// --- FORM ĐĂNG KÝ ---
function showFullBookingForm() {
    const box = document.getElementById('messages');
    const formDiv = document.createElement('div');
    formDiv.className = 'chat-form';
    formDiv.id = 'fullBookingFormUi';

    formDiv.innerHTML = `
        <div class="form-header"><h4>📝 Phiếu Đăng Ký Khám</h4></div>
        <div class="form-body">
            <div class="form-group-row">
                <label class="form-label">Họ và Tên</label>
                <input type="text" id="inpName" class="form-control" placeholder="Nguyễn Văn A">
            </div>
            <div class="form-group-row two-col">
                <div>
                    <label class="form-label">Năm sinh</label>
                    <input type="number" id="inpDob" class="form-control" placeholder="1990">
                </div>
                <div>
                    <label class="form-label">Số điện thoại</label>
                    <input type="tel" id="inpPhone" class="form-control" placeholder="09xxx">
                </div>
            </div>
            <div class="form-group-row">
                <label class="form-label">Tỉnh / Thành phố</label>
                <select id="selProvince" class="form-control" onchange="loadDistricts()">
                    <option value="">-- Chọn Tỉnh/TP --</option>
                </select>
            </div>
            <div class="form-group-row two-col">
                <div>
                    <label class="form-label">Quận / Huyện</label>
                    <select id="selDistrict" class="form-control" disabled onchange="loadWards()">
                        <option value="">-- Chọn --</option>
                    </select>
                </div>
                <div>
                    <label class="form-label">Phường / Xã</label>
                    <select id="selWard" class="form-control" disabled>
                        <option value="">-- Chọn --</option>
                    </select>
                </div>
            </div>
            <div class="form-group-row">
                <label class="form-label">Số nhà, Tên đường</label>
                <input type="text" id="inpStreet" class="form-control" placeholder="Nhập số nhà...">
            </div>
            <div class="form-group-row">
                <label class="form-label">Thời gian khám dự kiến</label>
                <input type="datetime-local" id="inpTime" class="form-control">
            </div>
            <div class="form-group-row">
                <label class="form-label">Lý do khám / Triệu chứng</label>
                <textarea id="inpReason" class="form-control" rows="2" placeholder="VD: Đau đầu, sốt..."></textarea>
            </div>
        </div>
        <div class="form-footer">
            <button class="submit-form-btn" onclick="submitFullForm()">✅ Gửi Đăng Ký</button>
        </div>
    `;
    box.appendChild(formDiv);
    box.scrollTop = box.scrollHeight;

    fetch('https://provinces.open-api.vn/api/p/')
        .then(res => res.json())
        .then(data => {
            const sel = document.getElementById('selProvince');
            data.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.code;
                opt.text = p.name;
                opt.dataset.json = JSON.stringify({ code: p.code, name: p.name });
                sel.add(opt);
            });
        });
}

window.loadDistricts = function () {
    const pCode = document.getElementById('selProvince').value;
    const selDist = document.getElementById('selDistrict');
    const selWard = document.getElementById('selWard');
    selDist.innerHTML = '<option value="">-- Chọn Quận/Huyện --</option>';
    selWard.innerHTML = '<option value="">-- Chọn Phường/Xã --</option>';
    selDist.disabled = true;
    selWard.disabled = true;
    if (!pCode) return;
    fetch(`https://provinces.open-api.vn/api/p/${pCode}?depth=2`)
        .then(res => res.json())
        .then(data => {
            data.districts.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.code;
                opt.text = d.name;
                opt.dataset.json = JSON.stringify({ code: d.code, name: d.name });
                selDist.add(opt);
            });
            selDist.disabled = false;
        });
};

window.loadWards = function () {
    const dCode = document.getElementById('selDistrict').value;
    const selWard = document.getElementById('selWard');
    selWard.innerHTML = '<option value="">-- Chọn Phường/Xã --</option>';
    selWard.disabled = true;
    if (!dCode) return;
    fetch(`https://provinces.open-api.vn/api/d/${dCode}?depth=2`)
        .then(res => res.json())
        .then(data => {
            data.wards.forEach(w => {
                const opt = document.createElement('option');
                opt.value = w.code;
                opt.text = w.name;
                opt.dataset.json = JSON.stringify({ code: w.code, name: w.name });
                selWard.add(opt);
            });
            selWard.disabled = false;
        });
};

window.submitFullForm = function () {
    const name = document.getElementById('inpName').value.trim();
    const dob = document.getElementById('inpDob').value.trim();
    const phone = document.getElementById('inpPhone').value.trim();
    const selProvince = document.getElementById('selProvince');
    const selDistrict = document.getElementById('selDistrict');
    const selWard = document.getElementById('selWard');
    const street = document.getElementById('inpStreet').value.trim();
    const timeStr = document.getElementById('inpTime').value;
    const reason = document.getElementById('inpReason').value.trim();

    if (!name || !dob || !phone || !selProvince.value || !selDistrict.value || !selWard.value || !timeStr || !reason) {
        return alert("Vui lòng điền đầy đủ thông tin!");
    }

    const provinceData = JSON.parse(selProvince.options[selProvince.selectedIndex].dataset.json);
    const districtData = JSON.parse(selDistrict.options[selDistrict.selectedIndex].dataset.json);
    const wardData = JSON.parse(selWard.options[selWard.selectedIndex].dataset.json);

    const formData = {
        is_full_form: true,
        data: {
            ho_ten: name,
            ngay_sinh: dob + "0101",
            so_dien_thoai: phone,
            dia_chi_json: { tinh: provinceData, huyen: districtData, xa: wardData },
            dia_chi_ct: street,
            ngay_hen_ts: Math.floor(new Date(timeStr).getTime() / 1000),
            gio_hen: new Date(timeStr).getHours(),
            ghi_chu: reason
        }
    };

    handleSend(JSON.stringify(formData));
    const ui = document.getElementById('fullBookingFormUi');
    if (ui) ui.remove();
    addMessage("Tôi", "✅ Đã gửi phiếu đăng ký", "me");
};

// ----------- TINODE CORE -----------
async function initChat() {
    Log.info("⚙️ Tinode", "Đang khởi tạo...");
    let TinodeConstructor = window.tinode || window.Tinode;
    if (typeof TinodeConstructor === 'object' && TinodeConstructor.Tinode)
        TinodeConstructor = TinodeConstructor.Tinode;

    chatClient = new TinodeConstructor({
        appName: 'Yte360-Web',
        host: TINODE_HOST,
        apiKey: API_KEY,
        secure: true
    });
    chatClient.enableLogging(true);

    try {
        await chatClient.connect();
        isConnected = true;
        Log.ok("⚙️ Tinode", "Socket kết nối thành công");

        let u, p, isGuest = false;
        if (currentUser) {
            u = currentUser.username;
            p = currentUser.password || "SecurePass_12345!";
        } else {
            let guest = localStorage.getItem('guest_ss');
            if (!guest) {
                const rnd = 'guest_' + Math.random().toString(36).substr(2, 6);
                guest = JSON.stringify({ u: rnd, p: "SecurePass_12345!" });
                localStorage.setItem('guest_ss', guest);
            }
            const g = JSON.parse(guest);
            u = g.u; p = g.p; isGuest = true;
        }

        try {
            let ctrl = await chatClient.loginBasic(u, p);
            if (ctrl && ctrl.params) myCurrentID = ctrl.params.user;
        } catch (e) {
            if (e.code === 401 || e.code === 404) {
                let ctrl = await chatClient.createAccountBasic(u, p, true);
                if (ctrl && ctrl.params) myCurrentID = ctrl.params.user;
            } else throw e;
        }

        Log.ok("🔑 Auth", `Login OK — ID: ${myCurrentID}`);
        const me = chatClient.getMeTopic();
        await me.subscribe({ get: { what: 'desc sub data' } });
        if (!isGuest && currentUser) {
            await me.setMeta({ desc: { public: { fn: currentUser.fullname } } });
        }

        const statusEl = document.getElementById('status');
        if (statusEl) statusEl.style.background = "#00e676";

        myTopic = chatClient.getTopic(BOT_ID);
        if (!myTopic) myTopic = chatClient.newTopicP2P(BOT_ID);

        await myTopic.subscribe({ get: { what: 'desc sub data', data: { limit: 50 } } });

        document.getElementById('msgInput')?.removeAttribute('disabled');
        document.getElementById('sendBtn')?.removeAttribute('disabled');

        myTopic.onData = (msg) => {
            if (!msg || !msg.content) return;
            if (chatClient.isMe(msg.from)) return;

            if (msg.from === BOT_ID) {
                showTyping(false);
                try {
                    const jsonData = JSON.parse(msg.content);
                    if (jsonData.clear_id) {
                        const el = document.getElementById(jsonData.clear_id);
                        if (el) el.remove();
                    }
                    if (jsonData.input_type === 'full_booking_form') {
                        addMessage("Bot", jsonData.text, "bot", jsonData.temp_id);
                        showFullBookingForm();
                    } else if (jsonData.is_rich_text) {
                        addMessageWithButtons("Bot", jsonData.text, jsonData.buttons, jsonData.temp_id);
                    } else {
                        addMessage("Bot", jsonData.text || msg.content, "bot", jsonData.temp_id);
                    }
                } catch (e) {
                    addMessage("Bot", msg.content, "bot");
                }
            }
        };

        // ✅ Guard: chỉ sendGreeting khi myCurrentID đã có
        setTimeout(() => {
            const box = document.getElementById('messages');
            if (box && box.children.length === 0) {
                if (myCurrentID) sendGreeting();
                else Log.warn("⚠️ Greet", "myCurrentID null — bỏ qua");
            }
        }, 1000);

    } catch (err) {
        Log.error("❌ Tinode", err);
        const statusEl = document.getElementById('status');
        if (statusEl) statusEl.style.background = "red";
        isConnected = false;
        chatInitialized = false;  // Cho phép thử lại
    }
}

function sendGreeting() {
    if (!myTopic) return;

    // ✅ Guard: không tạo key "has_greeted_null"
    if (!myCurrentID) {
        Log.warn("⚠️ Greet", "myCurrentID null — bỏ qua");
        return;
    }

    const sessionKey = 'has_greeted_' + myCurrentID;
    if (sessionStorage.getItem(sessionKey)) {
        Log.info("🛑 Greet", "Đã gửi rồi — bỏ qua");
        return;
    }

    const customerName = currentUser ? currentUser.fullname : "bạn";
    const widgetKey = getWidgetKey();

    // ✅ Truyền username lên bot để bind ownership
    // Format: /start_greet|widget_key|display_name|username
    const username = currentUser ? currentUser.username : "";
    const cmd = `/start_greet|${widgetKey}|${customerName}|${username}`;

    Log.info("🚀 Greet", cmd);
    myTopic.publish(cmd);
    showTyping(true);
    sessionStorage.setItem(sessionKey, 'true');
}

function showTyping(show) {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.style.display = show ? 'flex' : 'none';
    const box = document.getElementById('messages');
    if (box) box.scrollTop = box.scrollHeight;
}

async function handleSend(customText = null) {
    const input = document.getElementById('msgInput');
    const txt = customText || (input ? input.value.trim() : "");
    if (!txt || !myTopic) return;

    // ✅ Chỉ xóa .msg-actions của tin nhắn bot CUỐI CÙNG
    cleanupLastInteraction();

    if (!customText && input) input.value = '';
    const menu = document.getElementById('quickMenu');
    if (menu) menu.classList.remove('show');

    addMessage("Tôi", txt, "me");
    showTyping(true);

    try {
        // ✅ Gửi kèm username để bot binding ownership
        const payload = JSON.stringify({
            action: "chat",
            widget_key: getWidgetKey(),
            username: currentUser ? currentUser.username : null,  // ← MỚI
            text: txt
        });

        const ctrl = await myTopic.publish(payload);
        Log.ok("📤 Publish", "Server confirmed", ctrl);
    } catch (e) {
        Log.error("❌ Publish", e);
        showTyping(false);
    }
}

// ✅ Chỉ xóa .msg-actions CUỐI, giữ nguyên các button cũ hơn
function cleanupLastInteraction() {
    const allActions = document.querySelectorAll('.msg-actions');
    if (allActions.length > 0) {
        allActions[allActions.length - 1].remove();
    }
}

function addMessage(sender, text, type, elemId = null) {
    if (!text || typeof text !== 'string' || text.startsWith("/start_greet")) return;
    if (text.startsWith('{"is_full_form":')) return;

    const box = document.getElementById('messages');
    if (!box) return;

    if (type === 'bot') {
        const container = document.createElement('div');
        container.className = 'bot-container';
        if (elemId) container.id = elemId;
        container.innerHTML = `
            <div class="bot-row">
                <img src="https://cdn-icons-png.flaticon.com/512/4712/4712035.png" class="bot-avatar">
                <div class="message bot">${text}</div>
            </div>
        `;
        box.appendChild(container);
    } else {
        const div = document.createElement('div');
        div.className = `message ${type}`;
        div.textContent = text;
        box.appendChild(div);
    }
    box.scrollTop = box.scrollHeight;
}

function addMessageWithButtons(sender, text, buttons, elemId = null) {
    const box = document.getElementById('messages');
    if (!box) return;

    const container = document.createElement('div');
    container.className = 'bot-container';
    if (elemId) container.id = elemId;

    let html = `
        <div class="bot-row">
            <img src="https://cdn-icons-png.flaticon.com/512/4712/4712035.png" class="bot-avatar">
            <div class="message bot">${text}</div>
        </div>
        <div class="msg-actions">
    `;
    if (buttons) {
        buttons.forEach(btn => {
            const val = btn.value;
            if (val.startsWith("http")) {
                html += `<button class="action-btn" onclick="window.open('${val}', '_blank')">${btn.label}</button>`;
            } else {
                const safeVal = val.replace(/'/g, "\\'");
                html += `<button class="action-btn" onclick="handleSend('${safeVal}')">${btn.label}</button>`;
            }
        });
    }
    html += `</div>`;
    container.innerHTML = html;
    box.appendChild(container);
    box.scrollTop = box.scrollHeight;
}

const msgInput = document.getElementById('msgInput');
if (msgInput) {
    msgInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") handleSend();
    });
}

// ----------- LOGIN API -----------
async function handleLogin() {
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();
    if (!user || !pass) return alert("Nhập thiếu thông tin!");

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });
        const data = await res.json();
        if (data.status === 'success') {
            localStorage.setItem('yte360_user', JSON.stringify({
                username: data.user.username,
                password: pass,
                fullname: data.user.fullname
            }));
            window.location.href = "/";
        } else alert(data.message);
    } catch (err) {
        Log.error("❌ Login", err);
    }
}

async function processRegister() {
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();
    const fname = document.getElementById('fullname').value.trim();
    const status = document.getElementById('statusMsg');

    if (!user || !pass || !fname) return alert("Vui lòng điền đầy đủ thông tin!");

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass, fullname: fname })
        });
        const data = await res.json();
        if (data.status !== 'success') throw new Error(data.message);

        let TinodeConstructor = window.tinode || window.Tinode;
        if (typeof TinodeConstructor === 'object' && TinodeConstructor.Tinode)
            TinodeConstructor = TinodeConstructor.Tinode;

        const regClient = new TinodeConstructor({
            appName: 'Reg', host: TINODE_HOST, apiKey: API_KEY, secure: true
        });
        await regClient.connect();
        await regClient.createAccountBasic(user, pass, true);
        const me = regClient.getMeTopic();
        await me.setMeta({ desc: { public: { fn: fname } } });
        regClient.disconnect();

        alert("Đăng ký thành công!");
        window.location.href = "/login";

    } catch (err) {
        Log.error("❌ Register", err);
        if (status) {
            status.innerText = "Lỗi: " + (err.message || "Không xác định");
            status.style.color = "red";
        } else {
            alert("Lỗi: " + (err.message || "Không xác định"));
        }
    }
}

// ----------- INIT -----------
initUI();

// ✅ Lazy init — initChat() chỉ chạy khi user bấm mở chat lần đầu (trong toggleChat)
const currentPath = window.location.pathname.toLowerCase();
if (!currentPath.includes('register') && !currentPath.includes('login')) {
    Log.ok("✅ App", "Trang load xong — Tinode sẽ kết nối khi mở chat");
}