// === Инициализация ===
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let categories = JSON.parse(localStorage.getItem('categories')) || [
  { id: 'personal', name: 'Личное', color: '#fef2fe' },
  { id: 'work', name: 'Работа', color: '#dbeafe' },
  { id: 'study', name: 'Учёба', color: '#fef3c7' }
];
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

// === DOM ===
const taskList = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const calendarContainer = document.getElementById('calendar-container');
const calendarGrid = document.getElementById('calendar-grid');
const calendarMonthYear = document.getElementById('calendar-month-year');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const viewMonthBtn = document.getElementById('view-month');
const viewWeekBtn = document.getElementById('view-week');
const prevWeekBtn = document.getElementById('prev-week');
const nextWeekBtn = document.getElementById('next-week');
const weekNavigation = document.getElementById('week-navigation');
const exportBtn = document.getElementById('export-btn');
const themeToggle = document.getElementById('theme-toggle');
const addTaskBtn = document.getElementById('add-task-btn');
const addProjectBtn = document.getElementById('add-project-btn');
const projectList = document.getElementById('project-list');
const currentViewTitle = document.getElementById('current-view-title');

const addTaskModal = document.getElementById('add-task-modal');
const taskTitleInput = document.getElementById('task-title');
const taskDatetimeInput = document.getElementById('task-datetime');
const taskDescriptionInput = document.getElementById('task-description');
const taskCategorySelect = document.getElementById('task-category');
const saveTaskBtn = document.getElementById('save-task-btn');

const editCategoryModal = document.getElementById('edit-category-modal');
const editCategoryNameInput = document.getElementById('edit-category-name');
const editCategoryColorInput = document.getElementById('edit-category-color');
const saveCategoryBtn = document.getElementById('save-category-btn');
const cancelCategoryBtn = document.getElementById('cancel-category-btn');

const taskModal = document.getElementById('task-modal');
const modalTaskTitle = document.getElementById('modal-task-title');
const modalTaskCategory = document.getElementById('modal-task-category');
const modalTaskDatetime = document.getElementById('modal-task-datetime');
const modalTaskDescription = document.getElementById('modal-task-description');

let currentFilter = 'today'; // today, inbox, upcoming, all, completed
let editingCategoryId = null;
let currentCalendarDate = new Date();
let currentView = 'month'; // month, week
let currentWeekStartDate = null; // Для хранения начала текущей недели в режиме "Неделя"
let currentTaskId = null; // Для хранения ID текущей задачи

// === Сохранение ===
function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

function saveCategories() {
  localStorage.setItem('categories', JSON.stringify(categories));
}

// === Тема ===
themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const newTheme = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
});

// === Экспорт ===
exportBtn.addEventListener('click', () => {
  if (tasks.length === 0) {
    alert('Список задач пуст.');
    return;
  }
  const blob = new Blob([JSON.stringify({ tasks, categories }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'simpletask-google.json';
  a.click();
  URL.revokeObjectURL(url);
});

// === Управление категориями ===
function renderCategories() {
  projectList.innerHTML = '';

  categories.forEach(cat => {
    const li = document.createElement('li');
    li.className = 'project-item';
    li.dataset.id = cat.id;
    li.innerHTML = `
      <span class="project-name"># ${cat.name}</span>
      <div class="project-actions">
        <button class="edit-cat-btn">✏️</button>
        <button class="delete-cat-btn">🗑️</button>
      </div>
    `;
    projectList.appendChild(li);
  });

  // Обновляем выпадающий список категорий в форме
  taskCategorySelect.innerHTML = '';
  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat.id;
    option.textContent = cat.name;
    taskCategorySelect.appendChild(option);
  });
}

addProjectBtn.addEventListener('click', () => {
  const name = prompt('Введите название нового проекта:');
  if (!name || name.trim() === '') return;
  categories.push({
    id: Date.now().toString(),
    name: name.trim(),
    color: '#ffffff'
  });
  saveCategories();
  renderCategories();
});

document.addEventListener('click', e => {
  if (e.target.classList.contains('edit-cat-btn')) {
    const li = e.target.closest('.project-item');
    editingCategoryId = li.dataset.id;
    const category = categories.find(c => c.id === editingCategoryId);
    editCategoryNameInput.value = category.name;
    editCategoryColorInput.value = category.color;
    editCategoryModal.style.display = 'flex';
  }

  if (e.target.classList.contains('delete-cat-btn')) {
    const li = e.target.closest('.project-item');
    const id = li.dataset.id;
    if (confirm(`Удалить проект "${categories.find(c => c.id === id).name}"? Все задачи переместятся в "Личное".`)) {
      categories = categories.filter(c => c.id !== id);
      tasks = tasks.map(t => t.category === id ? { ...t, category: 'personal' } : t);
      saveCategories();
      saveTasks();
      renderCategories();
      renderTasks();
    }
  }
});

saveCategoryBtn.addEventListener('click', () => {
  const newName = editCategoryNameInput.value.trim();
  const newColor = editCategoryColorInput.value;
  if (!newName) {
    alert('Название не может быть пустым.');
    return;
  }
  const category = categories.find(c => c.id === editingCategoryId);
  if (category) {
    category.name = newName;
    category.color = newColor;
    saveCategories();
    renderCategories();
    renderTasks();
  }
  editCategoryModal.style.display = 'none';
});

cancelCategoryBtn.addEventListener('click', () => {
  editCategoryModal.style.display = 'none';
});

document.querySelector('.close').addEventListener('click', () => {
  addTaskModal.style.display = 'none';
  editCategoryModal.style.display = 'none';
  closeTaskModal();
});

// === Фильтрация ===
document.querySelectorAll('.sidebar-nav a').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    link.classList.add('active');
    currentFilter = link.dataset.filter;
    updateViewTitle();
    renderTasks();
  });
});

function updateViewTitle() {
  const titles = {
    today: 'Сегодня',
    inbox: 'Входящие',
    upcoming: 'Предстоящее',
    all: 'Все задачи',
    completed: 'Выполнено'
  };
  currentViewTitle.textContent = titles[currentFilter] || 'Задачи';
}

// === Вспомогательные функции ===
function formatDateTime(isoString) {
  if (!isoString) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(isoString));
}

function getCategoryName(id) {
  const cat = categories.find(c => c.id === id);
  return cat ? cat.name : 'Без категории';
}

function getCategoryColor(id) {
  const cat = categories.find(c => c.id === id);
  return cat ? cat.color : '#ffffff';
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function getFirstDayOfMonth(date) {
  const d = new Date(date);
  d.setDate(1);
  return d;
}

function getLastDayOfMonth(date) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1, 0);
  return d;
}

function getDaysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function getDayOfWeek(date) {
  return date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
}

function isToday(date) {
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
}

function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  // Понедельник = 1, воскресенье = 0
  // Если день = 0 (воскресенье), то вычитаем 6 дней, иначе вычитаем (day - 1)
  const diff = d.getDate() - (day === 0 ? 6 : day - 1);
  return new Date(d.setDate(diff));
}

function getEndOfWeek(date) {
  const start = getStartOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end;
}

function getNextWeek(startDate) {
  const next = new Date(startDate);
  next.setDate(next.getDate() + 7);
  return next;
}

function getPrevWeek(startDate) {
  const prev = new Date(startDate);
  prev.setDate(prev.getDate() - 7);
  return prev;
}

// Вспомогательная функция: день недели с понедельника (0 = Пн, ..., 6 = Вс)
function getDayOfWeekMondayStart(date) {
  const jsDay = date.getDay(); // 0 = Вс, 1 = Пн, ..., 6 = Сб
  return jsDay === 0 ? 6 : jsDay - 1; // 0 = Пн, 1 = Вт, ..., 6 = Вс
}

// === Рендер задач ===
function renderTasks() {
  taskList.innerHTML = '';
  emptyState.style.display = 'none';
  calendarContainer.style.display = 'none';

  let filtered = tasks;

  const now = new Date();
  const todayStart = new Date().setHours(0, 0, 0, 0);

  switch (currentFilter) {
    case 'today':
      filtered = tasks.filter(t => t.datetime && new Date(t.datetime).setHours(0,0,0,0) === todayStart);
      break;
    case 'inbox':
      filtered = tasks.filter(t => !t.datetime);
      break;
    case 'upcoming':
      filtered = tasks.filter(t => t.datetime && new Date(t.datetime) > now);
      break;
    case 'all':
      filtered = tasks;
      // Показываем календарь вместо списка
      renderCalendar();
      return;
    case 'completed':
      filtered = tasks.filter(t => t.completed);
      break;
  }

  if (filtered.length === 0) {
    emptyState.style.display = 'block';
  } else {
    filtered.forEach(task => {
      const li = document.createElement('li');
      li.className = `task-item ${task.completed ? 'completed' : ''} category-${task.category}`;
      li.style.backgroundColor = getCategoryColor(task.category);
      li.innerHTML = `
        <div class="task-header">
          <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${task.id})">
          <div class="task-text">${task.text.replace(/\n/g, '<br>')}</div>
        </div>
        <div class="task-meta">
          <span>📅 ${formatDateTime(task.datetime)}</span>
          <span>🏷️ ${getCategoryName(task.category)}</span>
        </div>
        <div class="task-actions">
          <button onclick="editTask(${task.id})">✏️ Редактировать</button>
          <button onclick="deleteTask(${task.id})">🗑️ Удалить</button>
        </div>
      `;
      taskList.appendChild(li);
    });
  }
}

// === Календарь ===
function renderCalendar() {
  calendarContainer.style.display = 'block';
  taskList.innerHTML = '';
  emptyState.style.display = 'none';

  // Показываем/скрываем кнопки навигации по неделям
  weekNavigation.style.display = currentView === 'week' ? 'flex' : 'none';

  // Добавляем класс week-view к сетке, если это режим "Неделя"
  calendarGrid.className = currentView === 'week' ? 'calendar-grid week-view' : 'calendar-grid';

  if (currentView === 'month') {
    renderMonthCalendar();
  } else if (currentView === 'week') {
    renderWeekCalendar();
  }
}

function renderMonthCalendar() {
  const firstDay = getFirstDayOfMonth(currentCalendarDate);
  const lastDay = getLastDayOfMonth(currentCalendarDate);
  const daysInMonth = getDaysInMonth(currentCalendarDate);
  const startDay = getDayOfWeekMondayStart(firstDay);

  calendarMonthYear.textContent = `${firstDay.toLocaleString('ru-RU', { month: 'long', year: 'numeric' })}`;

  calendarGrid.innerHTML = '';

  // Дни недели
  const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  daysOfWeek.forEach(day => {
    const dayCell = document.createElement('div');
    dayCell.className = 'calendar-day';
    dayCell.innerHTML = `<div style="font-weight: bold; text-align: center;">${day}</div>`;
    calendarGrid.appendChild(dayCell);
  });

  // Пустые ячейки до первого дня месяца
  for (let i = 0; i < startDay; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calendar-day';
    calendarGrid.appendChild(emptyCell);
  }

  // Дни месяца
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), day);
    const dayCell = document.createElement('div');
    dayCell.className = 'calendar-day';
    if (isToday(date)) {
      dayCell.classList.add('today');
    }

    const dayNumber = document.createElement('div');
    dayNumber.className = `calendar-day-number ${isToday(date) ? 'today' : ''}`;
    dayNumber.textContent = day;
    dayCell.appendChild(dayNumber);

    // Фильтруем задачи на этот день
    const dayTasks = tasks.filter(t => {
      if (!t.datetime) return false;
      const taskDate = new Date(t.datetime);
      // Сравниваем только дату (без времени)
      return taskDate.getDate() === date.getDate() &&
             taskDate.getMonth() === date.getMonth() &&
             taskDate.getFullYear() === date.getFullYear();
    });

    dayTasks.forEach(task => {
      const event = document.createElement('div');
      event.className = 'calendar-event';
      event.innerHTML = `
        <span class="event-dot" style="background-color: ${getCategoryColor(task.category)};"></span>
        <span>${task.text.split('\n')[0].substring(0, 20)}...</span>
      `;
      event.title = task.text;
      event.addEventListener('click', () => openTaskModal(task.id));
      event.style.cursor = 'pointer';
      event.title = 'Кликните, чтобы посмотреть подробности';
      event.style.cursor = 'pointer';
      dayCell.appendChild(event);
    });

    calendarGrid.appendChild(dayCell);
  }

  // Пустые ячейки после последнего дня месяца
  const totalCells = 42; // 6 недель * 7 дней
  const filledCells = startDay + daysInMonth;
  for (let i = filledCells; i < totalCells; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calendar-day';
    calendarGrid.appendChild(emptyCell);
  }
}

function renderWeekCalendar() {
  // Если это первый вызов, установим текущую неделю
  if (!currentWeekStartDate) {
    currentWeekStartDate = getStartOfWeek(new Date());
  }

  const startOfWeek = new Date(currentWeekStartDate);
  const endOfWeek = getEndOfWeek(startOfWeek);

  calendarMonthYear.textContent = `Неделя с ${startOfWeek.toLocaleDateString('ru-RU')} по ${endOfWeek.toLocaleDateString('ru-RU')}`;

  calendarGrid.innerHTML = '';

  // Заголовки дней недели
  const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(date.getDate() + i);
    const dayCell = document.createElement('div');
    dayCell.className = 'calendar-day';
    dayCell.innerHTML = `
      <div style="font-weight: bold; text-align: center;">${daysOfWeek[i]}</div>
      <div class="calendar-day-number">${date.getDate()}</div>
    `;
    if (isToday(date)) {
      dayCell.classList.add('today');
      dayCell.querySelector('.calendar-day-number').classList.add('today');
    }
    calendarGrid.appendChild(dayCell);
  }

  // Ячейки для задач по дням
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(date.getDate() + i);
    const dayCell = document.createElement('div');
    dayCell.className = 'calendar-day';
    if (isToday(date)) {
      dayCell.classList.add('today');
    }

    // Фильтруем задачи на этот день
    const dayTasks = tasks.filter(t => {
      if (!t.datetime) return false;
      const taskDate = new Date(t.datetime);
      return taskDate.getDate() === date.getDate() &&
             taskDate.getMonth() === date.getMonth() &&
             taskDate.getFullYear() === date.getFullYear();
    });

    dayTasks.forEach(task => {
      const event = document.createElement('div');
      event.className = 'calendar-event';
      event.innerHTML = `
        <span class="event-dot" style="background-color: ${getCategoryColor(task.category)};"></span>
        <span>${task.text.split('\n')[0].substring(0, 20)}...</span>
      `;
      event.title = task.text;
      event.addEventListener('click', () => openTaskModal(task.id));
      event.style.cursor = 'pointer';
      event.title = 'Кликните, чтобы посмотреть подробности';
      event.style.cursor = 'pointer';
      dayCell.appendChild(event);
    });

    calendarGrid.appendChild(dayCell);
  }
}

// === Навигация по календарю ===
prevMonthBtn.addEventListener('click', () => {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
  renderCalendar();
});

nextMonthBtn.addEventListener('click', () => {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
  renderCalendar();
});

viewMonthBtn.addEventListener('click', () => {
  viewMonthBtn.classList.add('active');
  viewWeekBtn.classList.remove('active');
  currentView = 'month';
  renderCalendar();
});

viewWeekBtn.addEventListener('click', () => {
  viewWeekBtn.classList.add('active');
  viewMonthBtn.classList.remove('active');
  currentView = 'week';
  // При первом переходе на "Неделя", устанавливаем текущую неделю
  if (!currentWeekStartDate) {
    currentWeekStartDate = getStartOfWeek(new Date());
  }
  renderCalendar();
});

// === Навигация по неделям ===
prevWeekBtn.addEventListener('click', () => {
  if (currentView === 'week' && currentWeekStartDate) {
    currentWeekStartDate = getPrevWeek(currentWeekStartDate);
    renderCalendar();
  }
});

nextWeekBtn.addEventListener('click', () => {
  if (currentView === 'week' && currentWeekStartDate) {
    currentWeekStartDate = getNextWeek(currentWeekStartDate);
    renderCalendar();
  }
});

// === Открытие модального окна задачи ===
// Функция для открытия модального окна задачи
function openTaskModal(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  currentTaskId = taskId;
  modalTaskTitle.textContent = task.text.split('\n')[0];
  modalTaskCategory.textContent = getCategoryName(task.category);
  modalTaskDatetime.textContent = task.datetime ? formatDateTime(task.datetime) : '—';
  modalTaskDescription.textContent = task.text.split('\n').slice(1).join('\n') || 'Нет описания';

  // Показываем модальное окно
  document.getElementById('task-modal').style.display = 'flex';
}

function closeTaskModal() {
  taskModal.style.display = 'none';
  currentTaskId = null;
}

// === Добавление задачи ===
addTaskBtn.addEventListener('click', () => {
  taskTitleInput.value = '';
  taskDatetimeInput.value = '';
  taskDescriptionInput.value = '';
  taskCategorySelect.selectedIndex = 0;
  addTaskModal.style.display = 'flex';
  taskTitleInput.focus();
});

saveTaskBtn.addEventListener('click', () => {
  const title = taskTitleInput.value.trim();
  const datetime = taskDatetimeInput.value;
  const description = taskDescriptionInput.value.trim();
  const category = taskCategorySelect.value;

  if (!title) {
    alert('Задача должна иметь название.');
    taskTitleInput.focus();
    return;
  }

  tasks.push({
    id: Date.now(),
    text: title + (description ? '\n\n' + description : ''),
    datetime: datetime || null,
    category,
    completed: false
  });

  saveTasks();
  renderTasks();
  addTaskModal.style.display = 'none';
});

// === Глобальные функции ===
window.toggleTask = (id) => {
  tasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
  saveTasks();
  renderTasks();
};

window.editTask = (id) => {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  const [title, description] = task.text.split('\n\n');
  taskTitleInput.value = title;
  taskDescriptionInput.value = description || '';
  taskDatetimeInput.value = task.datetime || '';
  taskCategorySelect.value = task.category;

  addTaskModal.style.display = 'flex';
  taskTitleInput.focus();

  // Перехватываем сохранение
  const originalSave = saveTaskBtn.onclick;
  saveTaskBtn.onclick = () => {
    const newTitle = taskTitleInput.value.trim();
    const newDatetime = taskDatetimeInput.value;
    const newDescription = taskDescriptionInput.value.trim();
    const newCategory = taskCategorySelect.value;

    if (!newTitle) {
      alert('Задача должна иметь название.');
      return;
    }

    task.text = newTitle + (newDescription ? '\n\n' + newDescription : '');
    task.datetime = newDatetime || null;
    task.category = newCategory;

    saveTasks();
    renderTasks();
    addTaskModal.style.display = 'none';
    saveTaskBtn.onclick = originalSave;
  };
};

window.deleteTask = (id) => {
  if (confirm('Удалить задачу?')) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
  }
};

// === Запуск ===
renderCategories();
renderTasks();