// --- State ---
let isRegisterMode = false;

// --- Helpers ---
function getCurrentUserId() {
  const token = getToken();

  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.userId;
  } catch {
    return null;
  }
}

function getToken() {
  return localStorage.getItem(CONFIG.STORAGE_KEY);
}

function setToken(token) {
  localStorage.setItem(CONFIG.STORAGE_KEY, token);
}

function removeToken() {
  localStorage.removeItem(CONFIG.STORAGE_KEY);
}

async function apiFetch(route, options = {}) {
  const token = getToken();

  const isFormData = options.body instanceof FormData;
  const headers = { ...options.headers };

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${CONFIG.API_URL}${route}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || data.message || "Request failed");
  }

  return data;
}

// --- Auth ---
function showAuth() {
  document.getElementById("auth-section").style.display = "block";
  document.getElementById("app-section").style.display = "none";
  document.getElementById("logout-btn").style.display = "none";

  renderAuthForm();
}

function renderAuthForm() {
  const fields = isRegisterMode
    ? CONFIG.FIELDS.REGISTER
    : CONFIG.FIELDS.LOGIN;

  const title = isRegisterMode ? "Create Account" : "Welcome Back";

  const switchText = isRegisterMode
    ? 'Already have an account? <a href="#" id="switch-mode">Log in</a>'
    : 'Don’t have an account? <a href="#" id="switch-mode">Sign up</a>';

  const formHTML = `
    <h2>${title}</h2>

    <form id="auth-form">
      ${fields
        .map((f) => {
          const type =
            f === "password"
              ? "password"
              : f === "email"
              ? "email"
              : "text";

          const label =
            f.charAt(0).toUpperCase() + f.slice(1);

          return `
            <div class="form-group">
              <label for="${f}">${label}</label>
              <input type="${type}" id="${f}" name="${f}" required />
            </div>
          `;
        })
        .join("")}

      <button type="submit">${title}</button>
    </form>

    <p class="switch-text">${switchText}</p>
    <p id="auth-error" class="error"></p>
  `;

  document.getElementById("auth-section").innerHTML = formHTML;

  document.getElementById("auth-form").addEventListener("submit", handleAuth);

  document.getElementById("switch-mode").addEventListener("click", (e) => {
    e.preventDefault();
    isRegisterMode = !isRegisterMode;
    renderAuthForm();
  });
}

async function handleAuth(e) {
  e.preventDefault();

  const errorEl = document.getElementById("auth-error");
  errorEl.textContent = "";

  const fields = isRegisterMode
    ? CONFIG.FIELDS.REGISTER
    : CONFIG.FIELDS.LOGIN;

  const route = isRegisterMode
    ? CONFIG.ROUTES.REGISTER
    : CONFIG.ROUTES.LOGIN;

  const body = {};

  fields.forEach((f) => {
    body[f] = document.getElementById(f).value;
  });

  try {
    const data = await apiFetch(route, {
      method: "POST",
      body: JSON.stringify(body),
    });

    setToken(data.token);
    showApp();
  } catch (err) {
    errorEl.textContent = err.message;
  }
}

// --- App ---
async function showApp() {
  document.getElementById("auth-section").style.display = "none";
  document.getElementById("app-section").style.display = "block";
  document.getElementById("logout-btn").style.display = "inline-block";

  renderLeaderboard();
  attachCreateButton(); // 👈 tärkeä fix
  await loadQuestions();
}

// --- LOAD QUESTIONS ---
async function loadQuestions() {
  const container = document.getElementById("questions-container");

  container.innerHTML = `<p class="loading">Loading quizzes...</p>`;

  try {
    const result = await apiFetch(CONFIG.ROUTES.QUESTIONS);
    const questions = result.data || result;

    let html = `<div class="questions-grid">`;

    if (!questions.length) {
      html += `<div class="empty-state">No quiz questions yet.</div>`;
    } else {
      html += questions
        .map(
          (q) => `
        <article class="question-card">
          <h3>${q.question}</h3>

          <div class="question-actions">
            <button class="btn btn-play" data-id="${q.id}">
              Play Quiz
            </button>
          </div>
        </article>
      `
        )
        .join("");
    }

    html += `</div>`;
    container.innerHTML = html;

    container.querySelectorAll(".btn-play").forEach((el) => {
      el.addEventListener("click", () => playQuestion(el.dataset.id));
    });
  } catch (err) {
    container.innerHTML = `<p class="error">${err.message}</p>`;
  }
}

// --- CREATE BUTTON (FIX: ei duplikaatteja) ---
function attachCreateButton() {
  const btn = document.querySelector(".btn.btn-primary");

  if (!btn || btn.dataset.bound) return;

  btn.dataset.bound = "true";
  btn.addEventListener("click", renderCreateQuestionForm);
}

// --- CREATE QUESTION (FIX: IMAGE UPLOAD) ---
function renderCreateQuestionForm() {
  const container = document.getElementById("questions-container");

  container.innerHTML = `
    <div class="question-form-wrapper">
      <button id="back-btn" class="btn btn-secondary" style="margin-bottom:1rem;">
        ← Back
      </button>

      <h2>Create Question</h2>

      <form id="create-question-form">

        <div class="form-group">
          <label>Question</label>
          <input type="text" id="question" required />
        </div>

        <div class="form-group">
          <label>Answer</label>
          <textarea id="answer" rows="5" required></textarea>
        </div>

        <div class="form-group">
          <label>Keywords</label>
          <input type="text" id="keywords" placeholder="js,node" />
        </div>

        <div class="form-group">
          <label>Date</label>
          <input type="date" id="date" required />
        </div>

        <div class="form-group">
          <label>Image</label>
          <input type="file" id="image" accept="image/*" />
        </div>

        <button type="submit" class="btn btn-primary">
          Create Question
        </button>
      </form>
    </div>
  `;

  document.getElementById("back-btn").addEventListener("click", (e) => {
    e.preventDefault();
    loadQuestions();
  });

  document
    .getElementById("create-question-form")
    .addEventListener("submit", handleCreateQuestion);
}

// --- CREATE QUESTION HANDLER (FIX: FormData) ---
async function handleCreateQuestion(e) {
  e.preventDefault();

  try {
    const formData = new FormData();

    formData.append("question", document.getElementById("question").value);
    formData.append("answer", document.getElementById("answer").value);
    formData.append("keywords", document.getElementById("keywords").value);
    formData.append("date", document.getElementById("date").value);

    const file = document.getElementById("image").files[0];
    if (file) {
      formData.append("image", file);
    }

    await apiFetch(CONFIG.ROUTES.QUESTIONS, {
      method: "POST",
      body: formData,
    });

    loadQuestions();
  } catch (err) {
    alert(err.message);
  }
}

// --- PLAY ---
async function playQuestion(qId) {
  const container = document.getElementById("questions-container");

  container.innerHTML = `<p class="loading">Loading question...</p>`;

  try {
    const q = await apiFetch(`${CONFIG.ROUTES.QUESTIONS}/${qId}`);

    container.innerHTML = `
      <button id="back-btn" class="btn btn-secondary" style="margin-bottom:1rem;">
        ← Back
      </button>

      <div class="question-form-wrapper">
        <h2>${q.question}</h2>

        <form id="play-form">
          <div class="form-group">
            <label>Your answer</label>
            <textarea id="play-answer" rows="3" required></textarea>
          </div>

          <button type="submit" class="btn btn-play">
            Submit Answer
          </button>
        </form>

        <div id="play-result"></div>
      </div>
    `;

    document.getElementById("back-btn").addEventListener("click", loadQuestions);

    document.getElementById("play-form").addEventListener("submit", async (e) => {
      e.preventDefault();

      const answer = document.getElementById("play-answer").value;
      const resultEl = document.getElementById("play-result");

      try {
        const result = await apiFetch(
          `${CONFIG.ROUTES.QUESTIONS}/${qId}/play`,
          {
            method: "POST",
            body: JSON.stringify({ answer }),
          }
        );

        resultEl.innerHTML = result.correct
          ? `<div class="play-result correct">✅ Correct!</div>`
          : `<div class="play-result incorrect">❌ Incorrect<br><strong>${result.correctAnswer}</strong></div>`;

        if (result.correct) saveScore(1);
      } catch (err) {
        resultEl.innerHTML = `<p class="error">${err.message}</p>`;
      }
    });
  } catch (err) {
    container.innerHTML = `<p class="error">${err.message}</p>`;
  }
}

// --- LEADERBOARD ---
function saveScore(score) {
  const scores = JSON.parse(localStorage.getItem("leaderboard")) || [];

  scores.push({ score, date: new Date().toLocaleDateString() });
  scores.sort((a, b) => b.score - a.score);

  localStorage.setItem("leaderboard", JSON.stringify(scores));
  renderLeaderboard();
}

function renderLeaderboard() {
  const container = document.getElementById("leaderboard");
  if (!container) return;

  const scores = JSON.parse(localStorage.getItem("leaderboard")) || [];

  container.innerHTML = scores.length
    ? scores
        .slice(0, 10)
        .map(
          (s, i) => `
        <div class="leaderboard-item">
          <span>#${i + 1}</span>
          <span>${s.score} pts</span>
          <span>${s.date}</span>
        </div>
      `
        )
        .join("")
    : `<div class="empty-state">No scores yet</div>`;
}

// --- LOGOUT ---
function handleLogout() {
  removeToken();
  showAuth();
}

// --- INIT ---
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("logout-btn").addEventListener("click", handleLogout);

  if (getToken()) showApp();
  else showAuth();
});