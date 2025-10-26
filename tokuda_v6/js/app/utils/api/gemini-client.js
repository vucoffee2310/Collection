/**
 * Gemini AI Client
 * Handles AI API communication
 */

import { CONFIG } from '../config/constants.js';

/**
 * Stream AI response and parse SSE chunks
 * @param {ReadableStreamDefaultReader} reader - Stream reader
 * @param {Function} onChunk - Callback for each text chunk
 * @returns {Promise<string>} - Complete text response
 */
const streamAI = async (reader, onChunk) => {
  const decoder = new TextDecoder();
  let leftover = '';
  let fullText = '';
  
  for (let done = false; !done;) {
    const chunk = await reader.read();
    done = chunk.done;
    if (done) break;
    
    const lines = (leftover + decoder.decode(chunk.value, { stream: true })).split('\n');
    leftover = lines.pop();
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const text = JSON.parse(line.slice(6)).candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            console.log(text);
            fullText += text;
            if (onChunk) {
              await onChunk(text);
            }
          }
        } catch (err) {
          // Ignore parse errors
        }
      }
    }
  }
  
  return fullText;
};

/**
 * Send content to AI and process streaming response
 * @param {string} content - Content to send
 * @param {Function} onChunk - Callback for each chunk
 * @returns {Promise<string>} - Complete AI response
 */
export const sendToAI = async (content, onChunk) => {
  try {
    const res = await fetch(`${CONFIG.GEMINI_URL}&key=${CONFIG.API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: content }] }],
        generationConfig: {
          temperature: 1.5,
          topP: 0.5,
          thinkingConfig: { thinkingBudget: 500 }
        }
      })
    });
    
    if (!res.ok) {
      throw new Error(`API Error: ${res.status}`);
    }
    
    const fullText = await streamAI(res.body.getReader(), onChunk);
    return fullText;
  } catch (err) {
    console.error('AI API Error:', err);
    throw err;
  }
};