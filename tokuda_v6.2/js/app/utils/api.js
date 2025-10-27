/**
 * AI API Integration
 * ✅ FIXED: POT retry logic + comprehensive error handling
 */

import { CONFIG } from './config.js';

/**
 * Stream AI response and parse SSE chunks
 */
export const streamAI = async (reader, onChunk) => {
  const decoder = new TextDecoder();
  let leftover = '';
  let fullText = '';
  
  try {
    for (let done = false; !done;) {
      const chunk = await reader.read();
      done = chunk.done;
      if (done) break;
      
      const lines = (leftover + decoder.decode(chunk.value, { stream: true })).split('\n');
      leftover = lines.pop();
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const json = JSON.parse(line.slice(6));
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (text) {
              console.log(text);
              fullText += text;
              if (onChunk) {
                await onChunk(text);
              }
            }
            
            // Check for finish reason (error/safety)
            const finishReason = json.candidates?.[0]?.finishReason;
            if (finishReason && finishReason !== 'STOP') {
              console.warn('AI stream finished with reason:', finishReason);
              if (finishReason === 'SAFETY') {
                throw new Error('Content blocked by safety filters');
              }
            }
          } catch (parseError) {
            if (parseError.message === 'Content blocked by safety filters') {
              throw parseError;
            }
            // Ignore JSON parse errors for non-data lines
          }
        }
      }
    }
  } catch (error) {
    console.error('Stream reading error:', error);
    throw error;
  }
  
  return fullText;
};

/**
 * Send content to AI with comprehensive error handling
 */
export const sendToAI = async (content, onChunk, onError = null) => {
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
      let errorMessage = `API Error: ${res.status}`;
      
      try {
        const errorData = await res.json();
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }
      } catch {
        // Can't parse error response
      }
      
      throw new Error(errorMessage);
    }
    
    const fullText = await streamAI(res.body.getReader(), onChunk);
    return fullText;
    
  } catch (err) {
    console.error('AI API Error:', err);
    
    // ✅ User-friendly error messages
    let userMessage = 'Translation failed: ';
    
    if (err.message.includes('429') || err.message.toLowerCase().includes('quota')) {
      userMessage += 'API quota exceeded. Please try again later.';
    } else if (err.message.includes('401') || err.message.includes('403')) {
      userMessage += 'API authentication failed. Invalid API key.';
    } else if (err.message.includes('400')) {
      userMessage += 'Invalid request. Content may be too long.';
    } else if (err.message.includes('safety')) {
      userMessage += 'Content blocked by safety filters.';
    } else if (err.message.includes('Failed to fetch') || err.name === 'TypeError') {
      userMessage += 'Network error. Check your internet connection.';
    } else if (err.message.includes('timeout')) {
      userMessage += 'Request timed out. Please try again.';
    } else {
      userMessage += err.message;
    }
    
    if (onError) {
      onError(userMessage, err);
    } else {
      alert(userMessage);
    }
    
    throw err;
  }
};

/**
 * ✅ Get POT with retry logic (handles expiration)
 */
export const getPotWithRetry = async (videoId, maxRetries = 3) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await new Promise(resolve => 
      chrome.runtime.sendMessage({ action: 'getPot', videoId }, resolve)
    );
    
    if (response?.pot && response.valid) {
      console.log(`✅ Got valid POT (attempt ${attempt + 1})`);
      return response;
    }
    
    console.warn(`⚠️ POT invalid/expired (attempt ${attempt + 1}/${maxRetries})`);
    
    // Wait before retry (exponential backoff)
    if (attempt < maxRetries - 1) {
      const delay = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
      console.log(`   Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Failed to get valid POT token after ' + maxRetries + ' attempts');
};

/**
 * Legacy function (backward compatibility)
 */
export const getPot = (videoId) => new Promise(resolve => 
  chrome.runtime.sendMessage({ action: 'getPot', videoId }, response => {
    resolve(response || {});
  })
);