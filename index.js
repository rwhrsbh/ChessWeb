const express = require('express');
const { WebSocketServer } = require('ws');
const path = require('path');
const ChessEngine = require('./chess-engine');

const app = express();
const port = process.env.PORT || 3000;

// Раздача статических файлов
app.use(express.static(path.join(__dirname, 'public')));

// Маршрут для главной страницы
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Создаем HTTP сервер
const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// Создаем WebSocket сервер
const wss = new WebSocketServer({ server });

// Хранилище игр
const games = new Map();

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

    ws.send(JSON.stringify({
        type: 'gameState',
        ...state,
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