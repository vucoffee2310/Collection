// tokuda6.4.4/js/app/audio-injector.js
/**
 * Audio Injector - Bypass autoplay policy (minimal volume)
 */

(() => {
  if (window.__AUDIO_INJECTOR_LOADED__) return;
  window.__AUDIO_INJECTOR_LOADED__ = true;

  let audioContext, oscillator;

  const FREQUENCY = (0.01 * 44100) / (2 * Math.PI); // ~996.67 Hz
  const GAIN = 0.0005; // ← Changed from 0.0005 to 0.000001 (0.0001% volume)

  const startAudio = () => {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (oscillator) {
      oscillator.stop();
    }

    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(console.warn);
    }

    oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(FREQUENCY, audioContext.currentTime);
    gainNode.gain.setValueAtTime(GAIN, audioContext.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start();
  };

  const stopAudio = () => {
    if (oscillator) {
      oscillator.stop();
      oscillator = null;
    }
  };

  // Message listener
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'startAudio') {
      startAudio();
      sendResponse({ success: true });
    } else if (message.action === 'stopAudio') {
      stopAudio();
      sendResponse({ success: true });
    }
    return false;
  });

  // Auto-start on load
  setTimeout(() => {
    startAudio();
  }, 100);
})();