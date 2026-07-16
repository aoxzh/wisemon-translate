(function() {
  const OPEN_CLASS = 'is-open';

  function optionText(option) {
    return option ? (option.textContent || '').trim() : '';
  }

  function selectedOption(select) {
    return select.options[select.selectedIndex] || select.options[0] || null;
  }

  function associatedLabelId(select) {
    if (!select.id) return '';
    const label = document.querySelector('label[for="' + select.id + '"]');
    if (label && label.id) return label.id;
    if (label) {
      const id = 'wm-label-' + select.id;
      label.id = id;
      return id;
    }
    return '';
  }

  function closeAll(except) {
    document.querySelectorAll('.wm-select.' + OPEN_CLASS).forEach(function(node) {
      if (node !== except) closeSelect(node);
    });
  }

  function closeSelect(root) {
    if (!root.classList.contains(OPEN_CLASS)) return;
    root.classList.remove(OPEN_CLASS);
    const button = root.querySelector('.wm-select-button');
    if (button) {
      button.setAttribute('aria-expanded', 'false');
      button.focus();
    }
  }

  function openSelect(root) {
    closeAll(root);
    root.classList.add(OPEN_CLASS);
    const button = root.querySelector('.wm-select-button');
    if (button) button.setAttribute('aria-expanded', 'true');
    const selected = root.querySelector('.wm-select-option.is-selected');
    const first = selected || root.querySelector('.wm-select-option:not([disabled])');
    if (first) {
      first.tabIndex = 0;
      first.focus();
    }
  }

  function getActiveOption(root) {
    return root.querySelector('.wm-select-option:focus');
  }

  function moveFocus(root, direction) {
    const options = Array.prototype.filter.call(
      root.querySelectorAll('.wm-select-option'),
      function(opt) { return !opt.disabled; }
    );
    const active = getActiveOption(root);
    let index = options.indexOf(active);
    if (index < 0) index = 0;
    if (direction === 'next') index = Math.min(options.length - 1, index + 1);
    else if (direction === 'prev') index = Math.max(0, index - 1);
    else if (direction === 'first') index = 0;
    else if (direction === 'last') index = options.length - 1;
    options.forEach(function(opt) { opt.tabIndex = -1; });
    const target = options[index];
    if (target) {
      target.tabIndex = 0;
      target.focus();
    }
  }

  function selectOption(root, select, optionEl) {
    if (!optionEl || optionEl.disabled) return;
    const value = optionEl.dataset.value;
    if (select.value !== value) {
      select.value = value;
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    closeSelect(root);
    refresh(root, select);
  }

  function refresh(root, select) {
    const current = selectedOption(select);
    const value = root.querySelector('.wm-select-value');
    if (value) value.textContent = optionText(current);
    const menu = root.querySelector('.wm-select-menu');
    if (!menu) return;
    menu.innerHTML = '';
    Array.prototype.forEach.call(select.options, function(option) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'wm-select-option';
      item.textContent = optionText(option);
      item.dataset.value = option.value;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(option.selected));
      item.tabIndex = -1;
      if (option.disabled) item.disabled = true;
      if (option.selected) item.classList.add('is-selected');
      item.addEventListener('click', function() {
        selectOption(root, select, item);
      });
      menu.appendChild(item);
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
    const labelId = associatedLabelId(select);
    if (labelId) button.setAttribute('aria-labelledby', labelId + ' ' + (button.id || (button.id = 'wm-sb-' + Math.random().toString(36).slice(2, 9))));

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

    button.addEventListener('click', function() {
      if (root.classList.contains(OPEN_CLASS)) {
        closeSelect(root);
      } else {
        openSelect(root);
      }
    });

    button.addEventListener('keydown', function(event) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openSelect(root);
      }
    });

    menu.addEventListener('keydown', function(event) {
      const active = getActiveOption(root);
      switch (event.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          event.preventDefault();
          moveFocus(root, 'next');
          break;
        case 'ArrowUp':
        case 'ArrowLeft':
          event.preventDefault();
          moveFocus(root, 'prev');
          break;
        case 'Home':
        case 'PageUp':
          event.preventDefault();
          moveFocus(root, 'first');
          break;
        case 'End':
        case 'PageDown':
          event.preventDefault();
          moveFocus(root, 'last');
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (active) selectOption(root, select, active);
          break;
        case 'Escape':
          event.preventDefault();
          closeSelect(root);
          break;
        case 'Tab':
          closeSelect(root);
          break;
        default:
          if (event.key.length === 1) {
            // Type-ahead: focus next option starting with the typed character.
            const char = event.key.toLowerCase();
            const options = Array.prototype.filter.call(
              root.querySelectorAll('.wm-select-option'),
              function(opt) { return !opt.disabled && opt.textContent.toLowerCase().startsWith(char); }
            );
            if (options[0]) {
              options.forEach(function(opt) { opt.tabIndex = -1; });
              options[0].tabIndex = 0;
              options[0].focus();
            }
          }
          break;
      }
    });

    select.addEventListener('change', function() { refresh(root, select); });
    select.addEventListener('input', function() { refresh(root, select); });
    root.__wmRefresh = function() { refresh(root, select); };
    refresh(root, select);
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
