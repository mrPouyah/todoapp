const STORAGE_KEY = "classflow-data-v1";

const seedData = {
  students: [],
  sessions: [],
  homework: [],
  syllabus: [],
  lessonPlans: [],
};

let state = loadState();

const views = {
  dashboard: document.querySelector("#dashboardView"),
  students: document.querySelector("#studentsView"),
  sessions: document.querySelector("#sessionsView"),
  homework: document.querySelector("#homeworkView"),
  syllabus: document.querySelector("#syllabusView"),
  lessonPlans: document.querySelector("#lessonPlansView"),
};

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.view));
});

document.querySelectorAll("[data-open-view]").forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.openView));
});

document.querySelector("#studentForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = formData(event.currentTarget);
  state.students.push({
    id: createId(),
    name: data.name,
    level: data.level,
    contact: data.contact,
  });
  saveAndRender(event.currentTarget);
});

document.querySelector("#sessionForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = formData(event.currentTarget);
  if (data.status === "current") {
    state.sessions = state.sessions.map((session) => ({ ...session, status: "upcoming" }));
  }
  state.sessions.push({
    id: createId(),
    title: data.title,
    date: data.date,
    status: data.status,
    notes: data.notes,
  });
  saveAndRender(event.currentTarget);
});

document.querySelector("#homeworkForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = formData(event.currentTarget);
  state.homework.push({
    id: createId(),
    title: data.title,
    dueDate: data.dueDate,
    studentId: data.studentId,
    details: data.details,
    done: false,
  });
  saveAndRender(event.currentTarget);
});

document.querySelector("#syllabusForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = formData(event.currentTarget);
  state.syllabus.push({
    id: createId(),
    topic: data.topic,
    targetDate: data.targetDate,
    status: data.status,
    resources: data.resources,
  });
  saveAndRender(event.currentTarget);
});

document.querySelector("#lessonPlanForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = formData(event.currentTarget);
  state.lessonPlans.push({
    id: createId(),
    title: data.title,
    sessionDate: data.sessionDate,
    objectives: data.objectives,
    activities: data.activities,
  });
  saveAndRender(event.currentTarget);
});

document.querySelector("#exportData").addEventListener("click", () => {
  const file = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = `classflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
});

document.querySelector("#importData").addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;

  try {
    const imported = JSON.parse(await file.text());
    state = { ...seedData, ...imported };
    persist();
    render();
  } catch {
    alert("That file could not be imported. Please choose a ClassFlow JSON backup.");
  } finally {
    event.target.value = "";
  }
});

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(seedData);

  try {
    return { ...structuredClone(seedData), ...JSON.parse(saved) };
  } catch {
    return structuredClone(seedData);
  }
}

function createId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function saveAndRender(form) {
  form.reset();
  persist();
  render();
}

function showView(viewName) {
  Object.entries(views).forEach(([name, view]) => {
    view.classList.toggle("active", name === viewName);
  });
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });
}

function render() {
  renderDashboard();
  renderStudents();
  renderSessions();
  renderHomework();
  renderSyllabus();
  renderLessonPlans();
  renderStudentOptions();
}

function renderDashboard() {
  setText("#studentCount", state.students.length);
  setText("#sessionCount", state.sessions.length);
  setText("#homeworkCount", state.homework.filter((item) => !item.done).length);
  setText("#lessonPlanCount", state.lessonPlans.length);

  const current = state.sessions.find((session) => session.status === "current");
  renderSpotlight("#currentSession", current, "No session marked current yet.");

  const next = state.sessions
    .filter((session) => session.status !== "completed" && session.date)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  renderSpotlight("#nextSession", next, "Add upcoming sessions to see the next one here.");

  const dueSoon = state.homework
    .filter((item) => !item.done)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 4);
  renderList("#dueSoonList", dueSoon, (item) => ({
    title: item.title,
    meta: `${formatDate(item.dueDate)} • ${studentName(item.studentId)}`,
    body: item.details || "No details added.",
  }), "No open homework yet.");
}

function renderSpotlight(selector, session, emptyText) {
  const container = document.querySelector(selector);
  if (!session) {
    container.className = "empty-state";
    container.textContent = emptyText;
    return;
  }
  container.className = "list-stack";
  container.innerHTML = `
    <strong>${escapeHtml(session.title)}</strong>
    <span class="meta">${formatDate(session.date)} • ${escapeHtml(session.status)}</span>
    <p class="body-text">${escapeHtml(session.notes || "No notes added.")}</p>
  `;
}

function renderStudents() {
  renderList("#studentsList", state.students, (student) => ({
    title: student.name,
    meta: [student.level, student.contact].filter(Boolean).join(" • ") || "No extra details.",
    body: "",
  }), "No students added yet.", "students");
}

function renderSessions() {
  const sessions = [...state.sessions].sort((a, b) => b.date.localeCompare(a.date));
  renderList("#sessionsList", sessions, (session) => ({
    title: session.title,
    meta: formatDate(session.date),
    body: `${session.notes || "No notes added."}\n\nStatus: ${session.status}`,
  }), "No sessions added yet.", "sessions");
}

function renderHomework() {
  const homework = [...state.homework].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  renderList("#homeworkList", homework, (item) => ({
    title: item.title,
    meta: `${formatDate(item.dueDate)} • ${studentName(item.studentId)} • ${item.done ? "Done" : "Open"}`,
    body: item.details || "No details added.",
  }), "No homework added yet.", "homework");
}

function renderSyllabus() {
  renderList("#syllabusList", state.syllabus, (item) => ({
    title: item.topic,
    meta: `${item.status}${item.targetDate ? ` • ${formatDate(item.targetDate)}` : ""}`,
    body: item.resources || "No resources added.",
  }), "No syllabus topics added yet.", "syllabus");
}

function renderLessonPlans() {
  const plans = [...state.lessonPlans].sort((a, b) => (a.sessionDate || "").localeCompare(b.sessionDate || ""));
  renderList("#lessonPlansList", plans, (plan) => ({
    title: plan.title,
    meta: plan.sessionDate ? formatDate(plan.sessionDate) : "No date set.",
    body: `Objectives:\n${plan.objectives || "Not added."}\n\nActivities:\n${plan.activities || "Not added."}`,
  }), "No lesson plans added yet.", "lessonPlans");
}

function renderStudentOptions() {
  const select = document.querySelector("#homeworkStudentSelect");
  const selected = select.value;
  select.innerHTML = '<option value="">All students</option>';
  state.students.forEach((student) => {
    const option = document.createElement("option");
    option.value = student.id;
    option.textContent = student.name;
    select.append(option);
  });
  select.value = selected;
}

function renderList(selector, items, mapItem, emptyText, collectionName) {
  const container = document.querySelector(selector);
  container.innerHTML = "";

  if (!items.length) {
    container.innerHTML = `<div class="empty-state">${escapeHtml(emptyText)}</div>`;
    return;
  }

  items.forEach((item) => {
    const viewModel = mapItem(item);
    const card = document.querySelector("#itemTemplate").content.firstElementChild.cloneNode(true);
    card.querySelector("h3").textContent = viewModel.title;
    card.querySelector(".meta").textContent = viewModel.meta;
    card.querySelector(".body-text").textContent = viewModel.body;
    const deleteButton = card.querySelector("button");
    if (collectionName) {
      if (collectionName === "homework") {
        const toggleButton = document.createElement("button");
        toggleButton.className = "ghost-button small-action";
        toggleButton.type = "button";
        toggleButton.textContent = item.done ? "Reopen" : "Done";
        toggleButton.addEventListener("click", () => toggleHomework(item.id));
        card.querySelector(".item-card-header").append(toggleButton);
      }
      deleteButton.addEventListener("click", () => deleteItem(collectionName, item.id));
    } else {
      deleteButton.remove();
    }
    container.append(card);
  });
}

function toggleHomework(id) {
  state.homework = state.homework.map((item) => (
    item.id === id ? { ...item, done: !item.done } : item
  ));
  persist();
  render();
}

function deleteItem(collectionName, id) {
  state[collectionName] = state[collectionName].filter((item) => item.id !== id);
  persist();
  render();
}

function studentName(studentId) {
  if (!studentId) return "All students";
  return state.students.find((student) => student.id === studentId)?.name || "Unknown student";
}

function formatDate(value) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function setText(selector, value) {
  document.querySelector(selector).textContent = value;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

render();
