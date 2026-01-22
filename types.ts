
export type Color = 'w' | 'b';
export type PieceType = 'p' | 'r' | 'n' | 'b' | 'q' | 'k';

export interface Piece {
  type: PieceType;
  color: Color;
  id: string; // for React keys
}

export interface Position {
  row: number;
  col: number;
}

export interface Move {
  from: Position;
  to: Position;
  piece: Piece;
  captured?: Piece;
  promotion?: PieceType;
  notation: string;
}

export interface GameState {
  board: (Piece | null)[][];
  turn: Color;
  moveHistory: Move[];
  selectedSquare: Position | null;
  validMoves: Position[];
  isCheck: boolean;
  isCheckmate: boolean;
  isGameOver: boolean;
  promotionPending: Position | null;
  lastMove: Move | null;
}
