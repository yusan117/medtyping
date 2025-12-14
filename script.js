import { medicalData } from './data.js';

// --- 状態変数 ---
let checkedWords = {}; 
let currentQueue = [];
let currentIndex = 0;
let currentWord = null;
let userInput = "";
let score = 0;
let isAnswered = false; 
let currentCategoryName = "";

const hiddenInput = document.getElementById('hidden-input');

// --- 初期化 ---
window.onload = () => {
    loadChecked();
    renderMenu();
};

function loadChecked() {
    const saved = localStorage.getItem('med_checked');
    if (saved) checkedWords = JSON.parse(saved);
}

function saveChecked() {
    localStorage.setItem('med_checked', JSON.stringify(checkedWords));
}

function toggleCheck(enWord) {
    if (checkedWords[enWord]) delete checkedWords[enWord];
    else checkedWords[enWord] = true;
    saveChecked();
    return !!checkedWords[enWord];
}

// --- 画面切り替え ---
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

window.showMenu = function() {
    showScreen('menu-screen');
}

// --- メニュー描画 ---
function renderMenu() {
    const grid = document.getElementById('category-grid');
    grid.innerHTML = '';
    
    Object.keys(medicalData).forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'menu-btn';
        btn.innerText = cat;
        btn.onclick = () => startGame(cat);
        grid.appendChild(btn);
    });
    
    const randBtn = document.createElement('button');
    randBtn.className = 'menu-btn random-btn';
    randBtn.innerText = 'ランダム (全範囲)';
    randBtn.onclick = () => startGame('ランダム');
    grid.appendChild(randBtn);
}

// --- 学習モード ---
window.showLearningMode = function() {
    const listDiv = document.getElementById('learning-list');
    listDiv.innerHTML = '';

    Object.keys(medicalData).forEach(cat => {
        const header = document.createElement('div');
        header.className = 'cat-header';
        header.innerText = cat;
        listDiv.appendChild(header);

        medicalData[cat].forEach(item => {
            const row = document.createElement('div');
            row.className = checkedWords[item.en] ? 'word-row checked' : 'word-row';
            row.onclick = () => {
                const isNowChecked = toggleCheck(item.en);
                row.className = isNowChecked ? 'word-row checked' : 'word-row';
            };

            row.innerHTML = `
                <div class="word-info">
                    <div class="lvl-badge">Lv.${item.level}</div>
                    <div>${item.ja}</div>
                    <div>${item.en}</div>
                </div>
                <div class="checkbox-icon"></div>
            `;
            listDiv.appendChild(row);
        });
    });

    showScreen('learning-screen');
}

// --- ゲーム開始処理 ---
window.startGame = function(category) {
    let list = [];
    if (category === 'ランダム') {
        Object.values(medicalData).forEach(arr => list.push(...arr));
    } else {
        list = medicalData[category];
    }

    const levelVal = document.querySelector('input[name="level"]:checked').value;
    const countVal = document.querySelector('input[name="count"]:checked').value;
    const isCheckMode = document.getElementById('check-mode').checked;

    if (levelVal !== 'all') {
        list = list.filter(i => i.level == levelVal);
    }

    if (isCheckMode) {
        list = list.filter(i => checkedWords[i.en]);
    }

    if (list.length === 0) {
        alert('条件に一致する単語がありません。設定を見直してください。');
        return;
    }

    for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
    }

    if (countVal !== 'all' && list.length > parseInt(countVal)) {
        list = list.slice(0, parseInt(countVal));
    }

    currentQueue = list;
    currentIndex = 0;
    score = 0;
    currentCategoryName = category + (isCheckMode ? '(チェック)' : '');
    
    showScreen('quiz-screen');
    loadQuestion();
}

// --- クイズ進行 ---
function loadQuestion() {
    if (currentIndex >= currentQueue.length) {
        endGame();
        return;
    }

    currentWord = currentQueue[currentIndex];
    userInput = "";
    isAnswered = false;
    
    document.getElementById('score-val').innerText = score;
    document.getElementById('progress-val').innerText = (currentIndex + 1) + '/' + currentQueue.length;
    document.getElementById('question-text').innerText = currentWord.ja;
    document.getElementById('message').innerText = "";
    
    document.getElementById('next-btn').style.display = 'none';
    document.getElementById('hint-area').style.display = 'block';
    document.getElementById('giveup-btn').style.display = 'block';
    
    updateQuizCheckBtn();
    renderAnswerBox();
    window.focusInput();
}

function renderAnswerBox() {
    const container = document.getElementById('answer-box');
    container.innerHTML = '';
    
    const chars = currentWord.en.split('');
    chars.forEach((char, idx) => {
        const div = document.createElement('div');
        
        if (char === ' ') {
            div.className = 'char-box space';
        } else {
            div.className = 'char-box';
            if (idx < userInput.length) {
                div.innerText = char;
                div.classList.add('correct');
            } else if (isAnswered) {
                div.innerText = char;
                div.classList.add('giveup');
            } else if (idx === userInput.length) {
                div.classList.add('current');
            }
        }
        container.appendChild(div);
    });
}

// --- 入力制御 ---
window.focusInput = function() {
    if (!isAnswered) {
        hiddenInput.value = '';
        hiddenInput.focus();
    }
}

hiddenInput.addEventListener('input', (e) => {
    if (isAnswered) return;
    
    const val = hiddenInput.value;
    if (!val) return;
    
    const char = val.slice(-1).toLowerCase();
    hiddenInput.value = ''; 

    if (!/[a-z]/.test(char)) return; 

    checkInput(char);
});

function checkInput(char) {
    const targetChar = currentWord.en[userInput.length].toLowerCase();

    if (char === targetChar) {
        // 正解
        let nextInput = userInput + char;
        
        while (nextInput.length < currentWord.en.length && currentWord.en[nextInput.length] === ' ') {
            nextInput += ' ';
        }

        userInput = nextInput;
        renderAnswerBox();

        if (userInput.length === currentWord.en.length) {
            finishQuestion(true);
        }
    } else {
        // 不正解：Miss表示は削除し、揺れるアニメーションのみ
        const box = document.getElementById('answer-box');
        box.animate([
            { transform: 'translateX(0)' },
            { transform: 'translateX(-10px)' },
            { transform: 'translateX(10px)' },
            { transform: 'translateX(0)' }
        ], { duration: 200 });
        
        // document.getElementById('message').innerText = "Miss!"; // 削除
    }
}

function finishQuestion(isSuccess) {
    isAnswered = true;
    hiddenInput.blur();

    if (isSuccess) {
        score += 10;
        document.getElementById('score-val').innerText = score;
        document.getElementById('message').innerText = "Excellent!";
        document.getElementById('message').style.color = 'var(--success)';
        document.getElementById('next-btn').style.display = 'block';
    } else {
        document.getElementById('message').innerText = "";
        document.getElementById('next-btn').style.display = 'block';
    }

    document.getElementById('hint-area').style.display = 'none';
    document.getElementById('giveup-btn').style.display = 'none';
    renderAnswerBox(); 
}

// --- アクション ---
window.handleHint = function() {
    if (isAnswered) return;
    const first = currentWord.en[0];
    let next = first;
    while (currentWord.en[next.length] === ' ') {
            next += ' ';
    }
    userInput = next;
    renderAnswerBox();
    window.focusInput();
}

window.handleGiveUp = function() {
    if (isAnswered) return;
    finishQuestion(false);
}

window.nextQuestion = function() {
    currentIndex++;
    loadQuestion();
}

window.quitGame = function() {
    window.showMenu();
}

// --- チェック機能 (クイズ中) ---
function updateQuizCheckBtn() {
    const btn = document.getElementById('quiz-check-btn');
    if (checkedWords[currentWord.en]) {
        btn.classList.add('checked');
        btn.innerText = '☑'; // チェックあり
    } else {
        btn.classList.remove('checked');
        btn.innerText = '□'; // チェックなし
    }
}

window.toggleQuizCheck = function() {
    toggleCheck(currentWord.en);
    updateQuizCheckBtn();
}

// --- 結果画面 ---
function endGame() {
    showScreen('result-screen');
    document.getElementById('result-cat').innerText = currentCategoryName;
    document.getElementById('final-score').innerText = score + " Points";
}
