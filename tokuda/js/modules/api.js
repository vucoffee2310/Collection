import { CONFIG } from './config.js';

export const streamAI = async reader => {
  const decoder = new TextDecoder();
  let leftover = '';
  
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
          if (text) console.log(text);
        } catch {}
      }
    }
  }
};

export const sendToAI = async content => {
  try {
    const res = await fetch(`${CONFIG.GEMINI_URL}&key=${CONFIG.API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: content }] }],
        generationConfig: { temperature: 1.4, topP: 0.6, thinkingConfig: { thinkingBudget: 600 } }
      })
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    await streamAI(res.body.getReader());
  } catch (err) {
    console.error('Error:', err);
  }
};

export const getPot = () => new Promise(resolve => 
  chrome.runtime.sendMessage({ action: 'getPot' }, resolve)
);