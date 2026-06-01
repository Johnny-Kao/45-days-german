let lessons = [];
let audioCache = {};
let currentAudio = null;
let currentButton = null;

const coverGradients = [
  'linear-gradient(135deg, #f9d77e 0%, #e8956e 100%)',
  'linear-gradient(135deg, #a8d8ea 0%, #5b9bd5 100%)',
  'linear-gradient(135deg, #b8ddb0 0%, #6b9e7a 100%)',
  'linear-gradient(135deg, #f7c6d9 0%, #e18aaa 100%)',
  'linear-gradient(135deg, #d5c6ff 0%, #9381ff 100%)',
  'linear-gradient(135deg, #ffd6a5 0%, #ff9f68 100%)',
];

// JSON fields may be plain strings or {zh, en, ja} objects
function zh(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  return val.zh || val.en || '';
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  fetch('data/lessons.json')
    .then(r => r.json())
    .then(data => {
      lessons = data;
      preloadAllAudio(lessons);
      route();
    })
    .catch(() => {
      document.getElementById('app').innerHTML =
        '<p class="loading">無法載入課程資料，請用 http-server 開啟。</p>';
    });

  window.addEventListener('hashchange', route);
});

// ── Routing ───────────────────────────────────────────────────────────────────

function route() {
  stopCurrentAudio();
  const hash = location.hash || '#/lessons';
  const match = hash.match(/^#\/lesson\/(.+)$/);
  if (match) {
    const lesson = lessons.find(l => l.id === match[1]);
    lesson ? renderLesson(lesson) : renderHome();
  } else {
    renderHome();
  }
  window.scrollTo(0, 0);
}

// ── Audio manager ─────────────────────────────────────────────────────────────

function preloadAllAudio(allLessons) {
  allLessons.forEach(lesson => {
    if (lesson.audioReady === false) return;
    const srcs = [
      lesson.audio.dialogueNormal,
      lesson.audio.dialogueSlow,
      lesson.audio.shadowing,
      ...lesson.dialogue.map(s => s.audio),
    ];
    srcs.forEach(src => {
      if (src && !audioCache[src]) {
        const a = new Audio();
        a.preload = 'auto';
        a.src = src;
        audioCache[src] = a;
      }
    });
  });
}

function getAudio(src) {
  if (!audioCache[src]) {
    audioCache[src] = new Audio(src);
  }
  return audioCache[src];
}

function stopCurrentAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  if (currentButton) resetButtonState(currentButton);
  currentAudio = null;
  currentButton = null;
}

function playAudio(src, btn) {
  if (!src || btn.disabled) return;
  if (currentAudio && currentButton === btn) {
    stopCurrentAudio();
    return;
  }
  stopCurrentAudio();

  const audio = getAudio(src);
  currentAudio = audio;
  currentButton = btn;

  setButtonPlaying(btn);

  audio.currentTime = 0;
  audio.onended = () => {
    resetButtonState(btn);
    currentAudio = null;
    currentButton = null;
  };
  audio.onerror = () => {
    resetButtonState(btn);
    currentAudio = null;
    currentButton = null;
  };

  audio.play().catch(() => {
    resetButtonState(btn);
    currentAudio = null;
    currentButton = null;
  });
}

function setButtonPlaying(btn) {
  btn.classList.add('playing');
  btn.dataset.origLabel = btn.dataset.origLabel || btn.textContent;
  if (btn.classList.contains('play-btn')) {
    btn.textContent = '■';
  } else {
    btn.textContent = '■ ' + (btn.dataset.origLabel || '').replace(/^▶ /, '');
  }
}

function resetButtonState(btn) {
  btn.classList.remove('playing');
  if (btn.dataset.origLabel) {
    btn.textContent = btn.dataset.origLabel;
  }
}

// ── localStorage ──────────────────────────────────────────────────────────────

function isDone(id) {
  return localStorage.getItem('lesson_' + id + '_done') === 'true';
}

function markDone(id) {
  localStorage.setItem('lesson_' + id + '_done', 'true');
}

// ── Home screen ───────────────────────────────────────────────────────────────

function renderHome() {
  const cards = lessons.map(lesson => {
    const done = isDone(lesson.id);
    const audioStatus = lesson.audioReady === false
      ? '<p class="audio-status">音檔尚未生成，可先看句子與練習內容。</p>'
      : '';
    return `
      <div class="card lesson-card" onclick="location.hash='#/lesson/${lesson.id}'">
        <div class="lesson-card-top">
          <span class="day-badge">Day ${lesson.day}</span>
          ${done ? '<span class="done-badge">✓ 完成</span>' : ''}
        </div>
        <h2>${lesson.title}</h2>
        <p class="subtitle">${zh(lesson.subtitle)}</p>
        <p class="task-text">${zh(lesson.task)}</p>
        ${audioStatus}
        <button class="audio-btn" onclick="event.stopPropagation(); location.hash='#/lesson/${lesson.id}'">
          開始學習 →
        </button>
      </div>`;
  }).join('');

  document.getElementById('app').innerHTML = `
    <div class="app">
      <div class="home-header">
        <h1>🇩🇪 German Course</h1>
        <p>每天一個任務，用德語說出來</p>
      </div>
      ${cards}
    </div>`;
}

// ── Lesson page ───────────────────────────────────────────────────────────────

function renderLesson(lesson) {
  const done = isDone(lesson.id);
  const hasAudio = lesson.audioReady !== false;
  const coverStyle = coverGradients[(lesson.day - 1) % coverGradients.length];

  const dialogueHTML = lesson.dialogue.map(s => `
    <div class="sentence-card">
      <div class="speaker-badge">${s.speaker}</div>
      <div class="sentence-text">
        <div class="fr">${s.de}</div>
        <div class="tr-line"><span class="tr-lang">中</span><span>${s.zh}</span></div>
        ${s.en ? `<div class="tr-line"><span class="tr-lang">EN</span><span>${s.en}</span></div>` : ''}
        ${s.ja ? `<div class="tr-line"><span class="tr-lang">日</span><span>${s.ja}</span></div>` : ''}
      </div>
      <button class="play-btn"
        data-orig-label="▶"
        onclick="playAudio('${s.audio}', this)"
        ${hasAudio ? '' : 'disabled'}>▶</button>
    </div>`).join('');

  const patternsHTML = lesson.patterns.map(p => `
    <div class="pattern-item">
      <div class="pattern-fr">${p.pattern}</div>
      <div class="pattern-zh">${zh(p.meaning)}</div>
      <div class="pattern-examples">
        ${p.examples.map(e => `
          <div class="pattern-example">
            <span class="ex-fr">${e.de}</span>
            <span class="ex-zh"> — ${e.zh}</span>
          </div>`).join('')}
      </div>
    </div>`).join('');

  const pronHTML = lesson.pronunciationNotes.map(n => `
    <div class="pron-item">
      <div class="pron-word">${n.item}</div>
      <div class="pron-note">${zh(n.note)}</div>
    </div>`).join('');

  let grammarHTML = '';
  if (lesson.grammarNote) {
    const gn = lesson.grammarNote;
    const title = gn.title ? zh(gn.title) : '';
    const body = gn.explanation ? zh(gn.explanation) : zh(gn);
    grammarHTML = `<div class="card">
        <div class="section-title">語法小筆記</div>
        ${title ? `<div class="grammar-title">${title}</div>` : ''}
        <div class="grammar-note">${body}</div>
       </div>`;
  }

  const audioNoticeHTML = hasAudio
    ? ''
    : `<div class="audio-status lesson-audio-status">這一課的音檔還沒生成；你現在可以先看句型、對話與輸出任務。</div>`;

  const doneButtonHTML = done
    ? `<button class="done-btn completed" disabled>✓ 已完成</button>`
    : `<button class="done-btn" onclick="onMarkDone('${lesson.id}')">Mark as Done ✓</button>`;

  document.getElementById('app').innerHTML = `
    <div class="app">

      <button class="back-btn" onclick="location.hash='#/lessons'">← 所有課程</button>

      <!-- Header -->
      <div class="card lesson-header">
        <img class="cover-img"
          src="https://loremflickr.com/800/400/${lesson.coverKeywords || 'paris,france'}"
          alt="Day ${lesson.day}"
          loading="lazy"
          onerror="this.style.display='none';this.nextElementSibling.style.display='block'"
        ><div class="cover-placeholder" style="background:${coverStyle};display:none;"></div>
        <p class="lesson-day">Day ${lesson.day}</p>
        <h1 class="lesson-title">${lesson.title}</h1>
        <p class="lesson-subtitle">${zh(lesson.subtitle)}</p>
        <p class="lesson-task">${zh(lesson.task)}</p>
      </div>

      <!-- Listen First -->
      <div class="card">
        <div class="section-title">先聽整段</div>
        ${audioNoticeHTML}
        <div class="audio-row">
          <button class="audio-btn"
            data-orig-label="▶ Normal"
            onclick="playAudio('${lesson.audio.dialogueNormal}', this)"
            ${hasAudio ? '' : 'disabled'}>▶ Normal</button>
          <button class="audio-btn secondary"
            data-orig-label="▶ Slow"
            onclick="playAudio('${lesson.audio.dialogueSlow}', this)"
            ${hasAudio ? '' : 'disabled'}>▶ Slow</button>
          <button class="audio-btn secondary"
            data-orig-label="▶ Shadow"
            onclick="playAudio('${lesson.audio.shadowing}', this)"
            ${hasAudio ? '' : 'disabled'}>▶ Shadow</button>
        </div>
      </div>

      <!-- Core Dialogue -->
      <div class="card">
        <div class="section-title">對話</div>
        ${dialogueHTML}
      </div>

      <!-- Pattern Practice -->
      <div class="card">
        <div class="section-title">句型練習</div>
        ${patternsHTML}
      </div>

      <!-- Pronunciation Notes -->
      <div class="card">
        <div class="section-title">發音重點</div>
        ${pronHTML}
      </div>

      <!-- Grammar Notes -->
      ${grammarHTML}

      <!-- Output Task -->
      <div class="card">
        <div class="section-title">${zh(lesson.outputTask.title)}</div>
        <p class="output-instruction">${zh(lesson.outputTask.instruction)}</p>
      </div>

      <!-- Mark as Done -->
      <div class="card">
        ${doneButtonHTML}
      </div>

    </div>`;
}

function onMarkDone(id) {
  markDone(id);
  const btn = document.querySelector('.done-btn');
  if (btn) {
    btn.textContent = '✓ 已完成';
    btn.classList.add('completed');
    btn.disabled = true;
  }
}
