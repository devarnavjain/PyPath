// Shared split-pane resizing logic for lesson/challenge pages
// Used for both horizontal (lesson panel / editor) and vertical (editor / output) splits

function makeDivider(container, orientation, beforeEl) {
  const div = document.createElement('div');
  div.className = 'split-divider split-divider-' + orientation;
  container.insertBefore(div, beforeEl || null);
  return div;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getSize(el, orientation) {
  return orientation === 'horizontal' ? el.offsetWidth : el.offsetHeight;
}

function setFlexBasis(el, value, orientation) {
  const dim = orientation === 'horizontal' ? 'width' : 'height';
  el.style.flexBasis = value + 'px';
  el.style.minWidth = '0';
  el.style.minHeight = '0';
}

function getContainerSize(container, orientation) {
  const rect = container.getBoundingClientRect();
  return orientation === 'horizontal' ? rect.width : rect.height;
}

function makeSplit(container, firstEl, secondEl, orientation, options) {
  const opts = Object.assign({
    minFirst: 320,
    minSecond: 80,
    initialRatio: 0.5,
    dividerSize: 4,
  }, options);

  const divider = makeDivider(container, orientation, secondEl);
  divider.style.cursor = orientation === 'horizontal' ? 'col-resize' : 'row-resize';

  const total = getContainerSize(container, orientation);
  const firstSize = total * opts.initialRatio;
  const secondSize = total - firstSize - opts.dividerSize;

  setFlexBasis(firstEl, firstSize, orientation);
  setFlexBasis(secondEl, secondSize, orientation);

  let isDragging = false;

  function onDragStart(e) {
    isDragging = true;
    divider.classList.add('split-divider-active');
    document.body.style.userSelect = 'none';
    document.body.style.cursor = orientation === 'horizontal' ? 'col-resize' : 'row-resize';

    const onDrag = (ev) => {
      if (!isDragging) return;
      const containerRect = container.getBoundingClientRect();
      let pos;
      if (orientation === 'horizontal') {
        pos = ev.clientX - containerRect.left;
      } else {
        pos = ev.clientY - containerRect.top;
      }

      const totalSize = getContainerSize(container, orientation);
      const dividerOffset = getSize(firstEl, orientation);
      const newFirstSize = clamp(pos, opts.minFirst, totalSize - opts.minSecond - opts.dividerSize);

      const newSecondSize = totalSize - newFirstSize - opts.dividerSize;

      setFlexBasis(firstEl, newFirstSize, orientation);
      setFlexBasis(secondEl, newSecondSize, orientation);
    };

    const onDragEnd = () => {
      isDragging = false;
      divider.classList.remove('split-divider-active');
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', onDrag);
      document.removeEventListener('mouseup', onDragEnd);
    };

    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', onDragEnd);
  }

  divider.addEventListener('mousedown', onDragStart);

  // Return a cleanup function
  return function cleanup() {
    divider.removeEventListener('mousedown', onDragStart);
    divider.remove();
  };
}

export function makeHorizontalSplit(container, leftEl, rightEl, options) {
  container.style.display = 'flex';
  container.style.flexDirection = 'row';
  container.style.overflow = 'hidden';
  return makeSplit(container, leftEl, rightEl, 'horizontal', options);
}

export function makeVerticalSplit(container, topEl, bottomEl, options) {
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.overflow = 'hidden';
  return makeSplit(container, topEl, bottomEl, 'vertical', options);
}
