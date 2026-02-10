const TINODE_HOST = "localhost:6060";
const API_KEY = "AQEAAAABAAD_rAp4DJh05a1HAwFT3A6K";
const BOT_ID = "usrCcO7S1l0PNA";

let chatClient = null;
let myTopic = null;
let currentUser = JSON.parse(localStorage.getItem('yte360_user'));
let myCurrentID = null;
let isConnected = false;

// ----------- INDEX -----------
function initUI() {
    const nav = document.getElementById('navAuth');
    const greet = document.getElementById('greeting');
    if (currentUser) {
        nav.innerHTML = `<span>Hi, ${currentUser.fullname}</span> <button class="nav-btn" onclick="logout()">Thoát</button>`;
        greet.innerText = `Chào mừng trở lại, ${currentUser.fullname}!`;
    }
}
function logout() { localStorage.removeItem('yte360_user'); window.location.reload(); }

function toggleChat() {
    const win = document.getElementById('chatWindow');
    const quickMenu = document.getElementById('quickMenu');

    if (win.classList.contains('open')) {
        win.classList.remove('open');
        quickMenu.classList.remove('show');
        setTimeout(() => win.style.display = 'none', 300);
    } else {
        win.style.display = 'flex';
        void win.offsetWidth;
        win.classList.add('open');
        const box = document.getElementById('messages');
        box.scrollTop = box.scrollHeight;

        if (box.children.length === 0 && isConnected && myTopic) {
            sendGreeting();
        }
    }
}

function toggleQuickMenu() {
    const menu = document.getElementById('quickMenu');
    menu.classList.toggle('show');
}

function sendQuickAction(text) {
    handleSend(text);
    document.getElementById('quickMenu').classList.remove('show');
}

// --- HÀM HIỂN THỊ FORM ĐẦY ĐỦ (ALL-IN-ONE) ---
function showFullBookingForm() {
    const box = document.getElementById('messages');
    const formDiv = document.createElement('div');
    formDiv.className = 'chat-form';
    formDiv.id = 'fullBookingFormUi';

    formDiv.innerHTML = `
                <div class="form-header">
                    <h4>📝 Phiếu Đăng Ký Khám</h4>
                </div>
                <div class="form-body">
                    <!-- THÔNG TIN CÁ NHÂN -->
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

                    <!-- ĐỊA CHỈ -->
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

                    <!-- THỜI GIAN KHÁM -->
                    <div class="form-group-row">
                        <label class="form-label">Thời gian khám dự kiến</label>
                        <input type="datetime-local" id="inpTime" class="form-control">
                    </div>

                    <!-- LÝ DO -->
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

    // Tải danh sách Tỉnh/Thành
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
        })
        .catch(err => console.error("Lỗi tải tỉnh:", err));
}

window.loadDistricts = function () {
    const pCode = document.getElementById('selProvince').value;
    const selDist = document.getElementById('selDistrict');
    const selWard = document.getElementById('selWard');
    selDist.innerHTML = '<option value="">-- Chọn Quận/Huyện --</option>';
    selWard.innerHTML = '<option value="">-- Chọn Phường/Xã --</option>';
    selDist.disabled = true; selWard.disabled = true;
    if (!pCode) return;
    fetch(`https://provinces.open-api.vn/api/p/${pCode}?depth=2`).then(res => res.json()).then(data => {
        data.districts.forEach(d => {
            const opt = document.createElement('option'); opt.value = d.code; opt.text = d.name;
            opt.dataset.json = JSON.stringify({ code: d.code, name: d.name }); selDist.add(opt);
        }); selDist.disabled = false;
    });
}

window.loadWards = function () {
    const dCode = document.getElementById('selDistrict').value;
    const selWard = document.getElementById('selWard');
    selWard.innerHTML = '<option value="">-- Chọn Phường/Xã --</option>';
    selWard.disabled = true;
    if (!dCode) return;
    fetch(`https://provinces.open-api.vn/api/d/${dCode}?depth=2`).then(res => res.json()).then(data => {
        data.wards.forEach(w => {
            const opt = document.createElement('option'); opt.value = w.code; opt.text = w.name;
            opt.dataset.json = JSON.stringify({ code: w.code, name: w.name }); selWard.add(opt);
        }); selWard.disabled = false;
    });
}

window.submitFullForm = function () {
    // Lấy dữ liệu từ form
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
        alert("Vui lòng điền đầy đủ thông tin!");
        return;
    }

    // Xử lý địa chỉ JSON
    const provinceData = JSON.parse(selProvince.options[selProvince.selectedIndex].dataset.json);
    const districtData = JSON.parse(selDistrict.options[selDistrict.selectedIndex].dataset.json);
    const wardData = JSON.parse(selWard.options[selWard.selectedIndex].dataset.json);

    // Xử lý ngày giờ
    const dt = new Date(timeStr);
    const ts = Math.floor(dt.getTime() / 1000);
    const hours = dt.getHours();

    if (hours < 7 || hours > 17) {
        alert("Giờ khám phải từ 07:00 đến 17:00");
        return;
    }

    // Tạo gói dữ liệu JSON
    const formData = {
        is_full_form: true,
        data: {
            ho_ten: name,
            ngay_sinh: dob + "0101", // Mặc định ngày tháng 01/01
            so_dien_thoai: phone,
            email: "auto@example.com",
            dia_chi_json: { tinh: provinceData, huyen: districtData, xa: wardData },
            dia_chi_ct: street,
            ngay_hen_ts: ts,
            gio_hen: hours,
            ghi_chu: reason
        }
    };

    // Gửi dữ liệu đi
    handleSend(JSON.stringify(formData));

    // Xóa form
    document.getElementById('fullBookingFormUi').remove();

    // Hiện tin nhắn của mình
    addMessage("Tôi", "✅ Đã gửi phiếu đăng ký", "me");
}

async function initChat() {
    let TinodeConstructor = window.tinode || window.Tinode;
    if (typeof TinodeConstructor === 'object' && TinodeConstructor.default) TinodeConstructor = TinodeConstructor.default;
    if (typeof TinodeConstructor === 'object' && TinodeConstructor.Tinode) TinodeConstructor = TinodeConstructor.Tinode;

    chatClient = new TinodeConstructor({
        appName: 'Yte360-Web',
        host: TINODE_HOST,
        apiKey: API_KEY,
        secure: false
    });
    chatClient.enableLogging(true);
    let ctrl = null;

    try {
        await chatClient.connect();
        isConnected = true;

        let u, p, isGuest = false;
        if (currentUser) {
            u = currentUser.username; p = currentUser.password;
        } else {
            let guest = localStorage.getItem('guest_ss');
            if (!guest) {
                const rnd = 'guest_' + Math.random().toString(36).substr(2, 6);
                guest = JSON.stringify({ u: rnd, p: rnd });
                localStorage.setItem('guest_ss', guest);
            }
            const g = JSON.parse(guest);
            u = g.u; p = g.p;
            isGuest = true;
        }

        try {
            ctrl = await chatClient.loginBasic(u, p);
        } catch (e) {
            if (e.code === 401 || e.code === 404) {
                ctrl = await chatClient.createAccountBasic(u, p, true);
                if (!isGuest && currentUser) {
                    const me = chatClient.getMeTopic();
                    await me.setMeta({ desc: { public: { fn: currentUser.fullname } } });
                }
            } else throw e;
        }

        if (chatClient.isAuthenticated() && isGuest) {
            const me = chatClient.getMeTopic();
            me.setMeta({ desc: { public: { fn: "Khách" } } }).catch(() => { });
        }

        if (ctrl && ctrl.params && ctrl.params.user) myCurrentID = ctrl.params.user;
        document.getElementById('status').style.background = "#00e676";

        const me = chatClient.getMeTopic();
        await me.subscribe({ get: { what: 'desc sub data' } });

        myTopic = chatClient.getTopic(BOT_ID);
        if (!myTopic) myTopic = chatClient.newTopicP2P(BOT_ID);

        document.getElementById('messages').innerHTML = "";
        await myTopic.subscribe({ get: { what: 'desc sub data', data: { limit: 50 } } });

        document.getElementById('msgInput').disabled = false;
        document.getElementById('sendBtn').disabled = false;

        setTimeout(() => {
            const msgBox = document.getElementById('messages');
            if (msgBox.children.length === 0) {
                sendGreeting();
            }
        }, 1000);

        myTopic.onData = (msg) => {
            if (!msg || !msg.content) return;
            if (typeof msg.content === 'string' && msg.content.startsWith("/start_greet")) return;

            if (msg.from === BOT_ID) {
                showTyping(false);
                try {
                    const jsonData = JSON.parse(msg.content);

                    if (jsonData.clear_id) {
                        const el = document.getElementById(jsonData.clear_id);
                        if (el) el.remove();
                    }

                    const inputType = jsonData.input_type || 'text';

                    // HIỆN FORM ĐẦY ĐỦ NẾU ĐƯỢC YÊU CẦU
                    if (inputType === 'full_booking_form') {
                        addMessage("Bot", jsonData.text, "bot", jsonData.temp_id);
                        showFullBookingForm();
                        return;
                    }

                    // 2. HIỂN THỊ TIN NHẮN
                    if (jsonData.is_rich_text) {
                        addMessageWithButtons("Bot", jsonData.text, jsonData.buttons, jsonData.temp_id);
                    } else {
                        addMessage("Bot", msg.content, "bot", jsonData.temp_id);
                    }
                } catch (e) {
                    addMessage("Bot", msg.content, "bot");
                }
            } else if (msg.from === myCurrentID || (currentUser && msg.from === currentUser.username)) {
                if (typeof msg.content === 'string' && msg.content.trim().startsWith('{"is_full_form":')) {
                    // Không hiển thị JSON raw
                } else {
                    addMessage("Tôi", msg.content, "me");
                }
            }
        };

    } catch (err) {
        console.error("Lỗi kết nối:", err);
        document.getElementById('status').style.background = "red";
        isConnected = false;
    }
}

function sendGreeting() {
    if (!myTopic) return;
    let customerName = currentUser ? currentUser.fullname : "bạn";
    myTopic.publish("/start_greet " + customerName);
    showTyping(true);
}

function showTyping(show) {
    const indicator = document.getElementById('typingIndicator');
    const box = document.getElementById('messages');
    if (show) {
        indicator.style.display = 'flex';
        box.scrollTop = box.scrollHeight;
    } else {
        indicator.style.display = 'none';
    }
}

async function handleSend(customText = null) {
    const input = document.getElementById('msgInput');
    const txt = customText || input.value.trim();

    if (!txt || !myTopic) return;

    cleanupOldInteractions();

    if (!customText) input.value = '';

    document.getElementById('quickMenu').classList.remove('show');
    showTyping(true);

    try {
        const sender = currentUser ? currentUser.username : JSON.parse(localStorage.getItem('guest_ss')).u;
        fetch('/api/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sender: sender, content: txt, step: 'pre-send' }) });
        await myTopic.publish(txt);
    } catch (e) { console.error(e); }
}

function cleanupOldInteractions() {
    const actions = document.querySelectorAll('.msg-actions');
    actions.forEach(el => el.remove());
}

function addMessage(sender, text, type, elemId = null) {
    if (!text || typeof text !== 'string') return;
    if (text.startsWith("/start_greet")) return;

    const box = document.getElementById('messages');
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

document.getElementById('msgInput').addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleSend();
});

initUI();
initChat();
//  --------------------------
//  --------- LOGIN --------- 
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
            const userInfo = {
                username: data.user.username,
                password: pass,
                fullname: data.user.fullname
            };
            localStorage.setItem('yte360_user', JSON.stringify(userInfo));
            window.location.href = "/";
        } else {
            alert(data.message);
        }
    } catch (err) {
        alert("Lỗi hệ thống: " + err.message);
    }
}


// --------- REGISTER ---------
async function processRegister() {
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();
    const fname = document.getElementById('fullname').value.trim();

    const status = document.getElementById('statusMsg');
    const btn = document.getElementById('regBtn');

    if (!user || !pass || !fname) {
        status.innerText = "Vui lòng điền đủ thông tin.";
        status.className = "error";
        return;
    }

    btn.disabled = true;
    status.innerText = "Đang tạo tài khoản...";
    status.className = "loading";

    try {
        // 1. Đăng ký vào Database Yte360 (Flask)
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass, fullname: fname })
        });
        const data = await res.json();
        if (data.status !== 'success') throw new Error(data.message);

        // 2. Đăng ký lên Tinode Local
        status.innerText = "Đang đồng bộ với Tinode Local...";
        await registerTinode(user, pass, fname);

        status.innerText = "Thành công! Đang chuyển trang...";
        status.className = "success";

        setTimeout(() => window.location.href = "/login", 1500);

    } catch (err) {
        console.error(err);
        status.innerText = "Lỗi: " + err.message;
        status.className = "error";
        btn.disabled = false;
    }
}

async function registerTinode(u, p, fn) {
    let TinodeConstructor = window.tinode || window.Tinode;
    if (typeof TinodeConstructor === 'object' && TinodeConstructor.default) TinodeConstructor = TinodeConstructor.default;
    if (typeof TinodeConstructor === 'object' && TinodeConstructor.Tinode) TinodeConstructor = TinodeConstructor.Tinode;

    // KẾT NỐI LOCAL - secure: false (vì localhost thường không có SSL)
    const client = new TinodeConstructor({
        appName: 'Yte360-Reg',
        host: TINODE_HOST,
        apiKey: API_KEY,
        secure: false
    });

    try {
        await client.connect();
        await client.createAccountBasic(u, p, true);

        const me = client.getMeTopic();
        await me.setMeta({ desc: { public: { fn: fn } } });
    } catch (err) {
        if (err.code === 409) {
            await client.loginBasic(u, p);
            const me = client.getMeTopic();
            await me.setMeta({ desc: { public: { fn: fn } } });
        } else {
            throw err;
        }
    } finally {
        client.disconnect();
    }
}