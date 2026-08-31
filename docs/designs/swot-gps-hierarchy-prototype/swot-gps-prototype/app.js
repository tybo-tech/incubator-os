(() => {
  const root = document.getElementById('incubatorHierarchyMock');
  if (!root) return;

  root.querySelectorAll('.ios-swot-head').forEach(button => {
    button.addEventListener('click', () => {
      const item = button.closest('.ios-swot');
      const open = item.classList.toggle('open');
      button.setAttribute('aria-expanded', String(open));
    });
  });

  root.querySelectorAll('.ios-task input').forEach(box => {
    box.addEventListener('change', () => box.closest('.ios-task').classList.toggle('done', box.checked));
  });

  root.querySelectorAll('.ios-tab[data-page]').forEach(tab => {
    tab.addEventListener('click', () => {
      root.querySelectorAll('.ios-tab[data-page]').forEach(t => t.classList.remove('active'));
      root.querySelectorAll('.ios-page').forEach(page => page.classList.remove('active'));
      tab.classList.add('active');
      const target = root.querySelector('#' + tab.dataset.page);
      if (target) target.classList.add('active');
    });
  });
})();

if (window.lucide) {
  window.lucide.createIcons({ attrs: { width: 16, height: 16 } });
}
