(() => {
  const enhanceImportModal = () => {
    const button = document.querySelector('#runUrl');
    if (!button || button.dataset.importEntryFix === '1') return;
    button.dataset.importEntryFix = '1';

    const data = window.CourtIQData;
    if (data?.isSignedIn?.()) return;

    button.disabled = false;
    button.textContent = 'SIGN IN TO IMPORT';

    const modal = button.closest('.modal');
    const status = modal?.querySelector('#urlStatus');
    const schema = modal?.querySelector('.schema');
    if (schema) schema.textContent = 'SIGN IN REQUIRED · Connect to the secure club session, then import the official game.';
    if (status) status.textContent = 'Import is ready. Sign in first so CourtIQ can verify and save the game.';

    button.onclick = () => {
      const url = modal?.querySelector('#boxUrl')?.value?.trim() || '';
      if (url) {
        try { sessionStorage.setItem('courtiq_pending_import_url', url); } catch (_) {}
      }
      modal?.remove();
      if (typeof window.openAccount === 'function') window.openAccount('signin');
    };
  };

  const restorePendingUrl = () => {
    if (!window.CourtIQData?.isSignedIn?.()) return;
    let pending = '';
    try { pending = sessionStorage.getItem('courtiq_pending_import_url') || ''; } catch (_) {}
    if (!pending) return;
    const input = document.querySelector('#boxUrl');
    if (!input) return;
    input.value = pending;
    const status = document.querySelector('#urlStatus');
    if (status) status.textContent = 'Saved official game link restored. Press IMPORT · VERIFY · SAVE.';
    try { sessionStorage.removeItem('courtiq_pending_import_url'); } catch (_) {}
  };

  const observer = new MutationObserver(() => {
    enhanceImportModal();
    restorePendingUrl();
  });

  const start = () => {
    enhanceImportModal();
    restorePendingUrl();
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
