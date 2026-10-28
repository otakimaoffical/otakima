// State Aplikasi Global
const state = {
  type: null,    // 'fill' atau 'mc'
  level: null,   // 'easy', 'medium', 'hard'
  questions: [],
  currentIndex: 0,
  userAnswers: [],
  tempAnswer: '',
  score: 0
};

// Navigasi Halaman SPA
function goToPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
}

// Modal Toggle (Tentang Otakima)
function toggleModal(show) {
  const modal = document.getElementById('aboutModal');
  if (show) modal.classList.add('active');
  else modal.classList.remove('active');
}

// Custom Alert Pengganti Alert Bawaan Browser
function showCustomAlert(message, title = "Perhatian") {
  document.getElementById('customAlertTitle').innerText = title;
  document.getElementById('customAlertMessage').innerText = message;
  document.getElementById('customAlert').classList.add('active');
}

function closeCustomAlert() {
  document.getElementById('customAlert').classList.remove('active');
}

// Pilih Tipe Latihan
function selectType(type) {
  state.type = type; 
  goToPage('page-level');
}

// Fitur Putar Musik Sendiri (Default Off)
let isPlayingMusic = false;
function toggleMusic() {
  const audio = document.getElementById('bgMusic');
  const btn = document.getElementById('musicToggleBtn');
  
  if (!isPlayingMusic) {
    audio.play().then(() => {
      isPlayingMusic = true;
      btn.classList.add('active');
    }).catch(err => {
      showCustomAlert("Gagal memutar musik. Pastikan file musik ada di folder Data/music_web.mp3!", "Info Musik");
    });
  } else {
    audio.pause();
    isPlayingMusic = false;
    btn.classList.remove('active');
  }
}

// Dropdown Toggle untuk Menu Tema
function toggleThemeDropdown() {
  const menu = document.getElementById('themeMenu');
  menu.classList.toggle('active');
}

// Fungsi Mengganti 3 Pilihan Tema (Light, Dark, RedBlue)
function setTheme(themeName) {
  document.body.classList.remove('theme-dark', 'theme-redblue');
  
  if (themeName === 'dark') {
    document.body.classList.add('theme-dark');
  } else if (themeName === 'redblue') {
    document.body.classList.add('theme-redblue');
  }
  
  document.getElementById('themeMenu').classList.remove('active');
}

// Tutup dropdown tema jika user klik di luar area
window.onclick = function(event) {
  if (!event.target.closest('.theme-dropdown-wrapper')) {
    const menu = document.getElementById('themeMenu');
    if (menu && menu.classList.contains('active')) {
      menu.classList.remove('active');
    }
  }
};

// Mengambil data soal secara dinamis dari folder Data/
async function startQuiz(level) {
  state.level = level; 
  const filePath = `Data/${state.type}-${level}.json`;

  try {
    let response = await fetch(filePath);
    if (!response.ok) {
      const alternativeLevel = level === 'easy' ? 'esay' : 'easy';
      const alternativePath = `Data/${state.type}-${alternativeLevel}.json`;
      response = await fetch(alternativePath);
      if (!response.ok) throw new Error(`File tidak ditemukan.`);
    }

    const jsonData = await response.json();
    let allQuestions = [];

    if (Array.isArray(jsonData)) {
      allQuestions = jsonData;
    } else {
      const rootKeys = Object.keys(jsonData);
      for (let key of rootKeys) {
        const nestedObj = jsonData[key];
        if (nestedObj && (nestedObj[level] || nestedObj['easy'] || nestedObj['esay'])) {
          allQuestions = nestedObj[level] || nestedObj['easy'] || nestedObj['esay'];
          break;
        } else if (Array.isArray(nestedObj)) {
          allQuestions = nestedObj;
          break;
        }
      }
      if (allQuestions.length === 0 && rootKeys.length > 0) {
        const firstVal = jsonData[rootKeys[0]];
        if (Array.isArray(firstVal)) allQuestions = firstVal;
      }
    }

    if (!allQuestions || allQuestions.length === 0) {
      throw new Error("Array soal kosong.");
    }

    state.questions = [...allQuestions].sort(() => 0.5 - Math.random()).slice(0, 5);

  } catch (error) {
    console.error("Error loading JSON:", error);
    showCustomAlert(`Gagal memuat file soal dari folder Data/ (${filePath}).`, "Kesalahan Data");
    return;
  }

  state.currentIndex = 0;
  state.userAnswers = [];
  state.score = 0;

  const typeName = state.type === 'fill' ? 'Isian Singkat' : 'Pilihan Ganda';
  document.getElementById('quizCategoryLabel').innerText = `${typeName} - ${level.toUpperCase()}`;
  
  goToPage('page-quiz');
  renderQuestion();
}

// Fungsi untuk tombol "Latihan Lagi"
function retryQuiz() {
  if (state.level) {
    startQuiz(state.level);
  } else {
    goToPage('page-type');
  }
}

// Render Soal per nomor ke layar
function renderQuestion() {
  const currentQ = state.questions[state.currentIndex];
  document.getElementById('quizProgress').innerText = `Soal ${state.currentIndex + 1} dari ${state.questions.length}`;
  document.getElementById('questionText').innerText = currentQ.question;

  const container = document.getElementById('answerContainer');
  container.innerHTML = '';
  state.tempAnswer = '';

  if (state.type === 'mc') {
    currentQ.options.forEach(opt => {
      const div = document.createElement('div');
      div.className = 'option-item';
      div.innerText = opt;
      div.onclick = () => {
        document.querySelectorAll('.option-item').forEach(el => el.classList.remove('selected'));
        div.classList.add('selected');
        state.tempAnswer = opt;
      };
      container.appendChild(div);
    });
  } else {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'essay-input';
    input.placeholder = 'Ketik jawabanmu...';
    input.id = 'essayAnswerInput';
    input.oninput = (e) => {
      state.tempAnswer = e.target.value;
    };
    container.appendChild(input);
  }
}

// Tombol Lanjut ke Soal Berikutnya
function nextQuestion() {
  if (!state.tempAnswer || state.tempAnswer.toString().trim() === '') {
    showCustomAlert('Silakan isi atau pilih jawaban terlebih dahulu!');
    return;
  }

  const cleanUserAns = state.tempAnswer.toString().trim().toLowerCase();
  state.userAnswers.push(state.tempAnswer.toString().trim());

  const currentQ = state.questions[state.currentIndex];
  let isCorrect = false;

  if (Array.isArray(currentQ.answer)) {
    isCorrect = currentQ.answer.some(ans => ans.toString().trim().toLowerCase() === cleanUserAns);
  } else {
    isCorrect = cleanUserAns === currentQ.answer.toString().trim().toLowerCase();
  }

  if (isCorrect) {
    state.score++;
  }

  state.currentIndex++;

  if (state.currentIndex < state.questions.length) {
    renderQuestion();
  } else {
    showResult();
  }
}

// Menampilkan Halaman Hasil & Rekap Jawaban
function showResult() {
  goToPage('page-result');
  const total = state.questions.length;
  const percent = Math.round((state.score / total) * 100);

  document.getElementById('finalScoreText').innerText = `${state.score}/${total}`;
  document.getElementById('percentageText').innerText = `${percent}% Benar`;

  const reviewList = document.getElementById('reviewList');
  reviewList.innerHTML = '';

  state.questions.forEach((q, idx) => {
    const userAns = state.userAnswers[idx];
    const cleanUserAns = userAns.toString().trim().toLowerCase();
    
    const correctAnsDisplay = Array.isArray(q.answer) ? q.answer.join(" / ") : q.answer;
    
    let isTrue = false;
    if (Array.isArray(q.answer)) {
      isTrue = q.answer.some(ans => ans.toString().trim().toLowerCase() === cleanUserAns);
    } else {
      isTrue = cleanUserAns === q.answer.toString().trim().toLowerCase();
    }
    
    const item = document.createElement('div');
    item.className = `review-item ${isTrue ? 'benar' : 'salah'}`;
    item.innerHTML = `
      <strong>Soal ${idx + 1}:</strong> ${q.question}<br>
      Jawabanmu: <em>${userAns}</em> ${isTrue ? '(Benar)' : `(Salah - Kunci: ${correctAnsDisplay})`}
    `;
    reviewList.appendChild(item);
  });
}
