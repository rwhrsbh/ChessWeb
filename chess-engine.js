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
        this.castlingRights = {
            white: { kingSide: true, queenSide: true },
            black: { kingSide: true, queenSide: true }
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
    getPieceMoves(row, col, skipValidation = false) {
        const piece = this.getPiece(row, col);
        if (!piece) return [];

        const moves = [];

        // Get raw moves without validation
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

        // Skip validation if requested
        if (skipValidation) {
            return moves;
        }

        // Filter moves that would leave or put the king in check
        return moves.filter(move => {
            const tempBoard = this.board.map(row => [...row]);
            const tempKingPositions = {
                white: {...this.kingPositions.white},
                black: {...this.kingPositions.black}
            };

            // Make the move on temporary board
            tempBoard[move.row][move.col] = tempBoard[row][col];
            tempBoard[row][col] = PIECES.EMPTY;

            // Update king position if moving king
            if (Math.abs(piece) === Math.abs(PIECES.W_KING)) {
                const player = this.isPieceWhite(piece) ? 'white' : 'black';
                tempKingPositions[player] = { row: move.row, col: move.col };
            }

            // Use simplified check validation that doesn't recurse
            return !this.isKingInCheckSimple(tempBoard, tempKingPositions, this.currentPlayer);
        });
    }
    isKingInCheckSimple(board, kingPositions, player) {
        const kingPos = kingPositions[player];
        const isWhite = player === 'white';

        // Check pawn attacks
        const pawnDirs = isWhite ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
        for (const [dr, dc] of pawnDirs) {
            const r = kingPos.row + dr;
            const c = kingPos.col + dc;
            if (this.isValidPosition(r, c)) {
                const piece = board[r][c];
                if (piece !== PIECES.EMPTY &&
                    this.isPieceWhite(piece) !== isWhite &&
                    Math.abs(piece) === Math.abs(PIECES.W_PAWN)) {
                    return true;
                }
            }
        }

        // Check knight attacks
        const knightDirs = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
        for (const [dr, dc] of knightDirs) {
            const r = kingPos.row + dr;
            const c = kingPos.col + dc;
            if (this.isValidPosition(r, c)) {
                const piece = board[r][c];
                if (piece !== PIECES.EMPTY &&
                    this.isPieceWhite(piece) !== isWhite &&
                    Math.abs(piece) === Math.abs(PIECES.W_KNIGHT)) {
                    return true;
                }
            }
        }

        // Check sliding pieces (queen, rook, bishop)
        const dirs = [
            [-1,-1],[-1,0],[-1,1],
            [0,-1],[0,1],
            [1,-1],[1,0],[1,1]
        ];

        for (const [dr, dc] of dirs) {
            let r = kingPos.row + dr;
            let c = kingPos.col + dc;
            const isDiagonal = Math.abs(dr) === Math.abs(dc);

            while (this.isValidPosition(r, c)) {
                const piece = board[r][c];
                if (piece !== PIECES.EMPTY) {
                    if (this.isPieceWhite(piece) !== isWhite) {
                        const pieceType = Math.abs(piece);
                        if (pieceType === Math.abs(PIECES.W_QUEEN) ||
                            (isDiagonal && pieceType === Math.abs(PIECES.W_BISHOP)) ||
                            (!isDiagonal && pieceType === Math.abs(PIECES.W_ROOK))) {
                            return true;
                        }
                    }
                    break;
                }
                r += dr;
                c += dc;
            }
        }

        return false;
    }

// Modify isLegalMove to use skipValidation parameter
    isLegalMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.getPiece(fromRow, fromCol);

        // Check if correct player is moving
        if ((this.currentPlayer === 'white' && !this.isPieceWhite(piece)) ||
            (this.currentPlayer === 'black' && this.isPieceWhite(piece))) {
            return false;
        }

        // Get raw moves without validation
        const validMoves = this.getPieceMoves(fromRow, fromCol, true);

        // Check if the move is in the list of valid moves
        const isValidMove = validMoves.some(move =>
            move.row === toRow && move.col === toCol
        );

        if (!isValidMove) {
            return false;
        }

        // Create temporary board for check validation
        const tempBoard = this.board.map(row => [...row]);
        const tempKingPositions = {
            white: {...this.kingPositions.white},
            black: {...this.kingPositions.black}
        };

        // Make the move on temporary board
        tempBoard[toRow][toCol] = tempBoard[fromRow][fromCol];
        tempBoard[fromRow][fromCol] = PIECES.EMPTY;

        // Update king position if moving king
        if (Math.abs(piece) === Math.abs(PIECES.W_KING)) {
            tempKingPositions[this.currentPlayer] = { row: toRow, col: toCol };
        }

        // Check if the move would result in check
        return !this.isKingInCheckSimple(tempBoard, tempKingPositions, this.currentPlayer);
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
        // Combine bishop and rook directions directly instead of calling their methods
        const directions = [
            { row: -1, col: -1 }, { row: -1, col: 1 },
            { row: 1, col: -1 }, { row: 1, col: 1 },
            { row: -1, col: 0 }, { row: 1, col: 0 },
            { row: 0, col: -1 }, { row: 0, col: 1 }
        ];

        this.getSlidingMoves(row, col, directions, moves);
    }

    // Получение ходов короля
    getKingMoves(row, col, moves) {
        const piece = this.getPiece(row, col);
        const isWhite = this.isPieceWhite(piece);
        const player = isWhite ? 'white' : 'black';

        // Обычные ходы короля
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
                    this.isPieceWhite(targetPiece) !== isWhite) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        }

        // Проверка возможности рокировки
        if (this.canCastle(player, 'kingSide')) {
            moves.push({ row: row, col: col + 2, castling: 'kingSide' });
        }
        if (this.canCastle(player, 'queenSide')) {
            moves.push({ row: row, col: col - 2, castling: 'queenSide' });
        }
    }
    canCastle(player, side) {
        if (!this.castlingRights[player][side]) {
            return false;
        }

        const row = player === 'white' ? 7 : 0;
        const kingCol = 4;

        // Проверяем, что король и ладья не двигались
        if (!this.castlingRights[player][side]) {
            return false;
        }

        // Проверяем, что король не под шахом
        if (this.isKingInCheck(this.board, this.kingPositions, player)) {
            return false;
        }

        // Проверяем путь для короткой рокировки
        if (side === 'kingSide') {
            if (this.getPiece(row, 5) !== PIECES.EMPTY ||
                this.getPiece(row, 6) !== PIECES.EMPTY ||
                this.getPiece(row, 7) !== (player === 'white' ? PIECES.W_ROOK : PIECES.B_ROOK)) {
                return false;
            }
            // Проверяем, не проходит ли король через битое поле
            if (this.isSquareUnderAttack(row, 5, player) ||
                this.isSquareUnderAttack(row, 6, player)) {
                return false;
            }
        }
        // Проверяем путь для длинной рокировки
        else if (side === 'queenSide') {
            if (this.getPiece(row, 3) !== PIECES.EMPTY ||
                this.getPiece(row, 2) !== PIECES.EMPTY ||
                this.getPiece(row, 1) !== PIECES.EMPTY ||
                this.getPiece(row, 0) !== (player === 'white' ? PIECES.W_ROOK : PIECES.B_ROOK)) {
                return false;
            }
            // Проверяем, не проходит ли король через битое поле
            if (this.isSquareUnderAttack(row, 3, player) ||
                this.isSquareUnderAttack(row, 2, player)) {
                return false;
            }
        }

        return true;
    }
    isSquareUnderAttack(row, col, player) {
        const isWhite = player === 'white';

        // Проверяем атаки от всех фигур противника
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.getPiece(r, c);
                if (piece !== PIECES.EMPTY && this.isPieceWhite(piece) !== isWhite) {
                    const moves = this.getPieceMoves(r, c, true); // Используем skipValidation
                    if (moves.some(move => move.row === row && move.col === col)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // Получение ходов для скользящих фигур (слон, ладья, ферзь)
    getSlidingMoves(row, col, directions, moves) {
        const piece = this.getPiece(row, col);
        if (!piece) return;

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



    // Новый метод для проверки шаха после хода
    isKingInCheckAfterMove(board, kingPositions, player) {
        const kingPos = kingPositions[player];
        const isWhite = player === 'white';

        // Проверяем атаки от пешек
        const pawnDirections = isWhite ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
        for (const [dRow, dCol] of pawnDirections) {
            const newRow = kingPos.row + dRow;
            const newCol = kingPos.col + dCol;
            if (this.isValidPosition(newRow, newCol)) {
                const piece = board[newRow][newCol];
                if (piece !== PIECES.EMPTY &&
                    this.isPieceWhite(piece) !== isWhite &&
                    Math.abs(piece) === Math.abs(PIECES.W_PAWN)) {
                    return true;
                }
            }
        }

        // Проверяем атаки от коней
        const knightMoves = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        for (const [dRow, dCol] of knightMoves) {
            const newRow = kingPos.row + dRow;
            const newCol = kingPos.col + dCol;
            if (this.isValidPosition(newRow, newCol)) {
                const piece = board[newRow][newCol];
                if (piece !== PIECES.EMPTY &&
                    this.isPieceWhite(piece) !== isWhite &&
                    Math.abs(piece) === Math.abs(PIECES.W_KNIGHT)) {
                    return true;
                }
            }
        }

        // Проверяем атаки по диагоналям (слоны и ферзь)
        const diagonalDirections = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        for (const [dRow, dCol] of diagonalDirections) {
            let newRow = kingPos.row + dRow;
            let newCol = kingPos.col + dCol;
            while (this.isValidPosition(newRow, newCol)) {
                const piece = board[newRow][newCol];
                if (piece !== PIECES.EMPTY) {
                    if (this.isPieceWhite(piece) !== isWhite &&
                        (Math.abs(piece) === Math.abs(PIECES.W_BISHOP) ||
                            Math.abs(piece) === Math.abs(PIECES.W_QUEEN))) {
                        return true;
                    }
                    break;
                }
                newRow += dRow;
                newCol += dCol;
            }
        }

        // Проверяем атаки по горизонтали и вертикали (ладьи и ферзь)
        const straightDirections = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dRow, dCol] of straightDirections) {
            let newRow = kingPos.row + dRow;
            let newCol = kingPos.col + dCol;
            while (this.isValidPosition(newRow, newCol)) {
                const piece = board[newRow][newCol];
                if (piece !== PIECES.EMPTY) {
                    if (this.isPieceWhite(piece) !== isWhite &&
                        (Math.abs(piece) === Math.abs(PIECES.W_ROOK) ||
                            Math.abs(piece) === Math.abs(PIECES.W_QUEEN))) {
                        return true;
                    }
                    break;
                }
                newRow += dRow;
                newCol += dCol;
            }
        }

        // Проверяем атаки от вражеского короля
        const kingMoves = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1], [0, 1],
            [1, -1], [1, 0], [1, 1]
        ];
        for (const [dRow, dCol] of kingMoves) {
            const newRow = kingPos.row + dRow;
            const newCol = kingPos.col + dCol;
            if (this.isValidPosition(newRow, newCol)) {
                const piece = board[newRow][newCol];
                if (piece !== PIECES.EMPTY &&
                    this.isPieceWhite(piece) !== isWhite &&
                    Math.abs(piece) === Math.abs(PIECES.W_KING)) {
                    return true;
                }
            }
        }

        return false;
    }



    // Проверка шаха
    isKingInCheck(board, kingPositions, player) {
        const kingPos = kingPositions[player];
        const isWhite = player === 'white';

        // Check pawn attacks
        const pawnDirs = isWhite ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
        for (const [dr, dc] of pawnDirs) {
            const r = kingPos.row + dr;
            const c = kingPos.col + dc;
            if (this.isValidPosition(r, c)) {
                const piece = board[r][c];
                if (piece !== PIECES.EMPTY &&
                    this.isPieceWhite(piece) !== isWhite &&
                    Math.abs(piece) === Math.abs(PIECES.W_PAWN)) {
                    return true;
                }
            }
        }

        // Check knight attacks
        const knightDirs = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
        for (const [dr, dc] of knightDirs) {
            const r = kingPos.row + dr;
            const c = kingPos.col + dc;
            if (this.isValidPosition(r, c)) {
                const piece = board[r][c];
                if (piece !== PIECES.EMPTY &&
                    this.isPieceWhite(piece) !== isWhite &&
                    Math.abs(piece) === Math.abs(PIECES.W_KNIGHT)) {
                    return true;
                }
            }
        }

        // Check sliding pieces (queen, rook, bishop)
        const dirs = [
            [-1,-1],[-1,0],[-1,1],
            [0,-1],[0,1],
            [1,-1],[1,0],[1,1]
        ];

        for (const [dr, dc] of dirs) {
            let r = kingPos.row + dr;
            let c = kingPos.col + dc;
            const isDiagonal = Math.abs(dr) === Math.abs(dc);

            while (this.isValidPosition(r, c)) {
                const piece = board[r][c];
                if (piece !== PIECES.EMPTY) {
                    if (this.isPieceWhite(piece) !== isWhite) {
                        const pieceType = Math.abs(piece);
                        if (pieceType === Math.abs(PIECES.W_QUEEN) ||
                            (isDiagonal && pieceType === Math.abs(PIECES.W_BISHOP)) ||
                            (!isDiagonal && pieceType === Math.abs(PIECES.W_ROOK))) {
                            return true;
                        }
                    }
                    break;
                }
                r += dr;
                c += dc;
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

        // Проверяем, является ли ход рокировкой
        const isCastling = Math.abs(piece) === Math.abs(PIECES.W_KING) && Math.abs(fromCol - toCol) === 2;

        // Сохраняем ход в истории
        this.moveHistory.push({
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            piece: piece,
            captured: targetPiece,
            isCastling: isCastling
        });

        // Выполняем ход
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = PIECES.EMPTY;

        // Обрабатываем рокировку
        if (isCastling) {
            const row = fromRow;
            const isKingSide = toCol > fromCol;

            if (isKingSide) {
                // Перемещаем ладью при короткой рокировке
                this.board[row][5] = this.board[row][7];
                this.board[row][7] = PIECES.EMPTY;
            } else {
                // Перемещаем ладью при длинной рокировке
                this.board[row][3] = this.board[row][0];
                this.board[row][0] = PIECES.EMPTY;
            }
        }

        // Обновляем права на рокировку
        this.updateCastlingRights(fromRow, fromCol, piece);

        // Обновляем позицию короля
        if (Math.abs(piece) === Math.abs(PIECES.W_KING)) {
            this.kingPositions[this.currentPlayer] = { row: toRow, col: toCol };
        }

        // Меняем игрока
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';

        return true;
    }
    updateCastlingRights(row, col, piece) {
        const isWhite = this.isPieceWhite(piece);
        const player = isWhite ? 'white' : 'black';

        // Если двигается король, отменяем все права на рокировку для этого цвета
        if (Math.abs(piece) === Math.abs(PIECES.W_KING)) {
            this.castlingRights[player].kingSide = false;
            this.castlingRights[player].queenSide = false;
        }
        // Если двигается ладья, отменяем право на рокировку с соответствующей стороны
        else if (Math.abs(piece) === Math.abs(PIECES.W_ROOK)) {
            if (col === 0) { // Ладья на queenside
                this.castlingRights[player].queenSide = false;
            } else if (col === 7) { // Ладья на kingside
                this.castlingRights[player].kingSide = false;
            }
        }
    }

    // Проверка на превращение пешки
    isPawnPromotion(row, col) {
        const piece = this.getPiece(row, col);
        return (Math.abs(piece) === Math.abs(PIECES.W_PAWN)) &&
            (row === 0 || row === 7);
    }


    // Проверка на мат
    isCheckmate() {
        // If king is not in check, it's not checkmate
        if (!this.isKingInCheck(this.board, this.kingPositions, this.currentPlayer)) {
            return false;
        }

        // Check all possible moves for current player
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.getPiece(row, col);
                if (piece !== PIECES.EMPTY &&
                    this.isPieceWhite(piece) === (this.currentPlayer === 'white')) {
                    // Get moves with validation
                    const moves = this.getPieceMoves(row, col, false);
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
        // If king is in check, it's not stalemate
        if (this.isKingInCheck(this.board, this.kingPositions, this.currentPlayer)) {
            return false;
        }

        // Check if current player has any legal moves
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.getPiece(row, col);
                if (piece !== PIECES.EMPTY &&
                    this.isPieceWhite(piece) === (this.currentPlayer === 'white')) {
                    // Get moves with validation
                    const moves = this.getPieceMoves(row, col, false);
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
