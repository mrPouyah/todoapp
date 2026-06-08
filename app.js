const STORAGE_KEY = "classflow-data-v2";
const LEGACY_STORAGE_KEY = "classflow-data-v1";

const seedData = {
  selectedStudentId: "",
  students: [],
  sessions: [],
  homework: [],
  lessonPlans: [],
};

let state = loadState();

const elements = {
  emptyWorkspace: document.querySelector("#emptyWorkspace"),
  studentWorkspace: document.querySelector("#studentWorkspace"),
  studentTabs: document.querySelector("#studentTabs"),
  selectedStudentName: document.querySelector("#selectedStudentName"),
  selectedStudentMeta: document.querySelector("#selectedStudentMeta"),
  studentSessionCount: document.querySelector("#studentSessionCount"),
  studentHomeworkCount: document.querySelector("#studentHomeworkCount"),
  studentLessonPlanCount: document.querySelector("#studentLessonPlanCount"),
  sessionsList: document.querySelector("#sessionsList"),
  homeworkList: document.querySelector("#homeworkList"),
  lessonPlansList: document.querySelector("#lessonPlansList"),
};

document.querySelector("#studentForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = formData(event.currentTarget);
  const student = {
    id: createId(),
    name: data.name.trim(),
    level: data.level.trim(),
    contact: data.contact.trim(),
  };

  state.students.push(student);
  state.selectedStudentId = student.id;
  saveAndRender(event.currentTarget);
});

document.querySelector("#sessionForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const student = selectedStudent();
  if (!student) return;

  const data = formData(event.currentTarget);
  if (data.status === "current") {
    state.sessions = state.sessions.map((session) => (
      session.studentId === student.id ? { ...session, status: "upcoming" } : session
    ));
  }

  state.sessions.push({
    id: createId(),
    studentId: student.id,
    title: data.title.trim(),
    date: data.date,
    status: data.status,
    notes: data.notes.trim(),
  });
  saveAndRender(event.currentTarget);
});

document.querySelector("#homeworkForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const student = selectedStudent();
  if (!student) return;

  const data = formData(event.currentTarget);
  state.homework.push({
    id: createId(),
    studentId: student.id,
    title: data.title.trim(),
    dueDate: data.dueDate,
    details: data.details.trim(),
    done: false,
  });
  saveAndRender(event.currentTarget);
});

document.querySelector("#lessonPlanForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const student = selectedStudent();
  if (!student) return;

  const data = formData(event.currentTarget);
  state.lessonPlans.push({
    id: createId(),
    studentId: student.id,
    title: data.title.trim(),
    sessionDate: data.sessionDate,
    objectives: data.objectives.trim(),
    activities: data.activities.trim(),
  });
  saveAndRender(event.currentTarget);
});

document.querySelector("#deleteStudent").addEventListener("click", () => {
  const student = selectedStudent();
  if (!student) return;

  const confirmed = confirm(`Delete ${student.name} and all of their sessions, homework, and lesson plans?`);
  if (!confirmed) return;

  state.students = state.students.filter((item) => item.id !== student.id);
  state.sessions = state.sessions.filter((item) => item.studentId !== student.id);
  state.homework = state.homework.filter((item) => item.studentId !== student.id);
  state.lessonPlans = state.lessonPlans.filter((item) => item.studentId !== student.id);
  state.selectedStudentId = state.students[0]?.id || "";
  persist();
  render();
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
    state = normalizeState(JSON.parse(await file.text()));
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
  const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!saved) return structuredClone(seedData);

  try {
    return normalizeState(JSON.parse(saved));
  } catch {
    return structuredClone(seedData);
  }
}

function normalizeState(value) {
  const normalized = { ...structuredClone(seedData), ...value };
  normalized.students = Array.isArray(normalized.students) ? normalized.students : [];
  normalized.sessions = Array.isArray(normalized.sessions) ? normalized.sessions : [];
  normalized.homework = Array.isArray(normalized.homework) ? normalized.homework : [];
  normalized.lessonPlans = Array.isArray(normalized.lessonPlans) ? normalized.lessonPlans : [];

  const fallbackStudentId = normalized.students[0]?.id || "";
  normalized.sessions = normalized.sessions.map((item) => ({
    ...item,
    studentId: item.studentId || fallbackStudentId,
  }));
  normalized.homework = normalized.homework.map((item) => ({
    ...item,
    studentId: item.studentId || fallbackStudentId,
    done: Boolean(item.done),
  }));
  normalized.lessonPlans = normalized.lessonPlans.map((item) => ({
    ...item,
    studentId: item.studentId || fallbackStudentId,
  }));

  const hasSelected = normalized.students.some((student) => student.id === normalized.selectedStudentId);
  normalized.selectedStudentId = hasSelected ? normalized.selectedStudentId : fallbackStudentId;
  return normalized;
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

function selectedStudent() {
  return state.students.find((student) => student.id === state.selectedStudentId);
}

function selectStudent(studentId) {
  state.selectedStudentId = studentId;
  persist();
  render();
}

function render() {
  renderStudentTabs();
  renderWorkspace();
}

function renderStudentTabs() {
  elements.studentTabs.innerHTML = "";

  if (!state.students.length) {
    elements.studentTabs.innerHTML = '<div class="empty-state">No students yet.</div>';
    return;
  }

  state.students.forEach((student) => {
    const button = document.createElement("button");
    button.className = "student-tab";
    button.type = "button";
    button.classList.toggle("active", student.id === state.selectedStudentId);
    button.innerHTML = `
      <span>${escapeHtml(student.name)}</span>
      <small>${escapeHtml(student.level || "No level")}</small>
    `;
    button.addEventListener("click", () => selectStudent(student.id));
    elements.studentTabs.append(button);
  });
}

function renderWorkspace() {
  const student = selectedStudent();
  const hasStudent = Boolean(student);
  elements.emptyWorkspace.classList.toggle("hidden", hasStudent);
  elements.studentWorkspace.classList.toggle("hidden", !hasStudent);
  if (!student) return;

  const sessions = state.sessions
    .filter((item) => item.studentId === student.id)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const homework = state.homework
    .filter((item) => item.studentId === student.id)
    .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
  const lessonPlans = state.lessonPlans
    .filter((item) => item.studentId === student.id)
    .sort((a, b) => (a.sessionDate || "").localeCompare(b.sessionDate || ""));

  elements.selectedStudentName.textContent = student.name;
  elements.selectedStudentMeta.textContent = [student.level, student.contact].filter(Boolean).join(" - ") || "No details added.";
  elements.studentSessionCount.textContent = sessions.length;
  elements.studentHomeworkCount.textContent = homework.filter((item) => !item.done).length;
  elements.studentLessonPlanCount.textContent = lessonPlans.length;

  renderList(elements.sessionsList, sessions, (session) => ({
    title: session.title,
    meta: `${formatDate(session.date)} - ${session.status}`,
    body: session.notes || "No notes added.",
    actions: [
      {
        label: "Delete",
        className: "danger-action",
        onClick: () => deleteItem("sessions", session.id),
      },
    ],
  }), "No sessions for this student yet.");

  renderList(elements.homeworkList, homework, (item) => ({
    title: item.title,
    meta: `${formatDate(item.dueDate)} - ${item.done ? "Done" : "Open"}`,
    body: item.details || "No details added.",
    actions: [
      {
        label: item.done ? "Reopen" : "Done",
        className: "ghost-button small-action",
        onClick: () => toggleHomework(item.id),
      },
      {
        label: "Delete",
        className: "danger-action",
        onClick: () => deleteItem("homework", item.id),
      },
    ],
  }), "No homework assigned to this student yet.");

  renderList(elements.lessonPlansList, lessonPlans, (plan) => ({
    title: plan.title,
    meta: plan.sessionDate ? formatDate(plan.sessionDate) : "No date set.",
    body: `Objectives:\n${plan.objectives || "Not added."}\n\nActivities:\n${plan.activities || "Not added."}`,
    actions: [
      {
        label: "Delete",
        className: "danger-action",
        onClick: () => deleteItem("lessonPlans", plan.id),
      },
    ],
  }), "No lesson plans for this student yet.");
}

function renderList(container, items, mapItem, emptyText) {
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

    const actions = card.querySelector(".item-actions");
    viewModel.actions.forEach((action) => {
      const button = document.createElement("button");
      button.className = action.className;
      button.type = "button";
      button.textContent = action.label;
      button.addEventListener("click", action.onClick);
      actions.append(button);
    });

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

function formatDate(value) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
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
