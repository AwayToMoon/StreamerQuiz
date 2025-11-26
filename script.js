// Login Credentials
const LOGIN_CREDENTIALS = {
    host: 'Away2025',
    streamer1: 'HigherCellF2025',
    streamer2: 'OGAle_2025'
};

// Sound Manager
class SoundManager {
    constructor() {
        this.audioContext = null;
        this.sounds = {};
        this.enabled = true;
        this.volume = 0.3;
    }

    init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playTone(frequency, duration, type = 'sine', volume = this.volume) {
        if (!this.enabled || !this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = type;

        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    click() {
        this.playTone(800, 0.05, 'sine', 0.2);
    }

    success() {
        const now = this.audioContext?.currentTime || 0;
        this.playTone(523.25, 0.1, 'sine', 0.3);
        setTimeout(() => this.playTone(659.25, 0.1, 'sine', 0.3), 100);
        setTimeout(() => this.playTone(783.99, 0.15, 'sine', 0.3), 200);
    }

    error() {
        this.playTone(200, 0.15, 'sawtooth', 0.25);
        setTimeout(() => this.playTone(150, 0.2, 'sawtooth', 0.25), 100);
    }

    correct() {
        this.playTone(880, 0.1, 'sine', 0.35);
        setTimeout(() => this.playTone(1046.5, 0.15, 'sine', 0.35), 80);
    }

    wrong() {
        this.playTone(300, 0.1, 'triangle', 0.3);
        setTimeout(() => this.playTone(250, 0.15, 'triangle', 0.3), 100);
    }

    quizStart() {
        const notes = [523.25, 587.33, 659.25, 783.99];
        notes.forEach((note, i) => {
            setTimeout(() => this.playTone(note, 0.12, 'sine', 0.3), i * 80);
        });
    }

    notification() {
        this.playTone(1000, 0.08, 'sine', 0.25);
        setTimeout(() => this.playTone(1200, 0.08, 'sine', 0.25), 100);
    }

    tick() {
        this.playTone(600, 0.03, 'sine', 0.15);
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

const soundManager = new SoundManager();

// Custom Modal System
function showModal(title, message, type = 'info', callback = null) {
    const modal = document.getElementById('custom-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalClose = document.getElementById('modal-close-btn');
    const modalOk = document.getElementById('modal-ok-btn');
    
    // Remove previous type classes
    modal.classList.remove('success', 'error', 'warning');
    
    // Set type
    if (type !== 'info') {
        modal.classList.add(type);
    }
    
    // Set content
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    
    // Show modal
    modal.classList.add('active');
    
    // Close handlers
    const closeModal = () => {
        modal.classList.remove('active');
        if (callback) callback();
    };
    
    modalClose.onclick = closeModal;
    modalOk.onclick = closeModal;
    
    // Close on background click
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeModal();
        }
    };
    
    // Close on Escape key
    const escapeHandler = (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

function showConfirmModal(title, message, onConfirm, onCancel = null) {
    const modal = document.getElementById('custom-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalClose = document.getElementById('modal-close-btn');
    const modalFooter = document.querySelector('.custom-modal-footer');
    
    // Set content
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    
    // Create confirm/cancel buttons
    modalFooter.innerHTML = `
        <button class="custom-modal-btn" id="modal-cancel-btn" style="background: var(--dark-border);">Abbrechen</button>
        <button class="custom-modal-btn" id="modal-confirm-btn" style="background: linear-gradient(135deg, var(--danger-color), #dc2626);">Bestätigen</button>
    `;
    
    // Show modal
    modal.classList.add('active');
    
    // Close handlers
    const closeModal = () => {
        modal.classList.remove('active');
        // Reset footer
        modalFooter.innerHTML = '<button class="custom-modal-btn" id="modal-ok-btn">OK</button>';
    };
    
    modalClose.onclick = () => {
        closeModal();
        if (onCancel) onCancel();
    };
    
    document.getElementById('modal-cancel-btn').onclick = () => {
        closeModal();
        if (onCancel) onCancel();
    };
    
    document.getElementById('modal-confirm-btn').onclick = () => {
        closeModal();
        if (onConfirm) onConfirm();
    };
    
    // Close on background click
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeModal();
            if (onCancel) onCancel();
        }
    };
}

// Game State
let currentUser = null;
let currentRole = null;
let gameState = {
    status: 'waiting', // waiting, active, result
    currentQuestion: null,
    questionIndex: 0,
    questions: [],
    scores: {
        streamer1: 0,
        streamer2: 0
    },
    round: 1,
    videoLinks: {
        streamer1: '',
        streamer2: ''
    },
    answers: {
        streamer1: null,
        streamer2: null
    },
    timer: 30
};


// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing application...');
    console.log('Firebase available:', !!window.db);
    
    // Initialize sound manager
    soundManager.init();
    
    initLogin();
    listenToGameState();
    
    // Initialize default questions in Firebase immediately
    initializeDefaultQuestions();
    
    // Check Firebase connection after a short delay
    setTimeout(() => {
        if (!window.db) {
            console.error('Firebase not initialized after DOM load');
            showModal('Warnung', 'Firebase-Verbindung konnte nicht hergestellt werden. Die Seite funktioniert möglicherweise nicht vollständig.', 'warning');
        } else {
            console.log('Firebase initialized successfully');
        }
    }, 1000);
});

// Login System
function initLogin() {
    const loginOptions = document.querySelectorAll('.login-option');
    const loginForm = document.getElementById('login-form');
    const passwordInput = document.getElementById('password-input');
    const loginSubmit = document.getElementById('login-submit');
    const backBtn = document.getElementById('back-btn');

    loginOptions.forEach(option => {
        option.addEventListener('click', () => {
            soundManager.click();
            const role = option.dataset.role;
            currentRole = role;
            
            // Hide options, show form
            document.querySelector('.login-options').style.display = 'none';
            loginForm.style.display = 'block';
            passwordInput.focus();
        });
    });

    backBtn.addEventListener('click', () => {
        soundManager.click();
        document.querySelector('.login-options').style.display = 'grid';
        loginForm.style.display = 'none';
        passwordInput.value = '';
        currentRole = null;
    });

    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loginSubmit.click();
        }
    });

    loginSubmit.addEventListener('click', () => {
        const password = passwordInput.value.trim();
        const expectedPassword = LOGIN_CREDENTIALS[currentRole];

        if (password === expectedPassword) {
            soundManager.success();
            loginSuccess();
        } else {
            soundManager.error();
            showModal('Fehler', 'Falsches Passwort!', 'error');
            passwordInput.value = '';
            passwordInput.focus();
        }
    });
}

function loginSuccess() {
    currentUser = currentRole === 'host' ? 'Away' : 
                  currentRole === 'streamer1' ? 'HigherCellF' : 'OGAle_';
    
    document.getElementById('login-modal').classList.remove('active');
    document.getElementById('game-container').style.display = 'block';
    document.getElementById('current-user').textContent = currentUser;

    // Show host panel if host
    if (currentRole === 'host') {
        document.getElementById('host-panel').style.display = 'block';
        initHostControls();
    } else {
        document.getElementById('host-panel').style.display = 'none';
        // Show welcome modal for streamers only
        showWelcomeModalForStreamer();
        
        // For streamers: Load initial state from Firebase immediately
        if (window.db) {
            window.db.collection('quiz').doc('gameState').get().then((doc) => {
                // Get document data - in compat version, data() returns null if doc doesn't exist
                const data = doc.data();
                
                if (data) {
                    console.log('Streamer: Loading initial state from Firebase');
                    
                    // Load questions if available
                    if (data.questions && data.questions.length > 0) {
                        gameState.questions = data.questions;
                        console.log('Streamer: Loaded', data.questions.length, 'questions from Firebase');
                    }
                    
                    // Load current state
                    if (data.status) gameState.status = data.status;
                    if (data.questionIndex !== undefined) gameState.questionIndex = data.questionIndex;
                    if (data.round !== undefined) gameState.round = data.round;
                    if (data.scores) gameState.scores = data.scores;
                    if (data.currentQuestion) gameState.currentQuestion = data.currentQuestion;
                    if (data.videoLinks) gameState.videoLinks = data.videoLinks;
                    
                    // Ensure currentQuestion is set if status is active
                    if (gameState.status === 'active' && !gameState.currentQuestion) {
                        if (gameState.questions && gameState.questions.length > 0) {
                            if (gameState.questionIndex >= 0 && gameState.questionIndex < gameState.questions.length) {
                                gameState.currentQuestion = gameState.questions[gameState.questionIndex];
                            }
                        }
                    }
                    
                    updateUI();
                    if (data.videoLinks) {
                        loadVideos();
                    }
                }
            }).catch((error) => {
                console.error('Error loading initial state:', error);
            });
        }
    }

    // Update Firebase with user login (only for host)
    if (currentRole === 'host') {
        updateGameState();
    }
}

function showWelcomeModalForStreamer() {
    // Check if user has already seen the welcome modal
    const hasSeenWelcome = localStorage.getItem('streamerQuiz_welcomeSeen');
    const dontShowAgain = document.getElementById('dont-show-welcome-streamer');
    const closeBtn = document.getElementById('close-welcome-streamer-modal');
    const understoodBtn = document.getElementById('welcome-streamer-understood');
    const welcomeModal = document.getElementById('welcome-streamer-modal');
    
    // If user has seen it and checked "don't show again", skip
    if (hasSeenWelcome === 'true') {
        return;
    }
    
    // Show modal
    welcomeModal.classList.add('active');
    
    // Close handlers
    const closeModal = () => {
        welcomeModal.classList.remove('active');
        // Save preference if checkbox is checked
        if (dontShowAgain.checked) {
            localStorage.setItem('streamerQuiz_welcomeSeen', 'true');
        }
    };
    
    closeBtn.onclick = closeModal;
    understoodBtn.onclick = closeModal;
    
    // Close on background click
    welcomeModal.onclick = (e) => {
        if (e.target === welcomeModal) {
            closeModal();
        }
    };
    
    // Close on Escape key
    const escapeHandler = (e) => {
        if (e.key === 'Escape' && welcomeModal.classList.contains('active')) {
            closeModal();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

// Sound Toggle
document.getElementById('sound-toggle-btn').addEventListener('click', function() {
    const isEnabled = soundManager.toggle();
    const icon = this.querySelector('i');
    
    if (isEnabled) {
        icon.className = 'fas fa-volume-up';
        this.classList.remove('muted');
        soundManager.notification();
    } else {
        icon.className = 'fas fa-volume-mute';
        this.classList.add('muted');
    }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    soundManager.click();
    showConfirmModal('Ausloggen', 'Möchtest du dich wirklich ausloggen?', () => {
        soundManager.notification();
        currentUser = null;
        currentRole = null;
        document.getElementById('game-container').style.display = 'none';
        document.getElementById('login-modal').classList.add('active');
        document.querySelector('.login-options').style.display = 'grid';
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('password-input').value = '';
    });
});

// Host Controls
function initHostControls() {
    const loadVideosBtn = document.getElementById('load-videos-btn');
    const startQuizBtn = document.getElementById('start-quiz-btn');
    const nextQuestionBtn = document.getElementById('next-question-btn');
    const resetQuizBtn = document.getElementById('reset-quiz-btn');
    const addQuestionBtn = document.getElementById('add-question-btn');
    const manageQuestionsBtn = document.getElementById('manage-questions-btn');

    loadVideosBtn.addEventListener('click', () => {
        soundManager.click();
        const link1 = document.getElementById('video-link-1').value.trim();
        const link2 = document.getElementById('video-link-2').value.trim();

        if (link1 && link2) {
            gameState.videoLinks.streamer1 = link1;
            gameState.videoLinks.streamer2 = link2;
            loadVideos();
            updateGameState();
            soundManager.success();
            showModal('Erfolg', 'Videos erfolgreich geladen!', 'success');
        } else {
            soundManager.error();
            showModal('Fehler', 'Bitte beide Video-Links eingeben!', 'error');
        }
    });

    startQuizBtn.addEventListener('click', () => {
        soundManager.click();
        if (gameState.questions.length === 0) {
            soundManager.error();
            showModal('Fehler', 'Bitte füge zuerst Fragen hinzu!', 'error');
            return;
        }
        
        console.log('Starting quiz...');
        soundManager.quizStart();
        
        gameState.status = 'active';
        gameState.questionIndex = 0;
        gameState.scores.streamer1 = 0;
        gameState.scores.streamer2 = 0;
        gameState.round = 1;
        gameState.answers.streamer1 = null;
        gameState.answers.streamer2 = null;
        
        // Ensure currentQuestion is set before updating - use index 0 explicitly
        if (gameState.questions && gameState.questions.length > 0) {
            gameState.currentQuestion = gameState.questions[0];
        }
        
        // Update Firebase first, then UI
        updateGameState();
        
        // Also call loadQuestion to ensure everything is set up
        loadQuestion();
        
        // Update button states
        startQuizBtn.disabled = true;
        document.getElementById('show-answers-btn').disabled = false;
        nextQuestionBtn.disabled = true;
        
        console.log('Quiz started, state:', {
            status: gameState.status,
            questionIndex: gameState.questionIndex,
            round: gameState.round
        });
    });

    const showAnswersBtn = document.getElementById('show-answers-btn');
    
    showAnswersBtn.addEventListener('click', () => {
        soundManager.click();
        if (gameState.status === 'active' && gameState.currentQuestion) {
            evaluateAnswers();
            showAnswersBtn.disabled = true;
            nextQuestionBtn.disabled = false;
        }
    });

    nextQuestionBtn.addEventListener('click', () => {
        soundManager.click();
        if (gameState.questionIndex < gameState.questions.length - 1) {
            console.log('Moving to next question...');
            soundManager.notification();
            gameState.questionIndex++;
            gameState.round++;
            gameState.status = 'active';
            gameState.answers.streamer1 = null;
            gameState.answers.streamer2 = null;
            
            // Load question first, then update state
            loadQuestion();
            updateGameState();
            
            showAnswersBtn.disabled = false;
            nextQuestionBtn.disabled = true;
        } else {
            const finalScore = `Quiz beendet!\n\nFinale Punktzahl:\n\nHigherCellF: ${gameState.scores.streamer1}\nOGAle_: ${gameState.scores.streamer2}`;
            showModal('Quiz beendet!', finalScore, 'success', () => {
                resetQuiz();
            });
        }
    });

    resetQuizBtn.addEventListener('click', () => {
        soundManager.click();
        showConfirmModal('Quiz zurücksetzen', 'Möchtest du das Quiz wirklich zurücksetzen?', () => {
            soundManager.notification();
            resetQuiz();
        });
    });

    addQuestionBtn.addEventListener('click', () => {
        soundManager.click();
        const questionText = document.getElementById('question-text').value.trim();
        const answers = Array.from(document.querySelectorAll('.answer-input')).map(input => input.value.trim());
        const correctAnswer = parseInt(document.getElementById('correct-answer').value);

        if (!questionText || answers.some(a => !a)) {
            soundManager.error();
            showModal('Fehler', 'Bitte fülle alle Felder aus!', 'error');
            return;
        }

        const question = {
            question: questionText,
            answers: answers,
            correct: correctAnswer
        };

        gameState.questions.push(question);
        updateGameState();

        // Clear inputs
        document.getElementById('question-text').value = '';
        document.querySelectorAll('.answer-input').forEach(input => input.value = '');
        document.getElementById('correct-answer').value = '0';

        soundManager.success();
        showModal('Erfolg', `Frage hinzugefügt!\n\n(${gameState.questions.length} Fragen insgesamt)`, 'success');
    });
    
    // Questions Manager
    manageQuestionsBtn.addEventListener('click', () => {
        soundManager.click();
        openQuestionsManager();
    });
}

// Questions Manager Functions
function openQuestionsManager() {
    const modal = document.getElementById('questions-manager-modal');
    const closeBtn = document.getElementById('questions-manager-close-btn');
    const closeBtn2 = document.getElementById('questions-manager-close');
    
    renderQuestionsList();
    modal.classList.add('active');
    
    const closeModal = () => {
        modal.classList.remove('active');
    };
    
    closeBtn.onclick = closeModal;
    closeBtn2.onclick = closeModal;
    
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeModal();
        }
    };
}

function renderQuestionsList() {
    const questionsList = document.getElementById('questions-list');
    
    if (!gameState.questions || gameState.questions.length === 0) {
        questionsList.innerHTML = `
            <div class="empty-questions">
                <i class="fas fa-inbox"></i>
                <p>Keine Fragen vorhanden</p>
            </div>
        `;
        return;
    }
    
    questionsList.innerHTML = gameState.questions.map((question, index) => {
        const correctLetter = String.fromCharCode(65 + question.correct);
        return `
            <div class="question-item">
                <div class="question-item-header">
                    <span class="question-number">Frage ${index + 1}</span>
                    <div class="question-actions">
                        <button class="question-action-btn edit-btn" onclick="editQuestion(${index})">
                            <i class="fas fa-edit"></i> Bearbeiten
                        </button>
                        <button class="question-action-btn delete-btn" onclick="deleteQuestion(${index})">
                            <i class="fas fa-trash"></i> Löschen
                        </button>
                    </div>
                </div>
                <div class="question-text-display">${question.question}</div>
                <div class="question-answers-display">
                    ${question.answers.map((answer, i) => `
                        <div class="answer-display ${i === question.correct ? 'correct' : ''}">
                            ${String.fromCharCode(65 + i)}: ${answer}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function editQuestion(index) {
    soundManager.click();
    const modal = document.getElementById('edit-question-modal');
    const question = gameState.questions[index];
    
    // Fill form with current values
    document.getElementById('edit-question-text').value = question.question;
    document.getElementById('edit-answer-0').value = question.answers[0];
    document.getElementById('edit-answer-1').value = question.answers[1];
    document.getElementById('edit-answer-2').value = question.answers[2];
    document.getElementById('edit-answer-3').value = question.answers[3];
    document.getElementById('edit-correct-answer').value = question.correct;
    
    modal.classList.add('active');
    
    const closeBtn = document.getElementById('edit-question-close-btn');
    const cancelBtn = document.getElementById('edit-question-cancel');
    const saveBtn = document.getElementById('edit-question-save');
    
    const closeModal = () => {
        modal.classList.remove('active');
    };
    
    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;
    
    saveBtn.onclick = () => {
        soundManager.click();
        const questionText = document.getElementById('edit-question-text').value.trim();
        const answers = [
            document.getElementById('edit-answer-0').value.trim(),
            document.getElementById('edit-answer-1').value.trim(),
            document.getElementById('edit-answer-2').value.trim(),
            document.getElementById('edit-answer-3').value.trim()
        ];
        const correctAnswer = parseInt(document.getElementById('edit-correct-answer').value);
        
        if (!questionText || answers.some(a => !a)) {
            soundManager.error();
            showModal('Fehler', 'Bitte fülle alle Felder aus!', 'error');
            return;
        }
        
        // Update question
        gameState.questions[index] = {
            question: questionText,
            answers: answers,
            correct: correctAnswer
        };
        
        updateGameState();
        closeModal();
        renderQuestionsList();
        soundManager.success();
        showModal('Erfolg', 'Frage wurde aktualisiert!', 'success');
    };
    
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeModal();
        }
    };
}

function deleteQuestion(index) {
    soundManager.click();
    showConfirmModal(
        'Frage löschen',
        `Möchtest du Frage ${index + 1} wirklich löschen?`,
        () => {
            gameState.questions.splice(index, 1);
            updateGameState();
            renderQuestionsList();
            soundManager.success();
            showModal('Erfolg', 'Frage wurde gelöscht!', 'success');
        }
    );
}

function loadVideos() {
    const wrapper1 = document.getElementById('video-wrapper-1');
    const wrapper2 = document.getElementById('video-wrapper-2');

    // Extract room ID from vdo.ninja link - supports multiple formats
    function extractRoomId(link) {
        if (!link) return null;
        
        // Format 1: https://vdo.ninja/?ROOMID
        let match = link.match(/vdo\.ninja\/\?([^&\s]+)/);
        if (match) return match[1];
        
        // Format 2: https://vdo.ninja/ROOMID
        match = link.match(/vdo\.ninja\/([^\/\?\s&]+)/);
        if (match) return match[1];
        
        // Format 3: Just the room ID
        if (link.length < 50 && !link.includes('http')) {
            return link.trim();
        }
        
        return null;
    }

    function createVideoIframe(roomId, wrapper) {
        if (!roomId) {
            wrapper.innerHTML = `
                <div class="video-placeholder">
                    <i class="fas fa-video-slash"></i>
                    <p>Kein Video geladen</p>
                </div>
            `;
            return;
        }

        // Clean room ID (remove any extra parameters)
        const cleanRoomId = roomId.split('&')[0].split('?')[0].trim();
        
        // Create iframe with proper attributes for local and live hosting
        const iframe = document.createElement('iframe');
        iframe.src = `https://vdo.ninja/?${cleanRoomId}&view=direct&cleanoutput&autostart&transparent&noheader`;
        iframe.allow = 'camera; microphone; fullscreen; autoplay; encrypted-media';
        iframe.allowFullscreen = true;
        iframe.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;';
        iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-popups allow-forms allow-presentation allow-top-navigation-by-user-activation');
        
        // Add error handling
        iframe.onerror = function() {
            wrapper.innerHTML = `
                <div class="video-placeholder">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Video konnte nicht geladen werden</p>
                    <small>Bitte überprüfe den Link</small>
                </div>
            `;
        };
        
        // Clear wrapper and add iframe
        wrapper.innerHTML = '';
        wrapper.appendChild(iframe);
        
        // Fallback: If iframe doesn't load after 5 seconds, show message
        setTimeout(() => {
            try {
                // Check if iframe content is accessible (will fail if blocked)
                const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                if (!iframeDoc && wrapper.querySelector('iframe')) {
                    // Iframe is blocked, show alternative message
                    console.warn('Video iframe may be blocked. Try running on a local server.');
                }
            } catch (e) {
                // Cross-origin error is expected, but iframe should still work
                console.log('Video iframe loaded (cross-origin check expected)');
            }
        }, 5000);
    }

    const roomId1 = extractRoomId(gameState.videoLinks.streamer1);
    const roomId2 = extractRoomId(gameState.videoLinks.streamer2);

    createVideoIframe(roomId1, wrapper1);
    createVideoIframe(roomId2, wrapper2);
}

function resetQuiz() {
    gameState.status = 'waiting';
    gameState.questionIndex = 0;
    gameState.scores.streamer1 = 0;
    gameState.scores.streamer2 = 0;
    gameState.round = 1;
    gameState.answers.streamer1 = null;
    gameState.answers.streamer2 = null;
    gameState.currentQuestion = null;

    updateGameState();
    updateUI();

    // Reset buttons
    const startBtn = document.getElementById('start-quiz-btn');
    const showAnswersBtn = document.getElementById('show-answers-btn');
    const nextBtn = document.getElementById('next-question-btn');
    
    if (startBtn) startBtn.disabled = false;
    if (showAnswersBtn) showAnswersBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
}

// Game Logic
function loadQuestion() {
    if (gameState.questionIndex >= gameState.questions.length) {
        console.warn('Question index out of bounds');
        return;
    }

    if (gameState.questions && gameState.questions.length > 0 && gameState.questionIndex < gameState.questions.length) {
        // Always load question from array to ensure it's correct
        gameState.currentQuestion = gameState.questions[gameState.questionIndex];
        
        // Reset answers ONLY if we are the host
        // Streamers will have their answers reset via Firebase listener when question changes
        if (currentRole === 'host') {
            gameState.answers.streamer1 = null;
            gameState.answers.streamer2 = null;
        }

        console.log('Loading question:', {
            index: gameState.questionIndex,
            question: gameState.currentQuestion.question.substring(0, 50) + '...',
            role: currentRole
        });

        // Update UI first to show question immediately
        updateUI();
        // Then sync to Firebase
        updateGameState();
    } else {
        console.error('Cannot load question - questions array issue:', {
            hasQuestions: !!gameState.questions,
            questionsLength: gameState.questions?.length,
            questionIndex: gameState.questionIndex
        });
    }
}

function evaluateAnswers() {
    const correctAnswer = gameState.currentQuestion.correct;
    const answer1 = gameState.answers.streamer1;
    const answer2 = gameState.answers.streamer2;

    console.log('Evaluating answers:', {
        correctAnswer: correctAnswer,
        streamer1: answer1,
        streamer2: answer2,
        currentScores: { ...gameState.scores }
    });

    // Track if any correct answers for sound
    let hasCorrect = false;
    let hasWrong = false;

    // Update scores - only if answer is not null/undefined and matches correct answer
    if (answer1 !== null && answer1 !== undefined) {
        if (answer1 === correctAnswer) {
            gameState.scores.streamer1++;
            hasCorrect = true;
            console.log('Streamer1 scored! New score:', gameState.scores.streamer1);
        } else {
            hasWrong = true;
        }
    }
    
    if (answer2 !== null && answer2 !== undefined) {
        if (answer2 === correctAnswer) {
            gameState.scores.streamer2++;
            hasCorrect = true;
            console.log('Streamer2 scored! New score:', gameState.scores.streamer2);
        } else {
            hasWrong = true;
        }
    }

    // Play sound based on results
    if (hasCorrect && hasWrong) {
        // Mixed results - play notification
        soundManager.notification();
    } else if (hasCorrect) {
        // All correct
        soundManager.correct();
    } else if (hasWrong) {
        // All wrong
        soundManager.wrong();
    }

    console.log('Final scores after evaluation:', gameState.scores);

    gameState.status = 'result';
    updateGameState();
    updateUI();
}

// Answer Submission (for streamers)
function submitAnswer(answerIndex) {
    soundManager.click();
    
    if (currentRole === 'host') {
        showModal('Info', 'Als Host kannst du keine Antworten abgeben!', 'info');
        return;
    }

    if (gameState.status !== 'active') {
        console.warn('Cannot submit answer - quiz not active');
        return;
    }

    const answerKey = currentRole === 'streamer1' ? 'streamer1' : 'streamer2';
    
    if (gameState.answers[answerKey] !== null) {
        showModal('Info', 'Du hast bereits geantwortet!', 'info');
        return;
    }

    console.log('Submitting answer:', {
        streamer: answerKey,
        answerIndex: answerIndex,
        answer: String.fromCharCode(65 + answerIndex)
    });

    gameState.answers[answerKey] = answerIndex;
    updateGameState();
    updateUI();

    // Note: Host controls when to show answers, so we don't auto-evaluate here
}

// UI Updates
function updateUI() {
    // Update scores
    document.getElementById('score-1').textContent = gameState.scores.streamer1;
    document.getElementById('score-2').textContent = gameState.scores.streamer2;

    // Update round
    document.getElementById('round-number').textContent = gameState.round;

    // Update quiz area
    const waitingArea = document.getElementById('quiz-waiting');
    const activeArea = document.getElementById('quiz-active');
    const resultArea = document.getElementById('quiz-result');

    if (gameState.status === 'waiting') {
        waitingArea.style.display = 'block';
        activeArea.style.display = 'none';
        resultArea.style.display = 'none';
    } else if (gameState.status === 'active') {
        waitingArea.style.display = 'none';
        activeArea.style.display = 'block';
        resultArea.style.display = 'none';

        // CRITICAL: Ensure currentQuestion is always set when status is active
        if (!gameState.currentQuestion || !gameState.currentQuestion.question) {
            // Try to load from questions array
            if (gameState.questions && gameState.questions.length > 0) {
                if (gameState.questionIndex >= 0 && gameState.questionIndex < gameState.questions.length) {
                    gameState.currentQuestion = gameState.questions[gameState.questionIndex];
                    console.log('updateUI: Loaded question from array, index:', gameState.questionIndex);
                }
            }
        }

        // Update question - should now always be available
        const questionElement = document.getElementById('question-text');
        const questionNumberElement = document.getElementById('question-number');
        
        if (questionNumberElement) {
            questionNumberElement.textContent = `Frage ${gameState.questionIndex + 1}`;
        }
        
        if (questionElement) {
            if (gameState.currentQuestion && gameState.currentQuestion.question) {
                questionElement.textContent = gameState.currentQuestion.question;
            } else {
                questionElement.textContent = 'Frage wird geladen...';
                console.warn('updateUI: Question not available, attempting to load...', {
                    hasQuestions: !!gameState.questions,
                    questionsLength: gameState.questions?.length,
                    questionIndex: gameState.questionIndex,
                    hasCurrentQuestion: !!gameState.currentQuestion
                });
                
                // Force reload if question is missing
                if (gameState.questions && gameState.questions.length > 0 && gameState.questionIndex < gameState.questions.length) {
                    setTimeout(() => {
                        if (gameState.questions[gameState.questionIndex]) {
                            gameState.currentQuestion = gameState.questions[gameState.questionIndex];
                            updateUI();
                        }
                    }, 100);
                }
            }
        }

        // Update Host Live Answers Display
        const hostLiveAnswers = document.getElementById('host-live-answers');
        if (hostLiveAnswers) {
            if (currentRole === 'host') {
                hostLiveAnswers.style.display = 'block';
                
                // Update Streamer 1 answer
                const answer1 = gameState.answers.streamer1;
                const answerText1 = document.getElementById('live-answer-text-1');
                if (answerText1) {
                    console.log('Host Live Display - Streamer1 answer:', answer1, 'hasQuestion:', !!gameState.currentQuestion);
                    if (answer1 !== null && answer1 !== undefined && gameState.currentQuestion && gameState.currentQuestion.answers && gameState.currentQuestion.answers[answer1]) {
                        const answerLetter = String.fromCharCode(65 + answer1);
                        answerText1.textContent = `${answerLetter}: ${gameState.currentQuestion.answers[answer1]}`;
                        answerText1.style.color = 'var(--streamer1-color)';
                        answerText1.style.fontWeight = '600';
                    } else {
                        answerText1.textContent = 'Noch keine Antwort';
                        answerText1.style.color = 'var(--text-secondary)';
                        answerText1.style.fontWeight = '400';
                    }
                }
                
                // Update Streamer 2 answer
                const answer2 = gameState.answers.streamer2;
                const answerText2 = document.getElementById('live-answer-text-2');
                if (answerText2) {
                    console.log('Host Live Display - Streamer2 answer:', answer2, 'hasQuestion:', !!gameState.currentQuestion);
                    if (answer2 !== null && answer2 !== undefined && gameState.currentQuestion && gameState.currentQuestion.answers && gameState.currentQuestion.answers[answer2]) {
                        const answerLetter = String.fromCharCode(65 + answer2);
                        answerText2.textContent = `${answerLetter}: ${gameState.currentQuestion.answers[answer2]}`;
                        answerText2.style.color = 'var(--streamer2-color)';
                        answerText2.style.fontWeight = '600';
                    } else {
                        answerText2.textContent = 'Noch keine Antwort';
                        answerText2.style.color = 'var(--text-secondary)';
                        answerText2.style.fontWeight = '400';
                    }
                }
            } else {
                hostLiveAnswers.style.display = 'none';
            }
        }

        // Update answers
        const answersGrid = document.getElementById('answers-grid');
        answersGrid.innerHTML = '';

        // Only show answers if question is loaded
        if (gameState.currentQuestion && gameState.currentQuestion.answers) {
            gameState.currentQuestion.answers.forEach((answer, index) => {
            const answerBtn = document.createElement('button');
            answerBtn.className = 'answer-btn';
            answerBtn.dataset.label = String.fromCharCode(65 + index); // A, B, C, D
            answerBtn.dataset.index = index;
            
            const span = document.createElement('span');
            span.textContent = answer;
            answerBtn.appendChild(span);

            // Check if already answered
            const answerKey = currentRole === 'streamer1' ? 'streamer1' : 
                             currentRole === 'streamer2' ? 'streamer2' : null;
            
            if (answerKey && gameState.answers[answerKey] === index) {
                answerBtn.classList.add('selected');
            }

            // Show correct/incorrect if in result state
            if (gameState.status === 'result') {
                if (index === gameState.currentQuestion.correct) {
                    answerBtn.classList.add('correct');
                } else if (answerKey && gameState.answers[answerKey] === index && index !== gameState.currentQuestion.correct) {
                    answerBtn.classList.add('incorrect');
                }
                answerBtn.disabled = true;
            } else {
                answerBtn.addEventListener('click', () => {
                    submitAnswer(index);
                });
            }

            answersGrid.appendChild(answerBtn);
            });
        }
    } else if (gameState.status === 'result' && gameState.currentQuestion) {
        waitingArea.style.display = 'none';
        activeArea.style.display = 'block';
        resultArea.style.display = 'block';

        const answerKey = currentRole === 'streamer1' ? 'streamer1' : 
                         currentRole === 'streamer2' ? 'streamer2' : null;
        
        if (answerKey) {
            // Streamer view - use same design as host
            const streamerView = document.getElementById('result-streamer-view');
            const hostView = document.getElementById('result-host-view');
            streamerView.style.display = 'block';
            hostView.style.display = 'none';
            
            // Calculate results for both streamers
            const correctAnswer = gameState.currentQuestion.correct;
            const answer1 = gameState.answers.streamer1;
            const answer2 = gameState.answers.streamer2;
            
            const result1 = answer1 !== null && answer1 !== undefined && answer1 === correctAnswer;
            const result2 = answer2 !== null && answer2 !== undefined && answer2 === correctAnswer;
            
            // Update streamer 1 card
            const streamer1Card = document.getElementById('result-streamer-view-1');
            const streamer1Status = document.getElementById('result-streamer-status-1');
            if (streamer1Card && streamer1Status) {
                streamer1Card.className = `result-streamer-card ${result1 ? 'correct' : 'incorrect'}`;
                streamer1Status.className = `result-status ${result1 ? 'correct' : 'incorrect'}`;
                if (answer1 === null || answer1 === undefined) {
                    streamer1Status.innerHTML = '<i class="fas fa-question-circle"></i><span>Keine Antwort</span>';
                    streamer1Card.className = 'result-streamer-card';
                    streamer1Status.className = 'result-status';
                } else {
                    streamer1Status.innerHTML = result1 ? 
                        '<i class="fas fa-check-circle"></i><span>Richtig</span>' : 
                        '<i class="fas fa-times-circle"></i><span>Falsch</span>';
                }
            }
            
            // Update streamer 2 card
            const streamer2Card = document.getElementById('result-streamer-view-2');
            const streamer2Status = document.getElementById('result-streamer-status-2');
            if (streamer2Card && streamer2Status) {
                streamer2Card.className = `result-streamer-card ${result2 ? 'correct' : 'incorrect'}`;
                streamer2Status.className = `result-status ${result2 ? 'correct' : 'incorrect'}`;
                if (answer2 === null || answer2 === undefined) {
                    streamer2Status.innerHTML = '<i class="fas fa-question-circle"></i><span>Keine Antwort</span>';
                    streamer2Card.className = 'result-streamer-card';
                    streamer2Status.className = 'result-status';
                } else {
                    streamer2Status.innerHTML = result2 ? 
                        '<i class="fas fa-check-circle"></i><span>Richtig</span>' : 
                        '<i class="fas fa-times-circle"></i><span>Falsch</span>';
                }
            }
            
            // Show correct answer
            const correctAnswerLetter = String.fromCharCode(65 + gameState.currentQuestion.correct);
            const correctAnswerDisplay = document.getElementById('result-streamer-correct-answer');
            if (correctAnswerDisplay) {
                correctAnswerDisplay.textContent = correctAnswerLetter;
            }
        } else {
            // Host view
            const streamerView = document.getElementById('result-streamer-view');
            const hostView = document.getElementById('result-host-view');
            streamerView.style.display = 'none';
            hostView.style.display = 'block';
            
            // Calculate results - check if answers match correct answer
            const correctAnswer = gameState.currentQuestion.correct;
            const answer1 = gameState.answers.streamer1;
            const answer2 = gameState.answers.streamer2;
            
            const result1 = answer1 !== null && answer1 !== undefined && answer1 === correctAnswer;
            const result2 = answer2 !== null && answer2 !== undefined && answer2 === correctAnswer;
            
            console.log('Host view - Evaluating answers:', {
                correctAnswer: correctAnswer,
                streamer1Answer: answer1,
                streamer2Answer: answer2,
                streamer1Correct: result1,
                streamer2Correct: result2,
                currentScores: gameState.scores,
                allAnswers: gameState.answers
            });
            
            // Update streamer 1 card
            const streamer1Card = document.getElementById('result-streamer1');
            const streamer1Status = document.getElementById('result-status-1');
            if (streamer1Card && streamer1Status) {
                streamer1Card.className = `result-streamer-card ${result1 ? 'correct' : 'incorrect'}`;
                streamer1Status.className = `result-status ${result1 ? 'correct' : 'incorrect'}`;
                if (answer1 === null || answer1 === undefined) {
                    streamer1Status.innerHTML = '<i class="fas fa-question-circle"></i><span>Keine Antwort</span>';
                    streamer1Card.className = 'result-streamer-card';
                    streamer1Status.className = 'result-status';
                } else {
                    streamer1Status.innerHTML = result1 ? 
                        '<i class="fas fa-check-circle"></i><span>Richtig</span>' : 
                        '<i class="fas fa-times-circle"></i><span>Falsch</span>';
                }
            }
            
            // Update streamer 2 card
            const streamer2Card = document.getElementById('result-streamer2');
            const streamer2Status = document.getElementById('result-status-2');
            if (streamer2Card && streamer2Status) {
                streamer2Card.className = `result-streamer-card ${result2 ? 'correct' : 'incorrect'}`;
                streamer2Status.className = `result-status ${result2 ? 'correct' : 'incorrect'}`;
                if (answer2 === null || answer2 === undefined) {
                    streamer2Status.innerHTML = '<i class="fas fa-question-circle"></i><span>Keine Antwort</span>';
                    streamer2Card.className = 'result-streamer-card';
                    streamer2Status.className = 'result-status';
                } else {
                    streamer2Status.innerHTML = result2 ? 
                        '<i class="fas fa-check-circle"></i><span>Richtig</span>' : 
                        '<i class="fas fa-times-circle"></i><span>Falsch</span>';
                }
            }
            
            // Show correct answer
            const correctAnswerLetter = String.fromCharCode(65 + gameState.currentQuestion.correct);
            const correctAnswerDisplay = document.getElementById('correct-answer-display');
            if (correctAnswerDisplay) {
                correctAnswerDisplay.textContent = correctAnswerLetter;
            }
        }
    }
}

// Firebase Integration
function updateGameState() {
    // Always update UI first for immediate feedback
    updateUI();
    
    if (!window.db) {
        console.warn('Firebase not initialized - running in local mode only');
        return;
    }

    // Ensure questions are included in the update
    const stateToUpdate = {
        ...gameState,
        questions: gameState.questions, // Explicitly include questions
        currentQuestion: gameState.currentQuestion, // Include current question
        lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
    };

    console.log('Updating game state to Firebase:', {
        status: gameState.status,
        questionIndex: gameState.questionIndex,
        round: gameState.round
    });

    window.db.collection('quiz').doc('gameState').set(stateToUpdate, { merge: false })
        .then(() => {
            console.log('Game state updated successfully to Firebase');
        })
        .catch(error => {
            console.error('Error updating game state:', error);
            // UI already updated above, so we're good
        });
}

function listenToGameState() {
    if (!window.db) {
        console.error('Firebase not initialized');
        return;
    }

    console.log('Setting up Firebase listener for game state...');

    window.db.collection('quiz').doc('gameState').onSnapshot((doc) => {
        // Get document data - in compat version, data() returns null if doc doesn't exist
        const data = doc.data();
        
        if (data) {
            
            console.log('Firebase update received:', {
                status: data.status,
                questionIndex: data.questionIndex,
                round: data.round,
                currentRole: currentRole
            });
            
            // Host should also update UI when state changes (for immediate feedback)
            // but we need to be careful not to overwrite local changes
            if (currentRole === 'host') {
                // Host controls the state, but sync videos and update UI
                if (data.videoLinks && 
                    (data.videoLinks.streamer1 !== gameState.videoLinks.streamer1 ||
                     data.videoLinks.streamer2 !== gameState.videoLinks.streamer2)) {
                    gameState.videoLinks = data.videoLinks;
                    loadVideos();
                }
                
                // CRITICAL: Host must receive answers from streamers to show live answers
                if (data.answers) {
                    // Only update answers if they changed (to see streamer responses)
                    if (data.answers.streamer1 !== gameState.answers.streamer1 ||
                        data.answers.streamer2 !== gameState.answers.streamer2) {
                        gameState.answers = {
                            streamer1: data.answers.streamer1 ?? gameState.answers.streamer1,
                            streamer2: data.answers.streamer2 ?? gameState.answers.streamer2
                        };
                        console.log('Host: Received answers update:', gameState.answers);
                    }
                }
                
                // Update UI for host too (for immediate feedback)
                // Only sync non-critical fields from Firebase to avoid conflicts
                if (data.status && data.status !== gameState.status) {
                    gameState.status = data.status;
                }
                if (data.questionIndex !== undefined && data.questionIndex !== gameState.questionIndex) {
                    gameState.questionIndex = data.questionIndex;
                }
                if (data.round !== undefined && data.round !== gameState.round) {
                    gameState.round = data.round;
                }
                if (data.scores) {
                    gameState.scores = { ...gameState.scores, ...data.scores };
                }
                if (data.currentQuestion && data.currentQuestion.question) {
                    gameState.currentQuestion = data.currentQuestion;
                }
                
                updateUI();
                return;
            }

            // Update game state for streamers
            const oldStatus = gameState.status;
            const oldQuestionIndex = gameState.questionIndex;
            
            // Preserve questions array if it exists locally (should be same for all)
            // Use Firebase questions if local ones don't exist
            const questionsToUse = data.questions && data.questions.length > 0 
                ? data.questions 
                : (gameState.questions && gameState.questions.length > 0 ? gameState.questions : []);
            
            // Determine which answer key belongs to this streamer
            const myAnswerKey = currentRole === 'streamer1' ? 'streamer1' : 'streamer2';
            const otherAnswerKey = currentRole === 'streamer1' ? 'streamer2' : 'streamer1';
            
            // CRITICAL FIX: Preserve this streamer's local answer unless question changed
            // Only sync the OTHER streamer's answer from Firebase
            const shouldResetMyAnswer = oldQuestionIndex !== data.questionIndex || 
                                       oldStatus === 'waiting' && data.status === 'active' ||
                                       data.status === 'waiting';
            
            gameState = {
                ...gameState,
                ...data,
                // Use questions from Firebase if available, otherwise keep local
                questions: questionsToUse,
                // Preserve local answer for this streamer, but sync other streamer's answer
                answers: {
                    [myAnswerKey]: shouldResetMyAnswer ? null : gameState.answers[myAnswerKey],
                    [otherAnswerKey]: data.answers?.[otherAnswerKey] ?? null
                }
            };

            console.log('Streamer Firebase update:', {
                role: currentRole,
                myAnswer: gameState.answers[myAnswerKey],
                otherAnswer: gameState.answers[otherAnswerKey],
                questionChanged: oldQuestionIndex !== data.questionIndex,
                shouldReset: shouldResetMyAnswer
            });

            // CRITICAL: Always ensure currentQuestion is set when status is active
            if (gameState.status === 'active') {
                // Priority 1: Use currentQuestion from Firebase if available
                if (data.currentQuestion && data.currentQuestion.question) {
                    gameState.currentQuestion = data.currentQuestion;
                    console.log('Using currentQuestion from Firebase');
                }
                // Priority 2: Load from questions array using questionIndex
                else if (gameState.questions && gameState.questions.length > 0) {
                    if (gameState.questionIndex >= 0 && gameState.questionIndex < gameState.questions.length) {
                        gameState.currentQuestion = gameState.questions[gameState.questionIndex];
                        console.log('Loaded currentQuestion from questions array, index:', gameState.questionIndex);
                    }
                }
                
                // If still no question, log error
                if (!gameState.currentQuestion || !gameState.currentQuestion.question) {
                    console.error('CRITICAL: currentQuestion is missing!', {
                        hasQuestions: !!gameState.questions,
                        questionsLength: gameState.questions?.length,
                        questionIndex: gameState.questionIndex,
                        hasDataCurrentQuestion: !!data.currentQuestion
                    });
                }
            }

            // Load videos if changed
            if (data.videoLinks && 
                (data.videoLinks.streamer1 !== gameState.videoLinks.streamer1 ||
                 data.videoLinks.streamer2 !== gameState.videoLinks.streamer2)) {
                gameState.videoLinks = data.videoLinks;
                loadVideos();
            }

            console.log('Updating UI after Firebase sync');
            updateUI();
        } else {
            console.warn('Firebase document does not exist or has no data');
        }
    }, (error) => {
        console.error('Error listening to game state:', error);
        showModal('Fehler', 'Verbindung zu Firebase verloren. Bitte Seite neu laden.', 'error');
    });
}

// Initialize default questions in Firebase
function initializeDefaultQuestions() {
    if (!window.db) {
        console.log('Firebase not available, using local questions only');
        return;
    }
    
    window.db.collection('quiz').doc('gameState').get().then((doc) => {
        const data = doc.data();
        // If Firebase has no questions or fewer questions, update it with defaults
        if (!data || !data.questions || data.questions.length === 0) {
            console.log('Initializing Firebase with default questions...');
            window.db.collection('quiz').doc('gameState').set({
                ...gameState,
                questions: defaultQuestions,
                lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true }).then(() => {
                console.log('Default questions synced to Firebase successfully');
                gameState.questions = [...defaultQuestions];
            }).catch(error => {
                console.error('Error syncing default questions:', error);
            });
        } else {
            console.log('Firebase already has questions, loading them...');
            gameState.questions = data.questions;
        }
    }).catch(error => {
        console.error('Error checking Firebase questions:', error);
    });
}

// Initialize default questions - 30 Schwierige Anime Fragen (jeweils aus einem anderen Anime)
const defaultQuestions = [
    {
        question: "Wie heißt der Stand von Jotaro Kujo in 'JoJo's Bizarre Adventure: Stardust Crusaders'?",
        answers: ["Star Platinum", "The World", "Hierophant Green", "Silver Chariot"],
        correct: 0
    },
    {
        question: "Welche Blutgruppe hat der Hauptcharakter in 'Tokyo Ghoul' nach seiner Transformation?",
        answers: ["O+", "AB-", "Keine (Ghoul)", "B+"],
        correct: 2
    },
    {
        question: "Wie viele Jahre war Luffy in 'One Piece' beim Training mit Rayleigh?",
        answers: ["1 Jahr", "1,5 Jahre", "2 Jahre", "3 Jahre"],
        correct: 2
    },
    {
        question: "Welcher Charakter in 'Attack on Titan' ist der 'Beast Titan'?",
        answers: ["Eren Jaeger", "Zeke Jaeger", "Reiner Braun", "Bertolt Hoover"],
        correct: 1
    },
    {
        question: "Wie heißt die Schwester von Killua in 'Hunter x Hunter'?",
        answers: ["Alluka", "Kalluto", "Milluki", "Illumi"],
        correct: 0
    },
    {
        question: "Welche Nummer hat der 'One for All' Quirk in 'My Hero Academia'?",
        answers: ["7", "8", "9", "10"],
        correct: 2
    },
    {
        question: "Wie heißt der Vater von Tanjiro in 'Demon Slayer'?",
        answers: ["Tanjuro Kamado", "Kie Kamado", "Takeo Kamado", "Shigeru Kamado"],
        correct: 0
    },
    {
        question: "Welcher Charakter in 'Death Note' ist der zweite L?",
        answers: ["Mello", "Near", "Matt", "Misa Amane"],
        correct: 1
    },
    {
        question: "Welche Farbe hat der 'Bankai' von Byakuya Kuchiki in 'Bleach'?",
        answers: ["Weiß", "Rosa", "Blau", "Schwarz"],
        correct: 0
    },
    {
        question: "Wie heißt der echte Name von 'King' in 'One Punch Man'?",
        answers: ["Saitama", "Genos", "Er hat keinen Namen", "Tatsumaki"],
        correct: 2
    },
    {
        question: "Welcher Charakter in 'Fullmetal Alchemist' ist der 'Flame Alchemist'?",
        answers: ["Edward Elric", "Roy Mustang", "Riza Hawkeye", "Maes Hughes"],
        correct: 1
    },
    {
        question: "Wie viele 'Cursed Techniques' hat Satoru Gojo in 'Jujutsu Kaisen'?",
        answers: ["1", "2", "3", "4"],
        correct: 1
    },
    {
        question: "Welcher Charakter in 'Naruto' ist der 'Copy Ninja'?",
        answers: ["Kakashi Hatake", "Might Guy", "Asuma Sarutobi", "Kurenai Yuhi"],
        correct: 0
    },
    {
        question: "Wie heißt der 'Devil' von Power in 'Chainsaw Man'?",
        answers: ["Blood Devil", "Power Devil", "Control Devil", "Gun Devil"],
        correct: 0
    },
    {
        question: "Welcher Charakter in 'Code Geass' hat den Geass 'Absolute Obedience'?",
        answers: ["Lelouch", "C.C.", "Mao", "Rolo"],
        correct: 3
    },
    {
        question: "Welcher Charakter in 'The Promised Neverland' ist der 'Jäger'?",
        answers: ["Norman", "Ray", "Isabella", "Peter Ratri"],
        correct: 3
    },
    {
        question: "Welcher Charakter in 'Steins;Gate' hat die Fähigkeit 'Reading Steiner'?",
        answers: ["Rintaro Okabe", "Kurisu Makise", "Mayuri Shiina", "Itaru Hashida"],
        correct: 0
    },
    {
        question: "Welcher Charakter in 'Mob Psycho 100' ist der 'Greatest Psychic of the 20th Century'?",
        answers: ["Reigen Arataka", "Shigeo Kageyama", "Toichiro Suzuki", "Dimple"],
        correct: 0
    },
    {
        question: "Wie heißt der 'Grimoire' von Asta in 'Black Clover'?",
        answers: ["5-Blatt Grimoire", "4-Blatt Grimoire", "3-Blatt Grimoire", "Anti-Magic Grimoire"],
        correct: 0
    },
    {
        question: "Welcher Charakter in 'Fairy Tail' ist der 'Salamander'?",
        answers: ["Natsu Dragneel", "Gray Fullbuster", "Erza Scarlet", "Lucy Heartfilia"],
        correct: 0
    },
    {
        question: "Wie viele 'Dragon Balls' gibt es in 'Dragon Ball Z' insgesamt?",
        answers: ["5", "6", "7", "8"],
        correct: 2
    },
    {
        question: "Welcher Charakter in 'Neon Genesis Evangelion' ist der 'First Child'?",
        answers: ["Shinji Ikari", "Rei Ayanami", "Asuka Langley", "Kaworu Nagisa"],
        correct: 1
    },
    {
        question: "Wie heißt das Raumschiff in 'Cowboy Bebop'?",
        answers: ["Bebop", "Swordfish", "Red Tail", "Hammer Head"],
        correct: 0
    },
    {
        question: "Welcher Charakter in 'Trigun' hat die Belohnung von 60 Milliarden Double Dollars?",
        answers: ["Vash the Stampede", "Nicholas D. Wolfwood", "Meryl Stryfe", "Millions Knives"],
        correct: 0
    },
    {
        question: "Wie heißt der 'Gurren Lagann' in 'Tengen Toppa Gurren Lagann'?",
        answers: ["Gurren Lagann", "Lazengann", "Arcadia Gurren", "Super Galaxy Gurren Lagann"],
        correct: 0
    },
    {
        question: "Welcher Charakter in 'Kill la Kill' trägt das 'Kamui Senketsu'?",
        answers: ["Ryuko Matoi", "Satsuki Kiryuin", "Mako Mankanshoku", "Ragyo Kiryuin"],
        correct: 0
    },
    {
        question: "Wie heißt die Fähigkeit von Subaru in 'Re:Zero'?",
        answers: ["Return by Death", "Time Loop", "Reset Ability", "Checkpoint"],
        correct: 0
    },
    {
        question: "Welcher Charakter in 'Overlord' ist der 'Floor Guardian' des 7. Stockwerks?",
        answers: ["Demiurge", "Albedo", "Shalltear Bloodfallen", "Cocytus"],
        correct: 0
    },
    {
        question: "Wie heißt das Königreich in 'No Game No Life', in dem Sora und Shiro landen?",
        answers: ["Elchea", "Imanity", "Disboard", "Avant Heim"],
        correct: 2
    },
    {
        question: "Wie tief ist der 'Abyss' in 'Made in Abyss' insgesamt?",
        answers: ["15.000 Meter", "20.000 Meter", "25.000 Meter", "30.000 Meter"],
        correct: 1
    }
];

// Initialize questions in gameState
gameState.questions = [...defaultQuestions];

