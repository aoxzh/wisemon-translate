(function() {
  const OPEN_CLASS = 'is-open';

  function optionText(option) {
    return option ? (option.textContent || '').trim() : '';
  }

  function selectedOption(select) {
    return select.options[select.selectedIndex] || select.options[0] || null;
  }

  function closeAll(except) {
    document.querySelectorAll('.wm-select.' + OPEN_CLASS).forEach(function(node) {
      if (node !== except) node.classList.remove(OPEN_CLASS);
    });
  }

  function build(select) {
    if (!select || select.dataset.customSelectReady === 'true') return;
    select.dataset.customSelectReady = 'true';
    select.classList.add('wm-native-select');

    const root = document.createElement('div');
    root.className = 'wm-select';
    root.dataset.selectId = select.id || '';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'wm-select-button';
    button.setAttribute('aria-haspopup', 'listbox');
    button.setAttribute('aria-expanded', 'false');

    const value = document.createElement('span');
    value.className = 'wm-select-value';
    button.appendChild(value);

    const arrow = document.createElement('span');
    arrow.className = 'wm-select-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    button.appendChild(arrow);

    const menu = document.createElement('div');
    menu.className = 'wm-select-menu';
    menu.setAttribute('role', 'listbox');

    root.appendChild(button);
    root.appendChild(menu);
    select.insertAdjacentElement('afterend', root);

    function refresh() {
      const current = selectedOption(select);
      value.textContent = optionText(current);
      menu.innerHTML = '';
      Array.prototype.forEach.call(select.options, function(option) {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'wm-select-option';
        item.textContent = optionText(option);
        item.dataset.value = option.value;
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', String(option.selected));
        if (option.disabled) item.disabled = true;
        if (option.selected) item.classList.add('is-selected');
        item.addEventListener('click', function() {
          if (select.value !== option.value) {
            select.value = option.value;
            select.dispatchEvent(new Event('input', { bubbles: true }));
            select.dispatchEvent(new Event('change', { bubbles: true }));
          }
          root.classList.remove(OPEN_CLASS);
          button.setAttribute('aria-expanded', 'false');
          refresh();
        });
        menu.appendChild(item);
      });
    }

    button.addEventListener('click', function() {
      const isOpen = root.classList.contains(OPEN_CLASS);
      closeAll(root);
      root.classList.toggle(OPEN_CLASS, !isOpen);
      button.setAttribute('aria-expanded', String(!isOpen));
    });

    button.addEventListener('keydown', function(event) {
      if (event.key === 'Escape') {
        root.classList.remove(OPEN_CLASS);
        button.setAttribute('aria-expanded', 'false');
      }
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        closeAll(root);
        root.classList.add(OPEN_CLASS);
        button.setAttribute('aria-expanded', 'true');
      }
    });

    select.addEventListener('change', refresh);
    select.addEventListener('input', refresh);
    root.__wmRefresh = refresh;
    refresh();
  }

  function initAll(root) {
    (root || document).querySelectorAll('select:not([data-native-select])').forEach(build);
    refreshAll(root);
  }

  function refreshAll(root) {
    (root || document).querySelectorAll('.wm-select').forEach(function(node) {
      if (typeof node.__wmRefresh === 'function') node.__wmRefresh();
    });
  }

  document.addEventListener('click', function(event) {
    if (!event.target.closest('.wm-select')) closeAll();
  });

  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') closeAll();
  });

  globalThis.CustomSelect = { initAll, refreshAll };
})();
