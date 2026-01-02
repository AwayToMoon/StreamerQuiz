// Login Credentials
const LOGIN_CREDENTIALS = {
    host: 'Away2026',
    streamer1: 'HigherCellF2026',
    streamer2: 'OGAle_2026'
};

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
    
    initLogin();
    listenToGameState();
    
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
            const role = option.dataset.role;
            currentRole = role;
            
            // Hide options, show form
            document.querySelector('.login-options').style.display = 'none';
            loginForm.style.display = 'block';
            passwordInput.focus();
        });
    });

    backBtn.addEventListener('click', () => {
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
            loginSuccess();
        } else {
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
                    if (data.videoLinks) {
                        gameState.videoLinks = {
                            streamer1: data.videoLinks.streamer1 || '',
                            streamer2: data.videoLinks.streamer2 || ''
                        };
                    }
                    
                    // Ensure currentQuestion is set if status is active
                    if (gameState.status === 'active' && !gameState.currentQuestion) {
                        if (gameState.questions && gameState.questions.length > 0) {
                            if (gameState.questionIndex >= 0 && gameState.questionIndex < gameState.questions.length) {
                                gameState.currentQuestion = gameState.questions[gameState.questionIndex];
                            }
                        }
                    }
                    
                    updateUI();
                    // Always load videos if links are available
                    if (data.videoLinks && (data.videoLinks.streamer1 || data.videoLinks.streamer2)) {
                        console.log('Streamer: Loading videos on initial login', data.videoLinks);
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

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    showConfirmModal('Ausloggen', 'Möchtest du dich wirklich ausloggen?', () => {
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

    loadVideosBtn.addEventListener('click', () => {
        const link1 = document.getElementById('video-link-1').value.trim();
        const link2 = document.getElementById('video-link-2').value.trim();

        if (link1 && link2) {
            gameState.videoLinks.streamer1 = link1;
            gameState.videoLinks.streamer2 = link2;
            loadVideos();
            updateGameState();
            showModal('Erfolg', 'Videos erfolgreich geladen!', 'success');
        } else {
            showModal('Fehler', 'Bitte beide Video-Links eingeben!', 'error');
        }
    });

    startQuizBtn.addEventListener('click', () => {
        if (gameState.questions.length === 0) {
            showModal('Fehler', 'Bitte füge zuerst Fragen hinzu!', 'error');
            return;
        }
        
        console.log('Starting quiz...');
        
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
            console.log('Set currentQuestion:', {
                hasQuestion: !!gameState.currentQuestion,
                questionText: gameState.currentQuestion?.question?.substring(0, 50),
                hasAnswers: !!gameState.currentQuestion?.answers
            });
        }
        
        // Load question first to ensure everything is set up properly
        // This will update UI and sync to Firebase
        loadQuestion();
        
        // Update button states
        startQuizBtn.disabled = true;
        document.getElementById('show-answers-btn').disabled = false;
        nextQuestionBtn.disabled = true;
        
        console.log('Quiz started, state:', {
            status: gameState.status,
            questionIndex: gameState.questionIndex,
            round: gameState.round,
            hasCurrentQuestion: !!gameState.currentQuestion,
            questionText: gameState.currentQuestion?.question?.substring(0, 50)
        });
    });

    const showAnswersBtn = document.getElementById('show-answers-btn');
    
    showAnswersBtn.addEventListener('click', () => {
        if (gameState.status === 'active' && gameState.currentQuestion) {
            evaluateAnswers();
            showAnswersBtn.disabled = true;
            nextQuestionBtn.disabled = false;
        }
    });

    nextQuestionBtn.addEventListener('click', () => {
        if (gameState.questionIndex < gameState.questions.length - 1) {
            console.log('Moving to next question...');
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
        showConfirmModal('Quiz zurücksetzen', 'Möchtest du das Quiz wirklich zurücksetzen?', () => {
            resetQuiz();
        });
    });

    addQuestionBtn.addEventListener('click', () => {
        const questionText = document.getElementById('question-text-input').value.trim();
        const answers = Array.from(document.querySelectorAll('.answer-input')).map(input => input.value.trim());
        const correctAnswer = parseInt(document.getElementById('correct-answer').value);

        if (!questionText || answers.some(a => !a)) {
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
        document.getElementById('question-text-input').value = '';
        document.querySelectorAll('.answer-input').forEach(input => input.value = '');
        document.getElementById('correct-answer').value = '0';

        showModal('Erfolg', `Frage hinzugefügt!\n\n(${gameState.questions.length} Fragen insgesamt)`, 'success');
    });

    // Fragen verwalten Button
    const manageQuestionsBtn = document.getElementById('manage-questions-btn');
    const questionsManagerModal = document.getElementById('questions-manager-modal');
    const questionsManagerCloseBtn = document.getElementById('questions-manager-close-btn');
    const questionsManagerClose = document.getElementById('questions-manager-close');
    const questionsList = document.getElementById('questions-list');

    manageQuestionsBtn.addEventListener('click', () => {
        renderQuestionsList();
        questionsManagerModal.classList.add('active');
    });

    questionsManagerCloseBtn.addEventListener('click', () => {
        questionsManagerModal.classList.remove('active');
    });

    questionsManagerClose.addEventListener('click', () => {
        questionsManagerModal.classList.remove('active');
    });

    // Close modal on background click
    questionsManagerModal.addEventListener('click', (e) => {
        if (e.target === questionsManagerModal) {
            questionsManagerModal.classList.remove('active');
        }
    });
}

// Fragen-Liste rendern
function renderQuestionsList() {
    const questionsList = document.getElementById('questions-list');
    questionsList.innerHTML = '';

    if (gameState.questions.length === 0) {
        questionsList.innerHTML = `
            <div class="empty-questions">
                <i class="fas fa-inbox"></i>
                <p>Noch keine Fragen vorhanden</p>
            </div>
        `;
        return;
    }

    gameState.questions.forEach((question, index) => {
        const questionItem = document.createElement('div');
        questionItem.className = 'question-item';
        questionItem.dataset.index = index;
        questionItem.draggable = true;

        const correctAnswerLetter = String.fromCharCode(65 + question.correct);
        const isFirst = index === 0;
        const isLast = index === gameState.questions.length - 1;
        
        questionItem.innerHTML = `
            <div class="question-item-header">
                <span class="question-number">Frage ${index + 1}</span>
                <div class="question-actions">
                    <button class="question-action-btn move-up-btn" data-index="${index}" title="Nach oben verschieben" ${isFirst ? 'disabled' : ''}>
                        <i class="fas fa-arrow-up"></i>
                    </button>
                    <button class="question-action-btn move-down-btn" data-index="${index}" title="Nach unten verschieben" ${isLast ? 'disabled' : ''}>
                        <i class="fas fa-arrow-down"></i>
                    </button>
                    <button class="question-action-btn edit-btn" data-index="${index}">
                        <i class="fas fa-edit"></i> Bearbeiten
                    </button>
                    <button class="question-action-btn delete-btn" data-index="${index}">
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
        `;

        questionsList.appendChild(questionItem);

        // Event Listeners für diese Frage
        const moveUpBtn = questionItem.querySelector('.move-up-btn');
        const moveDownBtn = questionItem.querySelector('.move-down-btn');
        const editBtn = questionItem.querySelector('.edit-btn');
        const deleteBtn = questionItem.querySelector('.delete-btn');

        moveUpBtn.addEventListener('click', () => moveQuestion(index, 'up'));
        moveDownBtn.addEventListener('click', () => moveQuestion(index, 'down'));
        editBtn.addEventListener('click', () => editQuestion(index));
        deleteBtn.addEventListener('click', () => deleteQuestion(index));

        // Drag & Drop
        questionItem.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', index);
            questionItem.classList.add('dragging');
        });

        questionItem.addEventListener('dragend', (e) => {
            questionItem.classList.remove('dragging');
            // Remove drag-over from all items
            document.querySelectorAll('.question-item').forEach(item => {
                item.classList.remove('drag-over');
            });
        });

        questionItem.addEventListener('dragover', (e) => {
            e.preventDefault();
            const dragging = questionsList.querySelector('.dragging');
            if (!dragging) return;
            
            const afterElement = getDragAfterElement(questionsList, e.clientY);
            if (afterElement == null) {
                questionsList.appendChild(dragging);
            } else {
                questionsList.insertBefore(dragging, afterElement);
            }
        });

        questionItem.addEventListener('dragenter', (e) => {
            e.preventDefault();
            if (!questionItem.classList.contains('dragging')) {
                questionItem.classList.add('drag-over');
            }
        });

        questionItem.addEventListener('dragleave', () => {
            questionItem.classList.remove('drag-over');
        });

        questionItem.addEventListener('drop', (e) => {
            e.preventDefault();
            questionItem.classList.remove('drag-over');
            const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const dropIndex = index;
            
            if (draggedIndex !== dropIndex) {
                moveQuestionByDrag(draggedIndex, dropIndex);
            }
        });
    });
}

// Frage verschieben (Up/Down Buttons)
function moveQuestion(index, direction) {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === gameState.questions.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap questions
    const temp = gameState.questions[index];
    gameState.questions[index] = gameState.questions[newIndex];
    gameState.questions[newIndex] = temp;

    // Update questionIndex if quiz is active
    if (gameState.status === 'active') {
        if (gameState.questionIndex === index) {
            gameState.questionIndex = newIndex;
        } else if (gameState.questionIndex === newIndex) {
            gameState.questionIndex = index;
        }
    }

    updateGameState();
    renderQuestionsList();
}

// Frage per Drag & Drop verschieben
function moveQuestionByDrag(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;

    const question = gameState.questions.splice(fromIndex, 1)[0];
    gameState.questions.splice(toIndex, 0, question);

    // Update questionIndex if quiz is active
    if (gameState.status === 'active') {
        if (gameState.questionIndex === fromIndex) {
            gameState.questionIndex = toIndex;
        } else if (fromIndex < gameState.questionIndex && toIndex >= gameState.questionIndex) {
            gameState.questionIndex--;
        } else if (fromIndex > gameState.questionIndex && toIndex <= gameState.questionIndex) {
            gameState.questionIndex++;
        }
    }

    updateGameState();
    renderQuestionsList();
}

// Helper für Drag & Drop
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.question-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Frage bearbeiten
function editQuestion(index) {
    const question = gameState.questions[index];
    const editModal = document.getElementById('edit-question-modal');
    const editQuestionText = document.getElementById('edit-question-text');
    const editAnswer0 = document.getElementById('edit-answer-0');
    const editAnswer1 = document.getElementById('edit-answer-1');
    const editAnswer2 = document.getElementById('edit-answer-2');
    const editAnswer3 = document.getElementById('edit-answer-3');
    const editCorrectAnswer = document.getElementById('edit-correct-answer');
    const editQuestionCloseBtn = document.getElementById('edit-question-close-btn');
    const editQuestionCancel = document.getElementById('edit-question-cancel');
    const editQuestionSave = document.getElementById('edit-question-save');

    // Fill form
    editQuestionText.value = question.question;
    editAnswer0.value = question.answers[0];
    editAnswer1.value = question.answers[1];
    editAnswer2.value = question.answers[2];
    editAnswer3.value = question.answers[3];
    editCorrectAnswer.value = question.correct;

    // Show modal
    editModal.classList.add('active');

    // Close handlers
    const closeEditModal = () => {
        editModal.classList.remove('active');
    };

    editQuestionCloseBtn.onclick = closeEditModal;
    editQuestionCancel.onclick = closeEditModal;

    // Save handler
    editQuestionSave.onclick = () => {
        const questionText = editQuestionText.value.trim();
        const answers = [
            editAnswer0.value.trim(),
            editAnswer1.value.trim(),
            editAnswer2.value.trim(),
            editAnswer3.value.trim()
        ];
        const correctAnswer = parseInt(editCorrectAnswer.value);

        if (!questionText || answers.some(a => !a)) {
            showModal('Fehler', 'Bitte fülle alle Felder aus!', 'error');
            return;
        }

        gameState.questions[index] = {
            question: questionText,
            answers: answers,
            correct: correctAnswer
        };

        // Update currentQuestion if it's the one being edited
        if (gameState.status === 'active' && gameState.questionIndex === index) {
            gameState.currentQuestion = gameState.questions[index];
        }

        updateGameState();
        renderQuestionsList();
        closeEditModal();
        showModal('Erfolg', 'Frage erfolgreich bearbeitet!', 'success');
    };

    // Close on background click
    editModal.onclick = (e) => {
        if (e.target === editModal) {
            closeEditModal();
        }
    };
}

// Frage löschen
function deleteQuestion(index) {
    showConfirmModal('Frage löschen', 'Möchtest du diese Frage wirklich löschen?', () => {
        gameState.questions.splice(index, 1);

        // Update questionIndex if quiz is active
        if (gameState.status === 'active') {
            if (gameState.questionIndex >= gameState.questions.length) {
                gameState.questionIndex = Math.max(0, gameState.questions.length - 1);
            }
            if (gameState.questionIndex >= 0 && gameState.questionIndex < gameState.questions.length) {
                gameState.currentQuestion = gameState.questions[gameState.questionIndex];
            }
        }

        updateGameState();
        renderQuestionsList();
        showModal('Erfolg', 'Frage erfolgreich gelöscht!', 'success');
    });
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
    if (!gameState.questions || gameState.questions.length === 0) {
        console.error('No questions available');
        return;
    }

    if (gameState.questionIndex >= gameState.questions.length) {
        console.warn('Question index out of bounds:', gameState.questionIndex, 'of', gameState.questions.length);
        return;
    }

    if (gameState.questionIndex < 0) {
        console.warn('Question index is negative:', gameState.questionIndex);
        return;
    }

    // Always load question from array to ensure it's correct
    const questionToLoad = gameState.questions[gameState.questionIndex];
    
    if (!questionToLoad) {
        console.error('Question at index', gameState.questionIndex, 'does not exist');
        return;
    }

    gameState.currentQuestion = questionToLoad;
    gameState.answers.streamer1 = null;
    gameState.answers.streamer2 = null;

    console.log('Loading question:', {
        index: gameState.questionIndex,
        hasQuestion: !!gameState.currentQuestion,
        questionText: gameState.currentQuestion?.question?.substring(0, 50) + '...',
        hasAnswers: !!gameState.currentQuestion?.answers,
        answersCount: gameState.currentQuestion?.answers?.length
    });

    // Sync to Firebase (this will also update UI)
    updateGameState();
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

    // Update scores - only if answer is not null/undefined and matches correct answer
    if (answer1 !== null && answer1 !== undefined && answer1 === correctAnswer) {
        gameState.scores.streamer1++;
        console.log('Streamer1 scored! New score:', gameState.scores.streamer1);
    }
    if (answer2 !== null && answer2 !== undefined && answer2 === correctAnswer) {
        gameState.scores.streamer2++;
        console.log('Streamer2 scored! New score:', gameState.scores.streamer2);
    }

    console.log('Final scores after evaluation:', gameState.scores);

    gameState.status = 'result';
    updateGameState();
    updateUI();
}

// Answer Submission (for streamers)
function submitAnswer(answerIndex) {
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
        const questionElement = document.getElementById('question-display-text');
        const questionNumberElement = document.getElementById('question-number');
        
        if (questionNumberElement) {
            questionNumberElement.textContent = `Frage ${gameState.questionIndex + 1}`;
        }
        
        if (questionElement) {
            // Always try to ensure currentQuestion is set from questions array if missing
            if (!gameState.currentQuestion || !gameState.currentQuestion.question) {
                if (gameState.questions && gameState.questions.length > 0) {
                    if (gameState.questionIndex >= 0 && gameState.questionIndex < gameState.questions.length) {
                        gameState.currentQuestion = gameState.questions[gameState.questionIndex];
                        console.log('updateUI: Loaded question from array, index:', gameState.questionIndex);
                    }
                }
            }
            
            // Display question text
            if (gameState.currentQuestion && gameState.currentQuestion.question) {
                questionElement.textContent = gameState.currentQuestion.question;
                console.log('updateUI: Question text set:', gameState.currentQuestion.question.substring(0, 50));
            } else {
                // Last resort: try to load directly from array
                if (gameState.questions && gameState.questions.length > 0 && gameState.questionIndex >= 0 && gameState.questionIndex < gameState.questions.length) {
                    const questionToLoad = gameState.questions[gameState.questionIndex];
                    if (questionToLoad && questionToLoad.question) {
                        gameState.currentQuestion = questionToLoad;
                        questionElement.textContent = questionToLoad.question;
                        console.log('updateUI: Force loaded question from array:', questionToLoad.question.substring(0, 50));
                    } else {
                        questionElement.textContent = 'Frage wird geladen...';
                        console.warn('updateUI: Question not available', {
                            hasQuestions: !!gameState.questions,
                            questionsLength: gameState.questions?.length,
                            questionIndex: gameState.questionIndex,
                            questionAtIndex: questionToLoad
                        });
                    }
                } else {
                    questionElement.textContent = 'Frage wird geladen...';
                    console.warn('updateUI: No questions available or invalid index', {
                        hasQuestions: !!gameState.questions,
                        questionsLength: gameState.questions?.length,
                        questionIndex: gameState.questionIndex
                    });
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

            // Check if already answered - ONLY show selection for the current user's own answer
            const answerKey = currentRole === 'streamer1' ? 'streamer1' : 
                             currentRole === 'streamer2' ? 'streamer2' : null;
            
            // Only mark as selected if this is the current user's own answer
            // CRITICAL: Only check the answerKey for the current user, never the other streamer's answer
            // Also ensure the answer is not null/undefined
            const currentAnswer = answerKey ? gameState.answers[answerKey] : null;
            if (answerKey && currentAnswer !== null && currentAnswer !== undefined && currentAnswer === index) {
                answerBtn.classList.add('selected');
            } else {
                // Make sure we don't show other streamer's answers as selected
                // Also remove selected class if answer was reset (e.g., new question)
                answerBtn.classList.remove('selected');
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

    // Ensure questions and videoLinks are included in the update
    const stateToUpdate = {
        ...gameState,
        questions: gameState.questions, // Explicitly include questions
        currentQuestion: gameState.currentQuestion, // Include current question
        videoLinks: gameState.videoLinks, // Explicitly include video links
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
            if (data.videoLinks) {
                const linksChanged = 
                    data.videoLinks.streamer1 !== gameState.videoLinks.streamer1 ||
                    data.videoLinks.streamer2 !== gameState.videoLinks.streamer2;
                
                if (linksChanged) {
                    gameState.videoLinks = {
                        streamer1: data.videoLinks.streamer1 || '',
                        streamer2: data.videoLinks.streamer2 || ''
                    };
                    console.log('Host: Video links updated from Firebase, reloading videos...', gameState.videoLinks);
                    loadVideos();
                }
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
            
            // Preserve currentQuestion if it exists and is valid, otherwise use from data
            let currentQuestionToUse = null;
            if (data.currentQuestion && data.currentQuestion.question) {
                currentQuestionToUse = data.currentQuestion;
            } else if (gameState.currentQuestion && gameState.currentQuestion.question) {
                // Keep existing currentQuestion if data doesn't have one
                currentQuestionToUse = gameState.currentQuestion;
            }
            
            // CRITICAL: If question changed, reset answers BEFORE syncing
            // This prevents old answers from being carried over to the new question
            const questionChanged = oldQuestionIndex !== data.questionIndex;
            if (questionChanged) {
                console.log('Question changed, resetting answers:', {
                    oldIndex: oldQuestionIndex,
                    newIndex: data.questionIndex
                });
                // Reset both answers when question changes
                gameState.answers = {
                    streamer1: null,
                    streamer2: null
                };
            }
            
            // Preserve local answers - only update from Firebase if we haven't answered yet
            // This prevents overwriting a streamer's own answer with another streamer's answer
            const answerKey = currentRole === 'streamer1' ? 'streamer1' : 
                             currentRole === 'streamer2' ? 'streamer2' : null;
            
            // Build answers object - preserve own answer if already submitted
            // CRITICAL: Only update the OTHER streamer's answer from Firebase, never our own
            // Also: If question changed, always use null (already reset above)
            const newAnswers = questionChanged ? {
                streamer1: null,
                streamer2: null
            } : {
                streamer1: (answerKey === 'streamer1' && gameState.answers.streamer1 !== null && gameState.answers.streamer1 !== undefined)
                    ? gameState.answers.streamer1  // Keep own answer
                    : (data.answers?.streamer1 ?? gameState.answers.streamer1 ?? null),
                streamer2: (answerKey === 'streamer2' && gameState.answers.streamer2 !== null && gameState.answers.streamer2 !== undefined)
                    ? gameState.answers.streamer2  // Keep own answer
                    : (data.answers?.streamer2 ?? gameState.answers.streamer2 ?? null)
            };
            
            console.log('Syncing answers:', {
                currentRole: currentRole,
                answerKey: answerKey,
                questionChanged: questionChanged,
                oldQuestionIndex: oldQuestionIndex,
                newQuestionIndex: data.questionIndex,
                localAnswers: gameState.answers,
                firebaseAnswers: data.answers,
                newAnswers: newAnswers
            });
            
            gameState = {
                ...gameState,
                ...data,
                // Use questions from Firebase if available, otherwise keep local
                questions: questionsToUse,
                // Preserve currentQuestion if we have one, otherwise set to null
                currentQuestion: currentQuestionToUse,
                // Use preserved answers
                answers: newAnswers
            };

            // CRITICAL: Always ensure currentQuestion is set when status is active
            if (gameState.status === 'active') {
                // Priority 1: Use currentQuestion if already set
                if (gameState.currentQuestion && gameState.currentQuestion.question) {
                    console.log('Using existing currentQuestion');
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
                        hasDataCurrentQuestion: !!data.currentQuestion,
                        hasLocalCurrentQuestion: !!currentQuestionToUse
                    });
                }
            }

            // Answers are already reset above if question changed, so no need to reset here again

            // Load videos if changed or if we don't have videos yet
            if (data.videoLinks) {
                const linksChanged = 
                    data.videoLinks.streamer1 !== gameState.videoLinks.streamer1 ||
                    data.videoLinks.streamer2 !== gameState.videoLinks.streamer2;
                
                const hasLinks = 
                    (data.videoLinks.streamer1 && data.videoLinks.streamer1.trim()) ||
                    (data.videoLinks.streamer2 && data.videoLinks.streamer2.trim());
                
                if (linksChanged || (hasLinks && (!gameState.videoLinks.streamer1 && !gameState.videoLinks.streamer2))) {
                    gameState.videoLinks = {
                        streamer1: data.videoLinks.streamer1 || '',
                        streamer2: data.videoLinks.streamer2 || ''
                    };
                    console.log('Streamer: Video links updated, loading videos...', gameState.videoLinks);
                    loadVideos();
                }
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

// Initialize default questions - 30 Schwierige Anime Fragen (jeweils aus einem anderen Anime)
gameState.questions = [
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

