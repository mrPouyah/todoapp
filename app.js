const STORAGE_KEY = "classflow-data-v3";
const LEGACY_STORAGE_KEYS = ["classflow-data-v2", "classflow-data-v1"];

const seedData = {
  selectedStudentId: "",
  selectedSection: "overview",
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
  editStudentForm: document.querySelector("#editStudentForm"),
  studentSessionProgress: document.querySelector("#studentSessionProgress"),
  studentHomeworkCount: document.querySelector("#studentHomeworkCount"),
  nextSessionDate: document.querySelector("#nextSessionDate"),
  currentSessionCard: document.querySelector("#currentSessionCard"),
  nextSessionCard: document.querySelector("#nextSessionCard"),
  overviewHomeworkList: document.querySelector("#overviewHomeworkList"),
  sessionsList: document.querySelector("#sessionsList"),
  homeworkList: document.querySelector("#homeworkList"),
  currentSyllabusForm: document.querySelector("#currentSyllabusForm"),
  nextSyllabusForm: document.querySelector("#nextSyllabusForm"),
};

document.querySelector("#studentForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = formData(event.currentTarget);
  const student = normalizeStudent({
    id: createId(),
    name: data.name,
    level: data.level,
    contact: data.contact,
    plannedSessions: data.plannedSessions,
  });

  state.students.push(student);
  state.selectedStudentId = student.id;
  state.selectedSection = "overview";
  saveAndRender(event.currentTarget);
});

document.querySelector("#editStudent").addEventListener("click", () => {
  const student = selectedStudent();
  if (!student) return;

  elements.editStudentForm.name.value = student.name;
  elements.editStudentForm.level.value = student.level;
  elements.editStudentForm.contact.value = student.contact;
  elements.editStudentForm.plannedSessions.value = student.plannedSessions || "";
  elements.editStudentForm.classList.remove("hidden");
});

document.querySelector("#cancelEditStudent").addEventListener("click", () => {
  elements.editStudentForm.reset();
  elements.editStudentForm.classList.add("hidden");
});

elements.editStudentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const student = selectedStudent();
  if (!student) return;

  const data = formData(event.currentTarget);
  state.students = state.students.map((item) => (
    item.id === student.id
      ? normalizeStudent({ ...item, ...data })
      : item
  ));
  elements.editStudentForm.classList.add("hidden");
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

elements.currentSyllabusForm.addEventListener("submit", (event) => {
  event.preventDefault();
  updateSelectedStudent({
    currentSyllabus: event.currentTarget.currentSyllabus.value.trim(),
    currentLessonPlan: event.currentTarget.currentLessonPlan.value.trim(),
  });
});

elements.nextSyllabusForm.addEventListener("submit", (event) => {
  event.preventDefault();
  updateSelectedStudent({
    nextSyllabus: event.currentTarget.nextSyllabus.value.trim(),
    nextLessonPlan: event.currentTarget.nextLessonPlan.value.trim(),
  });
});

document.querySelector("#deleteStudent").addEventListener("click", () => {
  const student = selectedStudent();
  if (!student) return;
  deleteStudent(student.id);
});

document.querySelectorAll(".workspace-tab").forEach((button) => {
  button.addEventListener("click", () => {
    state.selectedSection = button.dataset.section;
    persist();
    renderWorkspaceTabs();
  });
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
  const keys = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS];
  const saved = keys.map((key) => localStorage.getItem(key)).find(Boolean);
  if (!saved) return structuredClone(seedData);

  try {
    return normalizeState(JSON.parse(saved));
  } catch {
    return structuredClone(seedData);
  }
}

function normalizeState(value) {
  const normalized = { ...structuredClone(seedData), ...value };
  normalized.students = Array.isArray(normalized.students) ? normalized.students.map(normalizeStudent) : [];
  normalized.sessions = Array.isArray(normalized.sessions) ? normalized.sessions : [];
  normalized.homework = Array.isArray(normalized.homework) ? normalized.homework : [];
  normalized.lessonPlans = Array.isArray(normalized.lessonPlans) ? normalized.lessonPlans : [];

  const fallbackStudentId = normalized.students[0]?.id || "";
  normalized.sessions = normalized.sessions.map((item) => ({
    ...item,
    id: item.id || createId(),
    studentId: item.studentId || fallbackStudentId,
    title: item.title || "Class session",
    status: item.status || "upcoming",
    notes: item.notes || "",
  }));
  normalized.homework = normalized.homework.map((item) => ({
    ...item,
    id: item.id || createId(),
    studentId: item.studentId || fallbackStudentId,
    title: item.title || "Homework",
    details: item.details || "",
    done: Boolean(item.done),
  }));
  normalized.lessonPlans = normalized.lessonPlans.map((item) => ({
    ...item,
    id: item.id || createId(),
    studentId: item.studentId || fallbackStudentId,
  }));

  const hasSelected = normalized.students.some((student) => student.id === normalized.selectedStudentId);
  normalized.selectedStudentId = hasSelected ? normalized.selectedStudentId : fallbackStudentId;
  normalized.selectedSection = ["overview", "sessions", "syllabus", "homework"].includes(normalized.selectedSection)
    ? normalized.selectedSection
    : "overview";
  return normalized;
}

function normalizeStudent(student) {
  return {
    id: student.id || createId(),
    name: String(student.name || "Student").trim(),
    level: String(student.level || "").trim(),
    contact: String(student.contact || "").trim(),
    plannedSessions: Math.max(0, Number.parseInt(student.plannedSessions, 10) || 0),
    currentSyllabus: String(student.currentSyllabus || "").trim(),
    currentLessonPlan: String(student.currentLessonPlan || "").trim(),
    nextSyllabus: String(student.nextSyllabus || "").trim(),
    nextLessonPlan: String(student.nextLessonPlan || "").trim(),
  };
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

function selectedStudentSessions() {
  const student = selectedStudent();
  if (!student) return [];
  return state.sessions
    .filter((item) => item.studentId === student.id)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

function selectedStudentHomework() {
  const student = selectedStudent();
  if (!student) return [];
  return state.homework
    .filter((item) => item.studentId === student.id)
    .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
}

function selectStudent(studentId) {
  state.selectedStudentId = studentId;
  state.selectedSection = "overview";
  elements.editStudentForm.classList.add("hidden");
  persist();
  render();
}

function updateSelectedStudent(changes) {
  const student = selectedStudent();
  if (!student) return;

  state.students = state.students.map((item) => (
    item.id === student.id ? normalizeStudent({ ...item, ...changes }) : item
  ));
  persist();
  render();
}

function deleteStudent(studentId) {
  state.students = state.students.filter((item) => item.id !== studentId);
  state.sessions = state.sessions.filter((item) => item.studentId !== studentId);
  state.homework = state.homework.filter((item) => item.studentId !== studentId);
  state.lessonPlans = state.lessonPlans.filter((item) => item.studentId !== studentId);
  state.selectedStudentId = state.students[0]?.id || "";
  state.selectedSection = "overview";
  elements.editStudentForm.classList.add("hidden");
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
      <small>${escapeHtml(student.level || "No level")} - ${sessionProgressText(student)}</small>
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

  const sessions = selectedStudentSessions();
  const homework = selectedStudentHomework();
  const currentSession = sessions.find((session) => session.status === "current");
  const nextSession = [...sessions]
    .filter((session) => session.status !== "completed")
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))[0];

  elements.selectedStudentName.textContent = student.name;
  elements.selectedStudentMeta.textContent = [
    student.level,
    student.contact,
    `${sessions.length} of ${student.plannedSessions || 0} sessions`,
  ].filter(Boolean).join(" - ");
  elements.studentSessionProgress.textContent = `${sessions.length} / ${student.plannedSessions || 0}`;
  elements.studentHomeworkCount.textContent = homework.filter((item) => !item.done).length;
  elements.nextSessionDate.textContent = nextSession ? formatDate(nextSession.date) : "No date";

  fillSyllabusForms(student);
  renderSpotlight(elements.currentSessionCard, currentSession, student.currentSyllabus, student.currentLessonPlan, "No current session yet.");
  renderSpotlight(elements.nextSessionCard, nextSession, student.nextSyllabus, student.nextLessonPlan, "No upcoming session yet.");
  renderSessions(sessions);
  renderHomework(homework);
  renderOverviewHomework(homework);
  renderWorkspaceTabs();
}

function renderWorkspaceTabs() {
  document.querySelectorAll(".workspace-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.section === state.selectedSection);
  });
  document.querySelectorAll(".workspace-section").forEach((section) => {
    section.classList.toggle("active", section.id === `${state.selectedSection}Section`);
  });
}

function fillSyllabusForms(student) {
  elements.currentSyllabusForm.currentSyllabus.value = student.currentSyllabus;
  elements.currentSyllabusForm.currentLessonPlan.value = student.currentLessonPlan;
  elements.nextSyllabusForm.nextSyllabus.value = student.nextSyllabus;
  elements.nextSyllabusForm.nextLessonPlan.value = student.nextLessonPlan;
}

function renderSpotlight(container, session, syllabus, lessonPlan, emptyText) {
  if (!session && !syllabus && !lessonPlan) {
    container.className = "empty-state";
    container.textContent = emptyText;
    return;
  }

  container.className = "spotlight-card";
  container.innerHTML = `
    <strong>${escapeHtml(session?.title || "No session selected")}</strong>
    <span class="meta">${escapeHtml(session ? `${formatDate(session.date)} - ${session.status}` : "Syllabus only")}</span>
    <p class="body-text">${escapeHtml(session?.notes || "No session notes.")}</p>
    <p class="body-text"><strong>Syllabus:</strong>\n${escapeHtml(syllabus || "Not added.")}</p>
    <p class="body-text"><strong>Lesson plan:</strong>\n${escapeHtml(lessonPlan || "Not added.")}</p>
  `;
}

function renderSessions(sessions) {
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
}

function renderHomework(homework) {
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
}

function renderOverviewHomework(homework) {
  const openHomework = homework.filter((item) => !item.done).slice(0, 4);
  renderList(elements.overviewHomeworkList, openHomework, (item) => ({
    title: item.title,
    meta: formatDate(item.dueDate),
    body: item.details || "No details added.",
    actions: [
      {
        label: "Done",
        className: "ghost-button small-action",
        onClick: () => toggleHomework(item.id),
      },
    ],
  }), "No open homework for this student.");
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

function sessionProgressText(student) {
  const count = state.sessions.filter((session) => session.studentId === student.id).length;
  return `${count}/${student.plannedSessions || 0} sessions`;
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
