
import { GoogleGenAI } from "@google/genai";
import { Move } from "../types";

export async function analyzePosition(moves: Move[]): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const moveList = moves.map(m => m.notation).join(', ');
  
  const prompt = `Act as a chess grandmaster. Analyze the following game sequence and provide a brief strategic tip (max 50 words) for the current player. Moves so far: ${moveList || 'Starting position'}.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "I couldn't analyze the position right now.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "The Grandmaster is thinking deeply... (API Error)";
  }
}
