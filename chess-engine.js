// Константы для фигур
const PIECES = {
    EMPTY: 0,
    W_PAWN: 1,
    W_KNIGHT: 2,
    W_BISHOP: 3,
    W_ROOK: 4,
    W_QUEEN: 5,
    W_KING: 6,
    B_PAWN: -1,
    B_KNIGHT: -2,
    B_BISHOP: -3,
    B_ROOK: -4,
    B_QUEEN: -5,
    B_KING: -6
};

class ChessEngine {
    constructor() {
        this.board = this.createInitialBoard();
        this.currentPlayer = 'white';
        this.moveHistory = [];
        this.capturedPieces = [];
        this.kingPositions = {
            white: { row: 7, col: 4 },
            black: { row: 0, col: 4 }
        };
    }

    // Создание начальной позиции
    createInitialBoard() {
        const board = Array(8).fill().map(() => Array(8).fill(PIECES.EMPTY));

        // Расставляем пешки
        for (let i = 0; i < 8; i++) {
            board[1][i] = PIECES.B_PAWN;
            board[6][i] = PIECES.W_PAWN;
        }

        // Расставляем чёрные фигуры
        board[0] = [
            PIECES.B_ROOK, PIECES.B_KNIGHT, PIECES.B_BISHOP, PIECES.B_QUEEN,
            PIECES.B_KING, PIECES.B_BISHOP, PIECES.B_KNIGHT, PIECES.B_ROOK
        ];

        // Расставляем белые фигуры
        board[7] = [
            PIECES.W_ROOK, PIECES.W_KNIGHT, PIECES.W_BISHOP, PIECES.W_QUEEN,
            PIECES.W_KING, PIECES.W_BISHOP, PIECES.W_KNIGHT, PIECES.W_ROOK
        ];

        return board;
    }

    // Проверка валидности координат
    isValidPosition(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    // Получение фигуры на позиции
    getPiece(row, col) {
        if (!this.isValidPosition(row, col)) return null;
        return this.board[row][col];
    }

    // Проверка цвета фигуры
    isPieceWhite(piece) {
        return piece > 0;
    }

    // Получение всех возможных ходов для фигуры
    getPieceMoves(row, col) {
        const piece = this.getPiece(row, col);
        if (!piece) return [];

        const moves = [];

        switch (Math.abs(piece)) {
            case Math.abs(PIECES.W_PAWN):
                this.getPawnMoves(row, col, moves);
                break;
            case Math.abs(PIECES.W_KNIGHT):
                this.getKnightMoves(row, col, moves);
                break;
            case Math.abs(PIECES.W_BISHOP):
                this.getBishopMoves(row, col, moves);
                break;
            case Math.abs(PIECES.W_ROOK):
                this.getRookMoves(row, col, moves);
                break;
            case Math.abs(PIECES.W_QUEEN):
                this.getQueenMoves(row, col, moves);
                break;
            case Math.abs(PIECES.W_KING):
                this.getKingMoves(row, col, moves);
                break;
        }

        return moves.filter(move => this.isLegalMove(row, col, move.row, move.col));
    }

    // Получение ходов пешки
    getPawnMoves(row, col, moves) {
        const piece = this.getPiece(row, col);
        const direction = this.isPieceWhite(piece) ? -1 : 1;
        const startRow = this.isPieceWhite(piece) ? 6 : 1;

        // Ход вперёд на одну клетку
        if (this.isValidPosition(row + direction, col) &&
            this.getPiece(row + direction, col) === PIECES.EMPTY) {
            moves.push({ row: row + direction, col: col });

            // Ход вперёд на две клетки с начальной позиции
            if (row === startRow &&
                this.getPiece(row + 2 * direction, col) === PIECES.EMPTY) {
                moves.push({ row: row + 2 * direction, col: col });
            }
        }

        // Взятия по диагонали
        const captures = [
            { row: row + direction, col: col - 1 },
            { row: row + direction, col: col + 1 }
        ];

        for (const capture of captures) {
            if (this.isValidPosition(capture.row, capture.col)) {
                const targetPiece = this.getPiece(capture.row, capture.col);
                if (targetPiece !== PIECES.EMPTY &&
                    this.isPieceWhite(targetPiece) !== this.isPieceWhite(piece)) {
                    moves.push(capture);
                }
            }
        }
    }

    // Получение ходов коня
    getKnightMoves(row, col, moves) {
        const knightMoves = [
            { row: -2, col: -1 }, { row: -2, col: 1 },
            { row: -1, col: -2 }, { row: -1, col: 2 },
            { row: 1, col: -2 }, { row: 1, col: 2 },
            { row: 2, col: -1 }, { row: 2, col: 1 }
        ];

        for (const move of knightMoves) {
            const newRow = row + move.row;
            const newCol = col + move.col;

            if (this.isValidPosition(newRow, newCol)) {
                const targetPiece = this.getPiece(newRow, newCol);
                if (targetPiece === PIECES.EMPTY ||
                    this.isPieceWhite(targetPiece) !== this.isPieceWhite(this.getPiece(row, col))) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        }
    }

    // Получение ходов слона
    getBishopMoves(row, col, moves) {
        const directions = [
            { row: -1, col: -1 }, { row: -1, col: 1 },
            { row: 1, col: -1 }, { row: 1, col: 1 }
        ];

        this.getSlidingMoves(row, col, directions, moves);
    }

    // Получение ходов ладьи
    getRookMoves(row, col, moves) {
        const directions = [
            { row: -1, col: 0 }, { row: 1, col: 0 },
            { row: 0, col: -1 }, { row: 0, col: 1 }
        ];

        this.getSlidingMoves(row, col, directions, moves);
    }

    // Получение ходов ферзя
    getQueenMoves(row, col, moves) {
        this.getBishopMoves(row, col, moves);
        this.getRookMoves(row, col, moves);
    }

    // Получение ходов короля
    getKingMoves(row, col, moves) {
        const directions = [
            { row: -1, col: -1 }, { row: -1, col: 0 }, { row: -1, col: 1 },
            { row: 0, col: -1 }, { row: 0, col: 1 },
            { row: 1, col: -1 }, { row: 1, col: 0 }, { row: 1, col: 1 }
        ];

        for (const dir of directions) {
            const newRow = row + dir.row;
            const newCol = col + dir.col;

            if (this.isValidPosition(newRow, newCol)) {
                const targetPiece = this.getPiece(newRow, newCol);
                if (targetPiece === PIECES.EMPTY ||
                    this.isPieceWhite(targetPiece) !== this.isPieceWhite(this.getPiece(row, col))) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        }

        // TODO: Добавить рокировку
    }

    // Получение ходов для скользящих фигур (слон, ладья, ферзь)
    getSlidingMoves(row, col, directions, moves) {
        const piece = this.getPiece(row, col);

        for (const dir of directions) {
            let newRow = row + dir.row;
            let newCol = col + dir.col;

            while (this.isValidPosition(newRow, newCol)) {
                const targetPiece = this.getPiece(newRow, newCol);

                if (targetPiece === PIECES.EMPTY) {
                    moves.push({ row: newRow, col: newCol });
                } else {
                    if (this.isPieceWhite(targetPiece) !== this.isPieceWhite(piece)) {
                        moves.push({ row: newRow, col: newCol });
                    }
                    break;
                }

                newRow += dir.row;
                newCol += dir.col;
            }
        }
    }

    // Проверка легальности хода
    isLegalMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.getPiece(fromRow, fromCol);

        // Проверяем, что ход делает текущий игрок
        if ((this.currentPlayer === 'white' && !this.isPieceWhite(piece)) ||
            (this.currentPlayer === 'black' && this.isPieceWhite(piece))) {
            return false;
        }

        // Создаём временную копию доски для проверки шаха
        const tempBoard = this.board.map(row => [...row]);
        const tempKingPositions = { ...this.kingPositions };

        // Делаем ход на временной доске
        tempBoard[toRow][toCol] = tempBoard[fromRow][fromCol];
        tempBoard[fromRow][fromCol] = PIECES.EMPTY;

        // Обновляем позицию короля, если ходим им
        if (Math.abs(piece) === Math.abs(PIECES.W_KING)) {
            tempKingPositions[this.currentPlayer] = { row: toRow, col: toCol };
        }

        // Проверяем, не находится ли король под шахом после хода
        return !this.isKingInCheck(tempBoard, tempKingPositions, this.currentPlayer);
    }

    // Проверка шаха
    isKingInCheck(board, kingPositions, player) {
        const kingPos = kingPositions[player];
        const isWhite = player === 'white';

        // Проверяем все фигуры противника
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece !== PIECES.EMPTY && this.isPieceWhite(piece) !== isWhite) {
                    // Получаем все возможные ходы фигуры
                    const moves = this.getPieceMoves(row, col);
                    // Проверяем, может ли фигура достичь позиции короля
                    if (moves.some(move => move.row === kingPos.row && move.col === kingPos.col)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // Выполнение хода
    makeMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.getPiece(fromRow, fromCol);
        const targetPiece = this.getPiece(toRow, toCol);

        if (!this.isLegalMove(fromRow, fromCol, toRow, toCol)) {
            return false;
        }

        // Сохраняем ход в истории
        this.moveHistory.push({
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            piece: piece,
            captured: targetPiece
        });

        // Если было взятие, добавляем фигуру в список взятых
        if (targetPiece !== PIECES.EMPTY) {
            this.capturedPieces.push(targetPiece);
        }

        // Обновляем позицию короля, если ходим им
        if (Math.abs(piece) === Math.abs(PIECES.W_KING)) {
            this.kingPositions[this.currentPlayer] = { row: toRow, col: toCol };
        }

        // Выполняем ход
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = PIECES.EMPTY;

        // Проверяем на превращение пешки
        if (this.isPawnPromotion(toRow, toCol)) {
            // По умолчанию превращаем в ферзя
            this.board[toRow][toCol] = this.currentPlayer === 'white' ? PIECES.W_QUEEN : PIECES.B_QUEEN;
        }

        // Меняем текущего игрока
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';

        return true;
    }

    // Проверка на превращение пешки
    isPawnPromotion(row, col) {
        const piece = this.getPiece(row, col);
        return (Math.abs(piece) === Math.abs(PIECES.W_PAWN)) &&
            (row === 0 || row === 7);
    }


    // Проверка на мат
    isCheckmate() {
        // Если король не под шахом, это не мат
        if (!this.isKingInCheck(this.board, this.kingPositions, this.currentPlayer)) {
            return false;
        }

        // Проверяем все возможные ходы текущего игрока
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.getPiece(row, col);
                if (piece !== PIECES.EMPTY &&
                    this.isPieceWhite(piece) === (this.currentPlayer === 'white')) {
                    const moves = this.getPieceMoves(row, col);
                    // Если есть хоть один возможный ход, это не мат
                    if (moves.length > 0) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    // Проверка на пат
    isStalemate() {
        // Если король под шахом, это не пат
        if (this.isKingInCheck(this.board, this.kingPositions, this.currentPlayer)) {
            return false;
        }

        // Проверяем все возможные ходы текущего игрока
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.getPiece(row, col);
                if (piece !== PIECES.EMPTY &&
                    this.isPieceWhite(piece) === (this.currentPlayer === 'white')) {
                    const moves = this.getPieceMoves(row, col);
                    // Если есть хоть один возможный ход, это не пат
                    if (moves.length > 0) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    // Отмена последнего хода
    undoLastMove() {
        if (this.moveHistory.length === 0) {
            return false;
        }

        const lastMove = this.moveHistory.pop();
        const { from, to, piece, captured } = lastMove;

        // Возвращаем фигуру на исходную позицию
        this.board[from.row][from.col] = piece;
        this.board[to.row][to.col] = captured;

        // Если это был ход королём, обновляем его позицию
        if (Math.abs(piece) === Math.abs(PIECES.W_KING)) {
            const color = this.isPieceWhite(piece) ? 'white' : 'black';
            this.kingPositions[color] = { row: from.row, col: from.col };
        }

        // Если было взятие, удаляем фигуру из списка взятых
        if (captured !== PIECES.EMPTY) {
            this.capturedPieces.pop();
        }

        // Меняем текущего игрока обратно
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';

        return true;
    }

    // Получение состояния игры
    getGameState() {
        return {
            board: this.board.map(row => [...row]),
            currentPlayer: this.currentPlayer,
            capturedPieces: [...this.capturedPieces],
            isCheck: this.isKingInCheck(this.board, this.kingPositions, this.currentPlayer),
            isCheckmate: this.isCheckmate(),
            isStalemate: this.isStalemate(),
            moveHistory: this.moveHistory.map(move => {
                const fromCord = `${String.fromCharCode(97 + move.from.col)}${8 - move.from.row}`;
                const toCord = `${String.fromCharCode(97 + move.to.col)}${8 - move.to.row}`;
                return `${fromCord}-${toCord}`;
            })
        };
    }


    // Превращение пешки
    promotePawn(row, col, newPieceType) {
        const piece = this.getPiece(row, col);
        if (Math.abs(piece) !== Math.abs(PIECES.W_PAWN) ||
            (row !== 0 && row !== 7)) {
            return false;
        }

        const isWhite = this.isPieceWhite(piece);
        let newPiece;

        switch (newPieceType) {
            case 'queen':
                newPiece = isWhite ? PIECES.W_QUEEN : PIECES.B_QUEEN;
                break;
            case 'rook':
                newPiece = isWhite ? PIECES.W_ROOK : PIECES.B_ROOK;
                break;
            case 'bishop':
                newPiece = isWhite ? PIECES.W_BISHOP : PIECES.B_BISHOP;
                break;
            case 'knight':
                newPiece = isWhite ? PIECES.W_KNIGHT : PIECES.B_KNIGHT;
                break;
            default:
                return false;
        }

        this.board[row][col] = newPiece;
        return true;
    }

    // Проверка на недостаточность материала для мата
    isInsufficientMaterial() {
        const pieces = {
            white: { count: 0, bishops: [], knights: 0 },
            black: { count: 0, bishops: [], knights: 0 }
        };

        // Подсчитываем все фигуры на доске
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.getPiece(row, col);
                if (piece === PIECES.EMPTY) continue;

                const color = this.isPieceWhite(piece) ? 'white' : 'black';
                pieces[color].count++;

                switch (Math.abs(piece)) {
                    case Math.abs(PIECES.W_BISHOP):
                        pieces[color].bishops.push((row + col) % 2);
                        break;
                    case Math.abs(PIECES.W_KNIGHT):
                        pieces[color].knights++;
                        break;
                }
            }
        }

        // Король против короля
        if (pieces.white.count === 1 && pieces.black.count === 1) {
            return true;
        }

        // Король и слон против короля
        if ((pieces.white.count === 2 && pieces.white.bishops.length === 1 && pieces.black.count === 1) ||
            (pieces.black.count === 2 && pieces.black.bishops.length === 1 && pieces.white.count === 1)) {
            return true;
        }

        // Король и конь против короля
        if ((pieces.white.count === 2 && pieces.white.knights === 1 && pieces.black.count === 1) ||
            (pieces.black.count === 2 && pieces.black.knights === 1 && pieces.white.count === 1)) {
            return true;
        }

        // Короли и слоны одного цвета
        if (pieces.white.count === 2 && pieces.black.count === 2 &&
            pieces.white.bishops.length === 1 && pieces.black.bishops.length === 1 &&
            pieces.white.bishops[0] === pieces.black.bishops[0]) {
            return true;
        }

        return false;
    }
}

module.exports = ChessEngine;
