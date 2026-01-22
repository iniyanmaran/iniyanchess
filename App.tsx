
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GameState, Position, Piece, Color, Move, PieceType } from './types';
import { createInitialBoard, getPossibleMoves, findKing, isSquareAttacked, getNotation } from './gameLogic/rules';
import { PIECE_UNICODE } from './constants';
import { analyzePosition } from './services/geminiService';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    board: createInitialBoard(),
    turn: 'w',
    moveHistory: [],
    selectedSquare: null,
    validMoves: [],
    isCheck: false,
    isCheckmate: false,
    isGameOver: false,
    promotionPending: null,
    lastMove: null,
  });

  const [aiTip, setAiTip] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const resetGame = () => {
    setGameState({
      board: createInitialBoard(),
      turn: 'w',
      moveHistory: [],
      selectedSquare: null,
      validMoves: [],
      isCheck: false,
      isCheckmate: false,
      isGameOver: false,
      promotionPending: null,
      lastMove: null,
    });
    setAiTip(null);
  };

  const handleSquareClick = (row: number, col: number) => {
    if (gameState.isGameOver || gameState.promotionPending) return;

    const clickedPiece = gameState.board[row][col];
    const { selectedSquare, validMoves, turn, board, lastMove } = gameState;

    // If a piece is already selected and we click a valid move square
    if (selectedSquare && validMoves.some(m => m.row === row && m.col === col)) {
      executeMove(selectedSquare, { row, col });
      return;
    }

    // Select a piece of current turn
    if (clickedPiece && clickedPiece.color === turn) {
      const moves = getPossibleMoves(board, { row, col }, lastMove);
      setGameState(prev => ({
        ...prev,
        selectedSquare: { row, col },
        validMoves: moves,
      }));
    } else {
      setGameState(prev => ({
        ...prev,
        selectedSquare: null,
        validMoves: [],
      }));
    }
  };

  const executeMove = (from: Position, to: Position, promotionType: PieceType = 'q') => {
    const newBoard = gameState.board.map(r => [...r]);
    const piece = newBoard[from.row][from.col]!;
    let captured = newBoard[to.row][to.col];
    
    // En Passant capture
    if (piece.type === 'p' && to.col !== from.col && !captured) {
      captured = newBoard[from.row][to.col];
      newBoard[from.row][to.col] = null;
    }

    // Castling logic (simplified check)
    if (piece.type === 'k' && Math.abs(to.col - from.col) === 2) {
      const isKingSide = to.col > from.col;
      const rookCol = isKingSide ? 7 : 0;
      const newRookCol = isKingSide ? 5 : 3;
      const rook = newBoard[from.row][rookCol];
      newBoard[from.row][newRookCol] = rook;
      newBoard[from.row][rookCol] = null;
    }

    // Promotion check
    if (piece.type === 'p' && (to.row === 0 || to.row === 7)) {
      piece.type = promotionType;
    }

    newBoard[to.row][to.col] = piece;
    newBoard[from.row][from.col] = null;

    const nextTurn = gameState.turn === 'w' ? 'b' : 'w';
    const kingPos = findKing(newBoard, nextTurn);
    const isCheck = kingPos ? isSquareAttacked(newBoard, kingPos, gameState.turn) : false;
    
    // Checkmate check
    let isCheckmate = false;
    if (isCheck) {
      const hasLegalMoves = newBoard.some((rowArr, r) => 
        rowArr.some((p, c) => p && p.color === nextTurn && getPossibleMoves(newBoard, { row: r, col: c }, { from, to, piece, captured: captured || undefined, notation: '' }).length > 0)
      );
      if (!hasLegalMoves) isCheckmate = true;
    }

    const move: Move = {
      from,
      to,
      piece: { ...piece },
      captured: captured || undefined,
      notation: getNotation(from, to, piece, captured, isCheck, isCheckmate),
    };

    setGameState(prev => ({
      ...prev,
      board: newBoard,
      turn: nextTurn,
      moveHistory: [...prev.moveHistory, move],
      selectedSquare: null,
      validMoves: [],
      isCheck,
      isCheckmate,
      isGameOver: isCheckmate,
      lastMove: move,
    }));
  };

  const getAiAdvice = async () => {
    setIsAnalyzing(true);
    const tip = await analyzePosition(gameState.moveHistory);
    setAiTip(tip);
    setIsAnalyzing(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-slate-50">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Grandmaster Chess</h1>
        <p className="text-slate-500 mt-2">Professional Strategy & Analysis</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 w-full max-w-6xl items-start justify-center">
        {/* Chess Board */}
        <div className="relative shadow-2xl rounded-lg overflow-hidden border-8 border-slate-800 bg-slate-800">
          <div className="grid grid-cols-8 grid-rows-8 w-[320px] h-[320px] sm:w-[500px] sm:h-[500px]">
            {gameState.board.map((rowArr, r) => 
              rowArr.map((piece, c) => {
                const isDark = (r + c) % 2 === 1;
                const isSelected = gameState.selectedSquare?.row === r && gameState.selectedSquare?.col === c;
                const isValidMove = gameState.validMoves.some(m => m.row === r && m.col === c);
                const isCheckKing = gameState.isCheck && piece?.type === 'k' && piece?.color === gameState.turn;

                return (
                  <div
                    key={`${r}-${c}`}
                    onClick={() => handleSquareClick(r, c)}
                    className={`
                      relative flex items-center justify-center cursor-pointer transition-colors duration-200
                      ${isDark ? 'bg-slate-500' : 'bg-orange-50'}
                      ${isSelected ? 'ring-inset ring-4 ring-yellow-400 opacity-90' : ''}
                      ${isCheckKing ? 'bg-red-400' : ''}
                      hover:opacity-90
                    `}
                  >
                    {/* Rank/File Labels */}
                    {c === 0 && <span className={`absolute left-0.5 top-0.5 text-[10px] font-bold ${isDark ? 'text-orange-50' : 'text-slate-500'}`}>{8 - r}</span>}
                    {r === 7 && <span className={`absolute right-0.5 bottom-0.5 text-[10px] font-bold ${isDark ? 'text-orange-50' : 'text-slate-500'}`}>{String.fromCharCode(97 + c)}</span>}

                    {/* Piece */}
                    {piece && (
                      <span className={`text-4xl sm:text-6xl select-none transition-transform active:scale-95 ${piece.color === 'w' ? 'text-white drop-shadow-md' : 'text-slate-900'}`}>
                        {PIECE_UNICODE[piece.color][piece.type]}
                      </span>
                    )}

                    {/* Valid Move Indicator */}
                    {isValidMove && (
                      <div className={`w-3 h-3 rounded-full ${piece ? 'border-4 border-black/20 w-8 h-8' : 'bg-black/15'}`} />
                    )}
                  </div>
                );
              })
            )}
          </div>
          
          {gameState.isGameOver && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white backdrop-blur-sm transition-opacity animate-in fade-in">
              <h2 className="text-4xl font-bold mb-4">Checkmate!</h2>
              <p className="text-xl mb-6">{gameState.turn === 'w' ? 'Black' : 'White'} Wins</p>
              <button 
                onClick={resetGame}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full transition-all hover:scale-105 active:scale-95"
              >
                New Game
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4 w-full lg:w-80">
          {/* Game Info */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-sm">Status</h3>
              <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${gameState.turn === 'w' ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-800'}`}>
                {gameState.turn === 'w' ? "White's Turn" : "Black's Turn"}
              </div>
            </div>
            {gameState.isCheck && !gameState.isCheckmate && (
              <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm font-semibold mb-4 text-center">
                Check!
              </div>
            )}
            <button 
              onClick={resetGame}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
            >
              Reset Game
            </button>
          </div>

          {/* AI Analysis */}
          <div className="bg-indigo-900 text-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h3 className="font-bold text-sm uppercase">AI Grandmaster</h3>
            </div>
            {aiTip ? (
              <p className="text-sm italic leading-relaxed text-indigo-100 mb-4">
                "{aiTip}"
              </p>
            ) : (
              <p className="text-sm text-indigo-200 mb-4 italic">Request a tip to analyze the current board state.</p>
            )}
            <button 
              onClick={getAiAdvice}
              disabled={isAnalyzing}
              className={`w-full py-2 ${isAnalyzing ? 'bg-indigo-800 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-400'} rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2`}
            >
              {isAnalyzing && <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>}
              {isAnalyzing ? 'Thinking...' : 'Analyze Position'}
            </button>
          </div>

          {/* Move History */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-64 lg:h-96">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm">Move History</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {Array.from({ length: Math.ceil(gameState.moveHistory.length / 2) }).map((_, i) => (
                  <React.Fragment key={i}>
                    <div className="col-span-2 flex items-center gap-4 py-1 px-2 text-xs font-mono text-slate-400">
                      <span className="w-4">{i + 1}.</span>
                      <div className="flex-1 flex justify-between gap-2">
                        <span className="bg-slate-100 text-slate-800 px-2 py-1 rounded w-full text-center font-bold">
                          {gameState.moveHistory[i * 2]?.notation || ''}
                        </span>
                        <span className={`px-2 py-1 rounded w-full text-center font-bold ${gameState.moveHistory[i * 2 + 1] ? 'bg-slate-800 text-white' : ''}`}>
                          {gameState.moveHistory[i * 2 + 1]?.notation || ''}
                        </span>
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
              {gameState.moveHistory.length === 0 && (
                <div className="text-center text-slate-400 py-10 text-sm">No moves yet</div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <footer className="mt-12 text-slate-400 text-xs text-center max-w-xl">
        Built with React and Gemini Flash Analysis. Supports full chess rules including Castling, Promotion, and En Passant.
      </footer>
    </div>
  );
};

export default App;
