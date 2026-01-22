
import { Piece, Position, Color, GameState, Move, PieceType } from '../types';

export function createInitialBoard(): (Piece | null)[][] {
  const board: (Piece | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));
  const setupRow = (row: number, color: Color) => {
    const pieces: PieceType[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
    pieces.forEach((type, col) => {
      board[row][col] = { type, color, id: `${color}-${type}-${row}-${col}` };
    });
  };
  const setupPawns = (row: number, color: Color) => {
    for (let col = 0; col < 8; col++) {
      board[row][col] = { type: 'p', color, id: `${color}-p-${row}-${col}` };
    }
  };

  setupRow(0, 'b');
  setupPawns(1, 'b');
  setupPawns(6, 'w');
  setupRow(7, 'w');

  return board;
}

export function isWithinBounds(row: number, col: number): boolean {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

export function getPossibleMoves(board: (Piece | null)[][], pos: Position, lastMove: Move | null, checkCheck: boolean = true): Position[] {
  const piece = board[pos.row][pos.col];
  if (!piece) return [];

  let moves: Position[] = [];
  const { row, col } = pos;
  const color = piece.color;
  const enemyColor = color === 'w' ? 'b' : 'w';

  switch (piece.type) {
    case 'p': {
      const dir = color === 'w' ? -1 : 1;
      const startRow = color === 'w' ? 6 : 1;
      
      // Step forward
      if (isWithinBounds(row + dir, col) && !board[row + dir][col]) {
        moves.push({ row: row + dir, col });
        if (row === startRow && !board[row + 2 * dir][col]) {
          moves.push({ row: row + 2 * dir, col });
        }
      }
      
      // Captures
      const captureCols = [col - 1, col + 1];
      captureCols.forEach(c => {
        if (isWithinBounds(row + dir, c)) {
          const target = board[row + dir][c];
          if (target && target.color === enemyColor) {
            moves.push({ row: row + dir, col: c });
          }
          // En Passant
          if (!target && lastMove && lastMove.piece.type === 'p' && 
              Math.abs(lastMove.from.row - lastMove.to.row) === 2 &&
              lastMove.to.row === row && lastMove.to.col === c) {
            moves.push({ row: row + dir, col: c });
          }
        }
      });
      break;
    }

    case 'r':
    case 'b':
    case 'q': {
      const directions = piece.type === 'r' ? [[0, 1], [0, -1], [1, 0], [-1, 0]] :
                         piece.type === 'b' ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] :
                         [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
      
      directions.forEach(([dr, dc]) => {
        let r = row + dr;
        let c = col + dc;
        while (isWithinBounds(r, c)) {
          const target = board[r][c];
          if (!target) {
            moves.push({ row: r, col: c });
          } else {
            if (target.color === enemyColor) moves.push({ row: r, col: c });
            break;
          }
          r += dr;
          c += dc;
        }
      });
      break;
    }

    case 'n': {
      const jumps = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
      jumps.forEach(([dr, dc]) => {
        const r = row + dr;
        const c = col + dc;
        if (isWithinBounds(r, c)) {
          const target = board[r][c];
          if (!target || target.color === enemyColor) moves.push({ row: r, col: c });
        }
      });
      break;
    }

    case 'k': {
      const steps = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
      steps.forEach(([dr, dc]) => {
        const r = row + dr;
        const c = col + dc;
        if (isWithinBounds(r, c)) {
          const target = board[r][c];
          if (!target || target.color === enemyColor) moves.push({ row: r, col: c });
        }
      });

      // Castling
      if (checkCheck && !isSquareAttacked(board, pos, enemyColor)) {
        // Only if King and Rook haven't moved (simplified for logic)
        // We track history for this.
      }
      break;
    }
  }

  // Filter out moves that leave King in check
  if (checkCheck) {
    moves = moves.filter(m => {
      const nextBoard = board.map(r => [...r]);
      const movingPiece = nextBoard[pos.row][pos.col];
      nextBoard[m.row][m.col] = movingPiece;
      nextBoard[pos.row][pos.col] = null;
      
      // Handle en passant capture in move filter
      if (movingPiece?.type === 'p' && m.col !== pos.col && !board[m.row][m.col]) {
        nextBoard[pos.row][m.col] = null;
      }

      const kingPos = findKing(nextBoard, color);
      return kingPos ? !isSquareAttacked(nextBoard, kingPos, enemyColor) : true;
    });
  }

  return moves;
}

export function findKing(board: (Piece | null)[][], color: Color): Position | null {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === 'k' && p.color === color) return { row: r, col: c };
    }
  }
  return null;
}

export function isSquareAttacked(board: (Piece | null)[][], pos: Position, attackerColor: Color): boolean {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === attackerColor) {
        const moves = getPossibleMoves(board, { row: r, col: c }, null, false);
        if (moves.some(m => m.row === pos.row && m.col === pos.col)) return true;
      }
    }
  }
  return false;
}

export function getNotation(from: Position, to: Position, piece: Piece, captured: Piece | null, isCheck: boolean, isCheckmate: boolean): string {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
  
  let notation = '';
  if (piece.type !== 'p') {
    notation += piece.type.toUpperCase();
  }
  
  if (captured) {
    if (piece.type === 'p') notation += files[from.col];
    notation += 'x';
  }
  
  notation += files[to.col] + ranks[to.row];
  
  if (isCheckmate) notation += '#';
  else if (isCheck) notation += '+';
  
  return notation;
}
