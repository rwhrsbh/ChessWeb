const express = require('express');
const { WebSocketServer } = require('ws');
const path = require('path');
const ChessEngine = require('./chess-engine');

const app = express();
const port = 3000;

// Раздача статических файлов
app.use(express.static(path.join(__dirname)));

// Маршрут для главной страницы
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Создаем HTTP сервер
const server = app.listen(port, () => {
    console.log(`http://localhost:${port}`);
});

// Создаем WebSocket сервер
const wss = new WebSocketServer({ server });

// Хранилище игр
const games = new Map();
function startGameTimer(gameId) {
    const gameData = games.get(gameId);
    if (!gameData.timerInterval) {
        gameData.timerInterval = setInterval(() => {
            const currentPlayer = gameData.engine.currentPlayer;
            if (gameData.timers[currentPlayer] > 0) {
                gameData.timers[currentPlayer]--;

                // Отправляем обновление таймера всем подключенным клиентам
                wss.clients.forEach(client => {
                    if (client.gameId === gameId) {
                        client.send(JSON.stringify({
                            type: 'timerUpdate',
                            timers: gameData.timers
                        }));
                    }
                });

                // Проверка на истечение времени
                if (gameData.timers[currentPlayer] <= 0) {
                    handleTimeOut(gameId, currentPlayer);
                }
            }
        }, 1000);
    }
}
function handleTimeOut(gameId, player) {
    const gameData = games.get(gameId);
    clearInterval(gameData.timerInterval);
    gameData.timerInterval = null;

    // Уведомляем клиентов о завершении игры по времени
    wss.clients.forEach(client => {
        if (client.gameId === gameId) {
            client.send(JSON.stringify({
                type: 'gameOver',
                reason: 'timeOut',
                loser: player
            }));
        }
    });
}

wss.on('connection', (ws) => {
    console.log('New client connected');

    // Создаем новую игру для клиента
    const gameId = Date.now().toString();
    const game = new ChessEngine();
    games.set(gameId, {
        engine: game,
        lastActivity: Date.now(),
        timers: {
            white: 600,
            black: 600
        }
    });
    ws.gameId = gameId;
    startGameTimer(gameId);

    // Отправляем начальное состояние
    sendGameState(ws);

    ws.on('message', (message) => {
        try {
            const gameData = games.get(ws.gameId);
            if (!gameData) return;

            const game = gameData.engine;
            const data = JSON.parse(message);
            handleMessage(ws, game, data);

            // Обновляем время последней активности
            gameData.lastActivity = Date.now();
        } catch (error) {
            console.error('Error handling message:', error);
            sendError(ws, 'Invalid message format');
        }
    });

    ws.on('close', () => {

        const gameData = games.get(ws.gameId);
        if (gameData && gameData.timerInterval) {
            clearInterval(gameData.timerInterval);
        }
        console.log('Client disconnected');
        games.delete(ws.gameId);
    });
});

// Очистка неактивных игр каждый час
setInterval(() => {
    const now = Date.now();
    for (const [gameId, gameData] of games.entries()) {
        if (now - gameData.lastActivity > 3600000) { // 1 час
            games.delete(gameId);
        }
    }
}, 3600000);

function handleMessage(ws, game, data) {
    const gameData = games.get(ws.gameId);

    switch (data.type) {
        case 'selectPiece':
            const moves = game.getPieceMoves(data.row, data.col);
            sendValidMoves(ws, moves);
            break;

        case 'makeMove':
            if (game.makeMove(data.fromRow, data.fromCol, data.toRow, data.toCol)) {
                // Обновляем таймер для текущего игрока
                updateTimer(gameData);

                // Проверяем на превращение пешки
                if (game.isPawnPromotion(data.toRow, data.toCol)) {
                    sendPromotionRequired(ws, { row: data.toRow, col: data.toCol });
                    return;
                }

                sendGameState(ws);
            } else {
                sendError(ws, 'Invalid move');
            }
            break;

        case 'promote':
            if (game.promotePawn(data.row, data.col, data.piece)) {
                sendGameState(ws);
            } else {
                sendError(ws, 'Invalid promotion');
            }
            break;

        case 'newGame':
            const newGame = new ChessEngine();
            gameData.engine = newGame;
            gameData.timers = { white: 600, black: 600 };
            sendGameState(ws);
            break;

        case 'undoMove':
            if (game.undoLastMove()) {
                sendGameState(ws);
            } else {
                sendError(ws, 'Cannot undo move');
            }
            break;

        case 'resign':
            game.currentPlayer = game.currentPlayer === 'white' ? 'black' : 'white';
            sendGameState(ws, { resigned: true });
            break;

        case 'timeOut':
            game.currentPlayer = data.player === 'white' ? 'black' : 'white';
            sendGameState(ws, { timeOut: true });
            break;
    }
}

function updateTimer(gameData) {
    const { timers } = gameData;
    const currentPlayer = gameData.engine.currentPlayer;
    if (timers[currentPlayer] > 0) {
        timers[currentPlayer]--;
    }
}

function sendGameState(ws, additional = {}) {
    const gameData = games.get(ws.gameId);
    const game = gameData.engine;
    const state = game.getGameState();

    // Преобразуем историю ходов в читаемый формат
    const moveHistory = game.moveHistory.map(move => {
        const fromCoord = `${String.fromCharCode(97 + move.from.col)}${8 - move.from.row}`;
        const toCoord = `${String.fromCharCode(97 + move.to.col)}${8 - move.to.row}`;
        return `${fromCoord}-${toCoord}`;
    });

    ws.send(JSON.stringify({
        type: 'gameState',
        ...state,
        moveHistory: moveHistory, // Добавляем историю ходов
        timers: gameData.timers,
        ...additional
    }));
}

function sendValidMoves(ws, moves) {
    ws.send(JSON.stringify({
        type: 'validMoves',
        moves: moves
    }));
}

function sendPromotionRequired(ws, position) {
    ws.send(JSON.stringify({
        type: 'promotionRequired',
        position: position
    }));
}

function sendError(ws, message) {
    ws.send(JSON.stringify({
        type: 'error',
        message: message
    }));
}
