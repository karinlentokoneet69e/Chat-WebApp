let ws, isLoggedIn = false, currentUsername = "";

const getCookie = name => document.cookie.split(';').find(c => c.trim().startsWith(name + "="))?.split("=")[1] || null;
const el = id => document.getElementById(id);
const showScreen = (show, hide) => (el(show).style.display = "block", el(hide).style.display = "none");
const request = (path, data) => fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json());
const setCookie = (name, value) => document.cookie = `${name}=${value}; max-age=${30 * 24 * 60 * 60}; path=/`;
const clearInputs = (...ids) => ids.forEach(id => el(id).value = "");

if ((token = getCookie("chatToken")) && (username = getCookie("username"))) {
  isLoggedIn = true;
  currentUsername = username;
  showChat();
  connectWebSocket();
}

const toggle = (show, hide, clearError = true) => {
  showScreen(show, hide);
  if (clearError) el(show + "Error").textContent = "";
};

const showLogin = () => toggle("loginForm", "registerForm");
const showRegister = () => toggle("registerForm", "loginForm");

const authRequest = (endpoint, usnField, pwdField, errorField, onSuccess) => {
  const username = el(usnField).value;
  const password = el(pwdField).value;
  if (!username || !password) {
    el(errorField).textContent = "Täytä kaikki kentät";
    return;
  }
  request(`/${endpoint}`, { username, password }).then(data => {
    if (data.success) {
      el(errorField).textContent = "";
      onSuccess(data);
    } else {
      el(errorField).textContent = data.message;
    }
  });
};

function register() {
  authRequest("register", "regUsername", "regPassword", "registerError", (data) => {
    alert(data.message);
    toggle("loginForm", "registerForm");
    el("username").value = el("regUsername").value;
    clearInputs("regUsername", "regPassword");
  });
}

function login() {
  authRequest("login", "username", "password", "loginError", (data) => {
    setCookie("chatToken", data.token);
    setCookie("username", data.username);
    isLoggedIn = true;
    currentUsername = data.username;
    showChat();
    connectWebSocket();
  });
}

function logout() {
  [setCookie("chatToken", ""), setCookie("username", "")];
  isLoggedIn = false;
  currentUsername = "";
  clearInputs("username", "password", "regUsername", "regPassword");
  if (ws) ws.close();
  showScreen("loginScreen", "chatScreen");
  toggle("loginForm", "registerForm", false);
}

function showChat() {
  showScreen("chatScreen", "loginScreen");
  el("currentUser").textContent = currentUsername;
}

const connectWebSocket = () => {
  ws = new WebSocket(`ws://${location.host}`);
  ws.onmessage = e => {
    const li = document.createElement("li");
    try {
      const msg = JSON.parse(e.data);
      if (msg.isMod) {
        li.classList.add("mod-message");
        li.innerHTML = `<img class="mod-badge" src="mod-badge.png" alt="mod"><span class="mod-name">${msg.name}</span>: ${msg.text}`;
      } else if (msg.isVip) {
        li.classList.add("vip-message");
        li.innerHTML = `<span class="vip-badge">⭐</span><span class="vip-name">${msg.name}</span>: ${msg.text}`;
      } else {
        li.textContent = msg.name + ": " + msg.text;
      }
    } catch {
      li.textContent = e.data;
    }
    el("chat").appendChild(li);
  };
};

const send = () => {
  if (!isLoggedIn) return alert("Kirjaudu ensin sisään");
  const msg = el("msg").value;
  if (!msg.trim()) return;
  ws.send(currentUsername + ": " + msg);
  el("msg").value = "";
};