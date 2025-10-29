(() => {
  if (window.__AUDIO_INJECTOR_LOADED__) return;
  window.__AUDIO_INJECTOR_LOADED__ = true;

  let audioContext, oscillator;
  const FREQUENCY = 10000 / (2 * Math.PI);
  const GAIN = 0.0005;

  const postMsg = (type, data = {}) => {
    window.postMessage({ source: 'audio-injector', type, ...data, timestamp: new Date().toISOString() }, '*');
  };

  const startAudio = () => {
    try {
      if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (oscillator) try { oscillator.stop(); } catch (e) {}
      if (audioContext.state === 'suspended') audioContext.resume();

      oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(FREQUENCY, audioContext.currentTime);
      gainNode.gain.setValueAtTime(GAIN, audioContext.currentTime);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start();

      postMsg('started');
      return true;
    } catch (error) {
      postMsg('error', { message: error.message });
      return false;
    }
  };

  const stopAudio = () => {
    if (oscillator) {
      try { oscillator.stop(); } catch (e) {}
      oscillator = null;
      postMsg('stopped');
    }
  };

  window.audioInjector = {
    start: startAudio,
    stop: stopAudio,
    status: () => ({
      loaded: true,
      audioContextState: audioContext?.state || 'not created',
      oscillatorActive: !!oscillator,
      frequency: FREQUENCY,
      gain: GAIN
    })
  };

  postMsg('ready');
  setTimeout(startAudio, 100);
  console.log('✅ Audio Injector loaded');
})();