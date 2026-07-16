/**
 * wisemon-translate - Text-to-Speech helper
 * Wraps the browser's speechSynthesis API with language-aware voice selection.
 */
(function() {
  'use strict';

  const ctx = window.__LLM_CTX__ = window.__LLM_CTX__ || { state: {}, fn: {}, features: {} };
  let currentUtterance = null;
  let voicesLoaded = false;
  let voiceCache = [];

  function loadVoices() {
    return new Promise(function(resolve) {
      if (voicesLoaded && voiceCache.length) {
        resolve(voiceCache);
        return;
      }
      const voices = speechSynthesis.getVoices();
      if (voices && voices.length) {
        voicesLoaded = true;
        voiceCache = voices;
        resolve(voices);
        return;
      }
      if (typeof speechSynthesis.onvoiceschanged !== 'undefined') {
        const handler = function() {
          speechSynthesis.onvoiceschanged = null;
          voicesLoaded = true;
          voiceCache = speechSynthesis.getVoices();
          resolve(voiceCache);
        };
        speechSynthesis.onvoiceschanged = handler;
        // Fallback if event never fires
        setTimeout(function() {
          if (!voicesLoaded) {
            speechSynthesis.onvoiceschanged = null;
            voicesLoaded = true;
            voiceCache = speechSynthesis.getVoices();
            resolve(voiceCache);
          }
        }, 2000);
      } else {
        setTimeout(function() {
          voicesLoaded = true;
          voiceCache = speechSynthesis.getVoices();
          resolve(voiceCache);
        }, 300);
      }
    });
  }

  function pickVoice(voices, lang) {
    if (!voices || !voices.length || !lang) return null;
    const code = String(lang).toLowerCase();
    // Exact match first
    let match = voices.find(function(v) { return String(v.lang).toLowerCase() === code; });
    if (match) return match;
    // Language prefix match
    const prefix = code.split('-')[0];
    match = voices.find(function(v) { return String(v.lang).toLowerCase().startsWith(prefix + '-'); });
    if (match) return match;
    // Any voice whose lang includes the prefix
    return voices.find(function(v) { return String(v.lang).toLowerCase().startsWith(prefix); }) || null;
  }

  function resolveLang(lang, settings) {
    if (lang && lang !== 'auto') return lang;
    const s = settings || ctx.state.settings || {};
    return s.targetLang || 'en-US';
  }

  async function speak(text, lang) {
    stop();
    const t = String(text || '').trim();
    if (!t) return;
    try {
      const voices = await loadVoices();
      const settings = ctx.state.settings || {};
      const resolvedLang = resolveLang(lang, settings);
      const utter = new SpeechSynthesisUtterance(t);
      const voice = pickVoice(voices, resolvedLang);
      if (voice) {
        utter.voice = voice;
        utter.lang = voice.lang;
      } else {
        utter.lang = resolvedLang;
      }
      utter.rate = 1;
      utter.pitch = 1;
      utter.volume = 1;
      utter.onend = function() { currentUtterance = null; };
      utter.onerror = function() { currentUtterance = null; };
      currentUtterance = utter;
      speechSynthesis.speak(utter);
    } catch (e) {
      if (typeof LOG !== 'undefined') LOG.warn('TTS', 'Speak failed: ' + e.message);
    }
  }

  function stop() {
    try {
      speechSynthesis.cancel();
    } catch (e) {}
    currentUtterance = null;
  }

  Object.assign(ctx.fn, {
    speakTTS: speak,
    stopTTS: stop
  });

  // Global fallback for pages that load this script directly (e.g. sidepanel)
  window.__LLM_TTS__ = { speak: speak, stop: stop };
})();
