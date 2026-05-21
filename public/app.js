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

  const isFormData =
    options.body instanceof FormData;

  const headers = { ...options.headers };

  if (!isFormData) {
    headers["Content-Type"] =
      "application/json";
  }

  if (token) {
    headers["Authorization"] =
      `Bearer ${token}`;
  }

  const res = await fetch(
    `${CONFIG.API_URL}${route}`,
    {
      ...options,
      headers,
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data.error ||
        data.msg ||
        "Request failed"
    );
  }

  return data;
}

// --- Auth ---
function showAuth() {
  document.getElementById(
    "auth-section"
  ).style.display = "block";

  document.getElementById(
    "app-section"
  ).style.display = "none";

  document.getElementById(
    "logout-btn"
  ).style.display = "none";

  renderAuthForm();
}

function renderAuthForm() {
  const fields = isRegisterMode
    ? CONFIG.FIELDS.REGISTER
    : CONFIG.FIELDS.LOGIN;

  const title = isRegisterMode
    ? "Sign Up"
    : "Log In";

  const switchText = isRegisterMode
    ? 'Already have an account? <a href="#" id="switch-mode">Log in</a>'
    : 'Don\'t have an account? <a href="#" id="switch-mode">Sign up</a>';

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
            f.charAt(0).toUpperCase() +
            f.slice(1);

          return `
          <div class="form-group">
            <label for="${f}">
              ${label}
            </label>

            <input
              type="${type}"
              id="${f}"
              name="${f}"
              required
            />
          </div>
        `;
        })
        .join("")}

      <button type="submit">
        ${title}
      </button>
    </form>

    <p class="switch-text">
      ${switchText}
    </p>

    <p
      id="auth-error"
      class="error"
    ></p>
  `;

  document.getElementById(
    "auth-section"
  ).innerHTML = formHTML;

  document
    .getElementById("auth-form")
    .addEventListener(
      "submit",
      handleAuth
    );

  document
    .getElementById("switch-mode")
    .addEventListener(
      "click",
      (e) => {
        e.preventDefault();

        isRegisterMode =
          !isRegisterMode;

        renderAuthForm();
      }
    );
}

async function handleAuth(e) {
  e.preventDefault();

  const errorEl =
    document.getElementById(
      "auth-error"
    );

  errorEl.textContent = "";

  const fields = isRegisterMode
    ? CONFIG.FIELDS.REGISTER
    : CONFIG.FIELDS.LOGIN;

  const route = isRegisterMode
    ? CONFIG.ROUTES.REGISTER
    : CONFIG.ROUTES.LOGIN;

  const body = {};

  fields.forEach((f) => {
    body[f] =
      document.getElementById(f).value;
  });

  try {
    const data = await apiFetch(
      route,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );

    setToken(data.token);

    showApp();
  } catch (err) {
    errorEl.textContent =
      err.message;
  }
}

// --- App ---
async function showApp() {
  document.getElementById(
    "auth-section"
  ).style.display = "none";

  document.getElementById(
    "app-section"
  ).style.display = "block";

  document.getElementById(
    "logout-btn"
  ).style.display =
    "inline-block";

  await loadQuestions();
}

async function loadQuestions(
  keyword = "",
  page = 1
) {
  const container =
    document.getElementById(
      "questions-container"
    );

  container.innerHTML =
    '<p class="loading">Loading questions...</p>';

  try {
    const params =
      new URLSearchParams({
        page,
        limit:
          CONFIG.QUESTIONS_PER_PAGE,
      });

    if (keyword) {
      params.set("keyword", keyword);
    }

    const result =
      await apiFetch(
        `${CONFIG.ROUTES.QUESTIONS}?${params}`
      );

    const {
      data: questions,
      total,
      totalPages,
    } = result;

    let html = `
      <div class="score-bar">
        <div class="score-item">
          <div class="score-value">
            ${total}
          </div>

          <div class="score-label">
            Questions
          </div>
        </div>
      </div>
    `;

    html += `
      <div class="toolbar">
        <button
          class="btn btn-primary"
          id="new-question-btn"
        >
          + New Question
        </button>
      </div>
    `;

    if (questions.length === 0) {
      html += `
        <p class="empty-state">
          No questions found
        </p>
      `;
    } else {
      html += questions
        .map(
          (q) => `
        <article class="question-card">
          <h3>
            ${q.question}
          </h3>

          <div class="question-actions">
            <button
              class="btn btn-play"
              data-id="${q.id}"
            >
              Play
            </button>
          </div>
        </article>
      `
        )
        .join("");
    }

    container.innerHTML = html;

    container
      .querySelectorAll(".btn-play")
      .forEach((el) => {
        el.addEventListener(
          "click",
          () =>
            playQuestion(
              el.dataset.id
            )
        );
      });
  } catch (err) {
    container.innerHTML = `
      <p class="error">
        ${err.message}
      </p>
    `;
  }
}

// --- Play ---
async function playQuestion(qId) {
  const container =
    document.getElementById(
      "questions-container"
    );

  container.innerHTML =
    '<p class="loading">Loading...</p>';

  try {
    const q = await apiFetch(
      `${CONFIG.ROUTES.QUESTIONS}/${qId}`
    );

    container.innerHTML = `
      <a
        href="#"
        id="back-btn"
        class="back-link"
      >
        &larr; Back
      </a>

      <div
        class="question-form-wrapper"
      >
        <div class="play-question-text">
          ${q.question}
        </div>

        <form id="play-form">
          <div class="form-group">
            <label>
              Your answer
            </label>

            <textarea
              id="play-answer"
              rows="3"
              required
            ></textarea>
          </div>

          <button
            type="submit"
            class="btn btn-play"
          >
            Submit
          </button>
        </form>

        <div id="play-result"></div>
      </div>
    `;

    document
      .getElementById("back-btn")
      .addEventListener(
        "click",
        (e) => {
          e.preventDefault();
          loadQuestions();
        }
      );

    document
      .getElementById("play-form")
      .addEventListener(
        "submit",
        async (e) => {
          e.preventDefault();

          const answer =
            document.getElementById(
              "play-answer"
            ).value;

          const resultEl =
            document.getElementById(
              "play-result"
            );

          try {
            const result =
              await apiFetch(
                `${CONFIG.ROUTES.QUESTIONS}/${qId}/play`,
                {
                  method: "POST",
                  body: JSON.stringify({
                    answer,
                  }),
                }
              );

            if (result.correct) {
              resultEl.innerHTML =
                `
                <div class="play-result correct">
                  Correct!
                </div>
              `;

              saveScore(1);
            } else {
              resultEl.innerHTML =
                `
                <div class="play-result incorrect">
                  Incorrect!
                  Correct answer:
                  <strong>
                    ${result.correctAnswer}
                  </strong>
                </div>
              `;
            }
          } catch (err) {
            resultEl.innerHTML =
              `
              <p class="error">
                ${err.message}
              </p>
            `;
          }
        }
      );
  } catch (err) {
    container.innerHTML = `
      <p class="error">
        ${err.message}
      </p>
    `;
  }
}

// --- AI Question Generator ---
async function generateAIQuestions() {
  const topic =
    document.getElementById(
      "topicInput"
    ).value;

  const difficulty =
    document.getElementById(
      "difficultySelect"
    ).value;

  const container =
    document.getElementById(
      "generatedQuestions"
    );

  if (!topic) {
    container.innerHTML =
      `
      <p class="error">
        Please enter a topic
      </p>
    `;

    return;
  }

  container.innerHTML =
    `
    <p class="loading">
      Generating questions...
    </p>
  `;

  try {
    const questions =
      await apiFetch(
        "/api/generate-questions",
        {
          method: "POST",
          body: JSON.stringify({
            topic,
            difficulty,
          }),
        }
      );

    container.innerHTML =
      questions
        .map(
          (q) => `
        <article class="question-card">
          <h3>
            ${q.question}
          </h3>

          <ul
            style="
              margin-top:1rem;
              padding-left:1.5rem;
            "
          >
            ${q.options
              .map(
                (option) =>
                  `
                  <li
                    style="
                      margin-bottom:0.5rem;
                    "
                  >
                    ${option}
                  </li>
                `
              )
              .join("")}
          </ul>

          <p
            style="
              margin-top:1rem;
              color:#51cf66;
              font-weight:700;
            "
          >
            Correct Answer:
            ${q.correctAnswer}
          </p>
        </article>
      `
        )
        .join("");
  } catch (err) {
    container.innerHTML =
      `
      <p class="error">
        ${err.message}
      </p>
    `;
  }
}

// --- Leaderboard ---
function saveScore(score) {
  const scores =
    JSON.parse(
      localStorage.getItem(
        "leaderboard"
      )
    ) || [];

  scores.push({
    score,
    date: new Date().toLocaleDateString(),
  });

  scores.sort(
    (a, b) => b.score - a.score
  );

  localStorage.setItem(
    "leaderboard",
    JSON.stringify(scores)
  );

  renderLeaderboard();
}

function renderLeaderboard() {
  const container =
    document.getElementById(
      "leaderboard"
    );

  if (!container) return;

  const scores =
    JSON.parse(
      localStorage.getItem(
        "leaderboard"
      )
    ) || [];

  if (scores.length === 0) {
    container.innerHTML =
      "<p>No scores yet</p>";

    return;
  }

  container.innerHTML = scores
    .map(
      (s, index) => `
      <div
        style="
          display:flex;
          justify-content:space-between;
          margin-bottom:0.5rem;
          padding:0.5rem;
          background:rgba(255,255,255,0.05);
          border-radius:8px;
        "
      >
        <span>
          #${index + 1}
        </span>

        <span>
          ${s.score} pts
        </span>

        <span>
          ${s.date}
        </span>
      </div>
    `
    )
    .join("");
}

function handleLogout() {
  removeToken();
  showAuth();
}

// --- Init ---
document.addEventListener(
  "DOMContentLoaded",
  () => {
    document
      .getElementById(
        "logout-btn"
      )
      .addEventListener(
        "click",
        handleLogout
      );

    const generateBtn =
      document.getElementById(
        "generateBtn"
      );

    if (generateBtn) {
      generateBtn.addEventListener(
        "click",
        generateAIQuestions
      );
    }

    renderLeaderboard();

    if (getToken()) {
      showApp();
    } else {
      showAuth();
    }
  }
);