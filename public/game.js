// Estado do jogo
let gameState = {
    players: [],
    currentChooserIndex: 0,
    currentPlayerIndex: 0,
    secretTeam: '',
    maxGuesses: 3,
    maxQuestions: 30,
    round: 1,
    questionsLog: [],
    playerStats: {}
};

// Elementos DOM
const screens = {
    menu: document.getElementById('menu-screen'),
    players: document.getElementById('players-screen'),
    chooseTeam: document.getElementById('choose-team-screen'),
    game: document.getElementById('game-screen'),
    end: document.getElementById('end-screen')
};

const modals = {
    question: document.getElementById('question-modal'),
    answer: document.getElementById('answer-modal'),
    guess: document.getElementById('guess-modal'),
    result: document.getElementById('result-modal')
};

// Funções de navegação
function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

function showModal(modalName) {
    modals[modalName].classList.add('active');
}

function hideModal(modalName) {
    modals[modalName].classList.remove('active');
}

function hideAllModals() {
    Object.values(modals).forEach(m => m.classList.remove('active'));
}

// Inicialização do menu
document.getElementById('start-setup').addEventListener('click', () => {
    const playerCount = parseInt(document.getElementById('player-count').value);
    gameState.maxGuesses = parseInt(document.getElementById('max-guesses').value);
    gameState.maxQuestions = parseInt(document.getElementById('max-questions').value);
    
    if (playerCount < 2 || playerCount > 4) {
        alert('Número de jogadores deve ser entre 2 e 4!');
        return;
    }
    
    // Criar inputs para nomes dos jogadores
    const container = document.getElementById('player-inputs');
    container.innerHTML = '';
    
    const emojis = ['🔴', '🔵', '🟢', '🟡'];
    
    for (let i = 0; i < playerCount; i++) {
        const div = document.createElement('div');
        div.className = 'player-input';
        div.innerHTML = `
            <span>${emojis[i]}</span>
            <input type="text" id="player-name-${i}" placeholder="Jogador ${i + 1}">
        `;
        container.appendChild(div);
    }
    
    showScreen('players');
});

// Iniciar jogo
document.getElementById('start-game').addEventListener('click', () => {
    const inputs = document.querySelectorAll('#player-inputs input');
    gameState.players = [];
    
    inputs.forEach((input, index) => {
        const name = input.value.trim() || `Jogador ${index + 1}`;
        gameState.players.push(name);
        gameState.playerStats[name] = {
            score: 0,
            questionsLeft: gameState.maxQuestions,
            guessesLeft: gameState.maxGuesses,
            eliminated: false
        };
    });
    
    gameState.currentChooserIndex = 0;
    gameState.round = 1;
    
    startNewRound();
});

// Iniciar nova rodada
function startNewRound() {
    gameState.secretTeam = '';
    gameState.questionsLog = [];
    
    // Resetar stats de perguntas e chutes para todos (exceto pontos)
    gameState.players.forEach(name => {
        gameState.playerStats[name].questionsLeft = gameState.maxQuestions;
        gameState.playerStats[name].guessesLeft = gameState.maxGuesses;
        gameState.playerStats[name].eliminated = false;
    });
    
    // Definir quem escolhe o time
    const chooser = gameState.players[gameState.currentChooserIndex];
    document.getElementById('chooser-name').textContent = `${chooser}, é sua vez de escolher!`;
    
    showScreen('chooseTeam');
}

// Toggle visibilidade do time
document.getElementById('toggle-visibility').addEventListener('click', () => {
    const input = document.getElementById('team-input');
    if (input.type === 'password') {
        input.type = 'text';
    } else {
        input.type = 'password';
    }
});

// Confirmar time
document.getElementById('confirm-team').addEventListener('click', () => {
    const team = document.getElementById('team-input').value.trim();
    
    if (!team) {
        alert('Digite o nome do time!');
        return;
    }
    
    gameState.secretTeam = team;
    document.getElementById('team-input').value = '';
    document.getElementById('team-input').type = 'password';
    
    // Definir primeiro jogador (que não seja o escolhedor)
    gameState.currentPlayerIndex = (gameState.currentChooserIndex + 1) % gameState.players.length;
    
    updateGameScreen();
    showScreen('game');
});

// Atualizar tela do jogo
function updateGameScreen() {
    document.getElementById('round-number').textContent = gameState.round;
    document.getElementById('current-chooser').textContent = gameState.players[gameState.currentChooserIndex];
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const stats = gameState.playerStats[currentPlayer];
    
    document.getElementById('current-player').textContent = currentPlayer;
    document.getElementById('questions-left').textContent = stats.questionsLeft;
    document.getElementById('guesses-left').textContent = stats.guessesLeft;
    
    // Atualizar placar
    const scoresContainer = document.getElementById('scores');
    scoresContainer.innerHTML = gameState.players.map(name => {
        const s = gameState.playerStats[name];
        const isChooser = name === gameState.players[gameState.currentChooserIndex];
        const eliminated = s.eliminated && !isChooser;
        return `
            <div class="score-card" style="${eliminated ? 'opacity: 0.5' : ''}">
                <div class="name">${name} ${isChooser ? '👑' : ''}</div>
                <div class="points">${s.score}</div>
            </div>
        `;
    }).join('');
    
    // Atualizar log
    updateLog();
    
    // Atualizar botões
    const isChooser = gameState.currentPlayerIndex === gameState.currentChooserIndex;
    document.getElementById('ask-question-btn').disabled = isChooser || stats.questionsLeft <= 0;
    document.getElementById('make-guess-btn').disabled = isChooser || stats.guessesLeft <= 0;
    document.getElementById('pass-turn-btn').disabled = isChooser;
}

function updateLog() {
    const container = document.getElementById('log-container');
    
    if (gameState.questionsLog.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center;">Nenhuma pergunta ainda...</p>';
        return;
    }
    
    container.innerHTML = gameState.questionsLog.map(entry => {
        if (entry.type === 'question') {
            const answerClass = entry.answer === 'Sim' ? '' : entry.answer === 'Não' ? 'no' : 'maybe';
            return `
                <div class="log-entry">
                    <div class="player-name">${entry.player}</div>
                    <div class="question">${entry.question}</div>
                    <div class="answer ${answerClass}">R: ${entry.answer}</div>
                </div>
            `;
        } else {
            const resultClass = entry.correct ? 'correct' : 'wrong';
            return `
                <div class="log-entry guess ${resultClass}">
                    <div class="player-name">${entry.player}</div>
                    <div class="question">🎯 Chutou: ${entry.guess}</div>
                    <div class="answer ${entry.correct ? '' : 'no'}">${entry.correct ? '✓ ACERTOU!' : '✗ Errou'}</div>
                </div>
            `;
        }
    }).join('');
    
    container.scrollTop = container.scrollHeight;
}

// Fazer pergunta
document.getElementById('ask-question-btn').addEventListener('click', () => {
    showModal('question');
    document.getElementById('question-input').value = '';
    document.getElementById('question-input').focus();
});

document.getElementById('cancel-question').addEventListener('click', () => {
    hideModal('question');
});

document.getElementById('submit-question').addEventListener('click', () => {
    const question = document.getElementById('question-input').value.trim();
    
    if (!question) {
        alert('Digite uma pergunta!');
        return;
    }
    
    hideModal('question');
    
    // Mostrar modal de resposta para o escolhedor
    document.getElementById('question-display').textContent = question;
    document.getElementById('team-reminder').textContent = gameState.secretTeam;
    showModal('answer');
    
    // Guardar pergunta temporariamente
    gameState.pendingQuestion = question;
});

// Responder pergunta
document.querySelectorAll('.answer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const answer = btn.dataset.answer;
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        
        gameState.questionsLog.push({
            type: 'question',
            player: currentPlayer,
            question: gameState.pendingQuestion,
            answer: answer
        });
        
        gameState.playerStats[currentPlayer].questionsLeft--;
        
        hideModal('answer');
        nextTurn();
    });
});

// Chutar time
document.getElementById('make-guess-btn').addEventListener('click', () => {
    showModal('guess');
    document.getElementById('guess-input').value = '';
    document.getElementById('guess-input').focus();
});

document.getElementById('cancel-guess').addEventListener('click', () => {
    hideModal('guess');
});

document.getElementById('submit-guess').addEventListener('click', () => {
    const guess = document.getElementById('guess-input').value.trim();
    
    if (!guess) {
        alert('Digite o nome do time!');
        return;
    }
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const correct = guess.toLowerCase() === gameState.secretTeam.toLowerCase();
    
    gameState.questionsLog.push({
        type: 'guess',
        player: currentPlayer,
        guess: guess,
        correct: correct
    });
    
    gameState.playerStats[currentPlayer].guessesLeft--;
    
    if (gameState.playerStats[currentPlayer].guessesLeft <= 0) {
        gameState.playerStats[currentPlayer].eliminated = true;
    }
    
    hideModal('guess');
    
    if (correct) {
        // Jogador acertou!
        gameState.playerStats[currentPlayer].score += 3;
        showResult(true, currentPlayer, gameState.secretTeam);
    } else {
        // Errou, continua o jogo
        updateLog();
        
        // Verificar se todos foram eliminados
        if (checkAllEliminated()) {
            showResult(false, null, gameState.secretTeam);
        } else {
            nextTurn();
        }
    }
});

// Passar vez
document.getElementById('pass-turn-btn').addEventListener('click', () => {
    nextTurn();
});

// Próximo turno
function nextTurn() {
    // Encontrar próximo jogador válido
    let attempts = 0;
    do {
        gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
        attempts++;
        
        // Pular o escolhedor
        if (gameState.currentPlayerIndex === gameState.currentChooserIndex) {
            gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
        }
        
        const player = gameState.players[gameState.currentPlayerIndex];
        const stats = gameState.playerStats[player];
        
        // Se este jogador ainda pode jogar, parar
        if (!stats.eliminated && stats.guessesLeft > 0) {
            break;
        }
        
    } while (attempts < gameState.players.length);
    
    // Verificar se todos estão eliminados
    if (checkAllEliminated()) {
        showResult(false, null, gameState.secretTeam);
    } else {
        updateGameScreen();
    }
}

function checkAllEliminated() {
    return gameState.players.every((name, index) => {
        if (index === gameState.currentChooserIndex) return true; // Ignorar escolhedor
        const stats = gameState.playerStats[name];
        return stats.eliminated || stats.guessesLeft <= 0;
    });
}

// Mostrar resultado
function showResult(correct, winner, team) {
    if (correct) {
        document.getElementById('result-icon').textContent = '🎉';
        document.getElementById('result-title').textContent = `${winner} acertou!`;
        document.getElementById('result-message').textContent = `O time era: ${team}`;
    } else {
        document.getElementById('result-icon').textContent = '😔';
        document.getElementById('result-title').textContent = 'Ninguém acertou!';
        document.getElementById('result-message').textContent = `O time era: ${team}`;
        
        // Dar ponto para quem escolheu
        const chooser = gameState.players[gameState.currentChooserIndex];
        gameState.playerStats[chooser].score += 1;
    }
    
    showModal('result');
}

// Próxima rodada
document.getElementById('next-round').addEventListener('click', () => {
    hideModal('result');
    
    // Próximo escolhedor
    gameState.currentChooserIndex = (gameState.currentChooserIndex + 1) % gameState.players.length;
    gameState.round++;
    
    // Verificar se completou uma volta (fim de jogo)
    if (gameState.round > gameState.players.length) {
        showEndScreen();
    } else {
        startNewRound();
    }
});

// Tela final
function showEndScreen() {
    const sorted = [...gameState.players].sort((a, b) => 
        gameState.playerStats[b].score - gameState.playerStats[a].score
    );
    
    const medals = ['🥇', '🥈', '🥉', '4️⃣'];
    
    document.getElementById('final-scores').innerHTML = sorted.map((name, index) => {
        const isWinner = index === 0;
        return `
            <div class="final-score-card ${isWinner ? 'winner' : ''}">
                <span class="rank">${medals[index]}</span>
                <span class="name">${name}</span>
                <span class="points">${gameState.playerStats[name].score} pts</span>
            </div>
        `;
    }).join('');
    
    const winner = sorted[0];
    const tie = sorted.filter(n => gameState.playerStats[n].score === gameState.playerStats[winner].score);
    
    if (tie.length > 1) {
        document.getElementById('winner-display').innerHTML = `Empate entre: <span>${tie.join(', ')}</span>! 🏆`;
    } else {
        document.getElementById('winner-display').innerHTML = `<span>${winner}</span> venceu! 🏆`;
    }
    
    showScreen('end');
}

// Jogar novamente
document.getElementById('play-again').addEventListener('click', () => {
    // Resetar estado
    gameState = {
        players: [],
        currentChooserIndex: 0,
        currentPlayerIndex: 0,
        secretTeam: '',
        maxGuesses: 3,
        maxQuestions: 30,
        round: 1,
        questionsLog: [],
        playerStats: {}
    };
    
    showScreen('menu');
});

// Inicialização
showScreen('menu');
