'use strict';

// Timestamp-based countdown: delayed callbacks must not extend a focus session.
(() => {
  const display = document.querySelector('#focus-time');
  const toggle = document.querySelector('#focus-toggle');
  const reset = document.querySelector('#focus-reset');
  const status = document.querySelector('#focus-status');
  const minutes = document.querySelector('#focus-minutes');
  let duration = 25 * 60 * 1000;
  let remaining = duration;
  let deadline = null;
  let interval = null;
  let state = 'ready';

  function renderTimer() {
    const seconds = Math.ceil(remaining / 1000);
    display.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    minutes.disabled = state === 'running' || state === 'paused';
    toggle.textContent = state === 'running' ? 'Pause focus' : state === 'paused' ? 'Resume focus' : 'Start focus';
    const messages = {
      ready: 'Ready when you are.',
      running: 'Focus time. One small step at a time.',
      paused: 'Paused. Resume when you are ready.',
      complete: 'Focus complete! Take a well-earned break.'
    };
    // Announce state changes, not every second of the countdown.
    if (status.textContent !== messages[state]) status.textContent = messages[state];
  }

  function stopTicking() {
    clearInterval(interval);
    interval = null;
    deadline = null;
  }

  function tick() {
    if (state !== 'running') return;
    remaining = Math.max(0, deadline - Date.now());
    if (remaining === 0) {
      stopTicking();
      state = 'complete';
    }
    renderTimer();
  }

  toggle.addEventListener('click', () => {
    if (state === 'running') {
      tick();
      if (state === 'complete') return;
      stopTicking();
      state = 'paused';
    } else {
      if (state !== 'paused') {
        if (!minutes.reportValidity()) return;
        duration = minutes.valueAsNumber * 60 * 1000;
        remaining = duration;
      }
      deadline = Date.now() + remaining;
      state = 'running';
      interval = setInterval(tick, 250);
    }
    renderTimer();
  });

  minutes.addEventListener('change', () => {
    if (state === 'running' || state === 'paused' || !minutes.checkValidity()) return;
    duration = minutes.valueAsNumber * 60 * 1000;
    remaining = duration;
    state = 'ready';
    renderTimer();
  });

  reset.addEventListener('click', () => {
    stopTicking();
    remaining = duration;
    minutes.value = String(duration / 60000);
    state = 'ready';
    renderTimer();
  });
  document.addEventListener('visibilitychange', tick);
  renderTimer();
})();
