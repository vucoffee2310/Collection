/**
 * Audio Injector - Bypass autoplay policy (minimal volume)
 */

(() => {
  if (window.__AUDIO_INJECTOR_LOADED__) {
    console.log('⚠️ Audio Injector already loaded');
    return;
  }
  window.__AUDIO_INJECTOR_LOADED__ = true;

  console.log('🔊 Loading Audio Injector...');

  let audioContext, oscillator;

  const FREQUENCY = (0.5 * 44100) / (2 * Math.PI); // ~996.67 Hz
  const GAIN = 0.0005; // Ultra-minimal volume (0.0001%)

  const startAudio = () => {
    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('🎵 AudioContext created');
      }

      if (oscillator) {
        try {
          oscillator.stop();
        } catch (e) {
          // Ignore if already stopped
        }
      }

      if (audioContext.state === 'suspended') {
        console.log('▶️ Resuming suspended AudioContext...');
        audioContext.resume().then(() => {
          console.log('✅ AudioContext resumed');
        }).catch((err) => {
          console.warn('⚠️ Failed to resume AudioContext:', err);
        });
      }

      oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(FREQUENCY, audioContext.currentTime);
      gainNode.gain.setValueAtTime(GAIN, audioContext.currentTime);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start();

      console.log('✅ Audio started - autoplay policy bypassed');
      
      // Notify via postMessage
      window.postMessage({
        source: 'audio-injector',
        type: 'started',
        timestamp: new Date().toISOString()
      }, '*');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to start audio:', error);
      
      window.postMessage({
        source: 'audio-injector',
        type: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      }, '*');
      
      return false;
    }
  };

  const stopAudio = () => {
    try {
      if (oscillator) {
        oscillator.stop();
        oscillator = null;
        console.log('⏹️ Audio stopped');
        
        window.postMessage({
          source: 'audio-injector',
          type: 'stopped',
          timestamp: new Date().toISOString()
        }, '*');
      }
      return true;
    } catch (error) {
      console.error('❌ Failed to stop audio:', error);
      return false;
    }
  };

  const getStatus = () => {
    return {
      loaded: true,
      audioContextState: audioContext ? audioContext.state : 'not created',
      oscillatorActive: !!oscillator,
      frequency: FREQUENCY,
      gain: GAIN
    };
  };

  // Expose API to page context
  window.audioInjector = {
    start: startAudio,
    stop: stopAudio,
    status: getStatus
  };

  // Listen for messages from extension
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    
    if (event.data.source === 'extension') {
      switch (event.data.action) {
        case 'startAudio':
          startAudio();
          break;
        case 'stopAudio':
          stopAudio();
          break;
        case 'getStatus':
          window.postMessage({
            source: 'audio-injector',
            type: 'status',
            ...getStatus(),
            timestamp: new Date().toISOString()
          }, '*');
          break;
      }
    }
  });

  console.log('✅ Audio Injector loaded');
  console.log('📋 Available: window.audioInjector.start() / .stop() / .status()');
  
  window.postMessage({
    source: 'audio-injector',
    type: 'ready',
    timestamp: new Date().toISOString()
  }, '*');

  // Auto-start on load after a short delay
  setTimeout(() => {
    console.log('🚀 Auto-starting audio injector...');
    startAudio();
  }, 100);

})();