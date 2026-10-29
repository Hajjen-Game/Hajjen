/* Approved Washi Zen UI panels · visual-only loader.
   The CSS keeps the current live styles until each new artwork is available.
   Never touch moves, score, star calculation, board, cards or save data. */
(() => {
  const panels = [
    ['.game-view .moves', './assets/gameplay-washi/moves-panel-20261029.png'],
    ['.game-view #scorePanel', './assets/gameplay-washi/score-panel-20261029.png'],
  ];
  function preload() {
    for (const [selector, src] of panels) {
      const element = document.querySelector(selector);
      if (!element) continue;
      const art = new Image();
      art.onload = () => { if (art.naturalWidth) element.classList.add('jh-approved-panel-ready'); };
      art.onerror = () => { /* Missing artwork: preserve old CSS fallback. */ };
      art.src = src;
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', preload, {once:true});
  } else preload();
})();
