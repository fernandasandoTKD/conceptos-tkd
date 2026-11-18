document.addEventListener('DOMContentLoaded', function () {
  initNavToggle();
  initSmoothScrollClose();
  initImageFallbacks();
  initImageZoom();
  setFooterYear();
});

/**
 * Visor de imágenes: al tocar/clicar una imagen se abre ampliada.
 * - Móvil: pellizco para zoom, arrastrar para mover, doble toque para alternar.
 * - Escritorio: rueda del ratón, arrastrar, doble clic, botones +/−, Esc para cerrar.
 */
function initImageZoom() {
  var MIN = 1, MAX = 5;
  var overlay = document.createElement('div');
  overlay.className = 'lightbox';
  overlay.hidden = true;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Imagen ampliada');
  overlay.innerHTML =
    '<div class="lightbox-toolbar">' +
      '<button type="button" data-act="out" aria-label="Alejar">−</button>' +
      '<button type="button" data-act="in" aria-label="Acercar">+</button>' +
      '<button type="button" data-act="reset" aria-label="Restablecer">⟲</button>' +
      '<button type="button" data-act="close" aria-label="Cerrar">✕</button>' +
    '</div>' +
    '<div class="lightbox-stage"><img class="lightbox-img" alt="" draggable="false"></div>';
  document.body.appendChild(overlay);

  var stage = overlay.querySelector('.lightbox-stage');
  var big = overlay.querySelector('.lightbox-img');
  var lastFocus = null;
  var scale = 1, tx = 0, ty = 0;
  var pointers = new Map();
  var pinchStart = null, dragMoved = false, lastTap = 0;

  function apply() {
    big.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
    stage.classList.toggle('is-zoomed', scale > 1);
  }

  function clamp() {
    var maxX = (big.offsetWidth * scale - stage.clientWidth) / 2;
    var maxY = (big.offsetHeight * scale - stage.clientHeight) / 2;
    tx = maxX > 0 ? Math.max(-maxX, Math.min(maxX, tx)) : 0;
    ty = maxY > 0 ? Math.max(-maxY, Math.min(maxY, ty)) : 0;
  }

  // Zoom manteniendo fijo el punto (cx, cy) en coordenadas de pantalla.
  function zoomAt(newScale, cx, cy) {
    newScale = Math.max(MIN, Math.min(MAX, newScale));
    var rect = stage.getBoundingClientRect();
    var px = cx - (rect.left + rect.width / 2);
    var py = cy - (rect.top + rect.height / 2);
    var ratio = newScale / scale;
    tx = px - (px - tx) * ratio;
    ty = py - (py - ty) * ratio;
    scale = newScale;
    if (scale === 1) { tx = 0; ty = 0; }
    clamp();
    apply();
  }

  function zoomCenter(factor) {
    var rect = stage.getBoundingClientRect();
    zoomAt(scale * factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  function open(src, alt) {
    lastFocus = document.activeElement;
    big.src = src;
    big.alt = alt || '';
    scale = 1; tx = 0; ty = 0; apply();
    overlay.hidden = false;
    document.body.classList.add('lightbox-open');
    overlay.querySelector('[data-act="close"]').focus();
  }

  function close() {
    overlay.hidden = true;
    big.removeAttribute('src');
    pointers.clear();
    document.body.classList.remove('lightbox-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  // Abrir desde cualquier imagen de contenido (clic, toque o teclado).
  document.querySelectorAll('img.tech-img').forEach(function (img) {
    var wrap = document.createElement('div');
    wrap.className = 'img-wrap';
    img.parentNode.insertBefore(wrap, img);
    wrap.appendChild(img);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'zoom-btn';
    btn.setAttribute('aria-label', 'Ampliar imagen: ' + img.alt);
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
      '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21M10.5 7.5v6M7.5 10.5h6"/></svg>';
    wrap.appendChild(btn);

    function openThis() { open(img.currentSrc || img.src, img.alt); }
    img.classList.add('is-zoomable');
    img.addEventListener('click', openThis);
    btn.addEventListener('click', openThis);

    // Si la imagen falla y se muestra el placeholder, no hay nada que ampliar.
    img.addEventListener('error', function () { btn.remove(); }, { once: true });
  });

  overlay.querySelector('.lightbox-toolbar').addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    var act = btn.getAttribute('data-act');
    if (act === 'close') close();
    else if (act === 'in') zoomCenter(1.5);
    else if (act === 'out') zoomCenter(1 / 1.5);
    else if (act === 'reset') { scale = 1; tx = 0; ty = 0; apply(); }
  });

  document.addEventListener('keydown', function (e) {
    if (overlay.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === '+' || e.key === '=') zoomCenter(1.5);
    else if (e.key === '-') zoomCenter(1 / 1.5);
    else if (e.key === '0') { scale = 1; tx = 0; ty = 0; apply(); }
  });

  stage.addEventListener('wheel', function (e) {
    e.preventDefault();
    zoomAt(scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX, e.clientY);
  }, { passive: false });

  function dist() {
    var p = Array.from(pointers.values());
    return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
  }

  stage.addEventListener('pointerdown', function (e) {
    stage.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragMoved = false;
    if (pointers.size === 2) pinchStart = { d: dist(), s: scale };
  });

  stage.addEventListener('pointermove', function (e) {
    var p = pointers.get(e.pointerId);
    if (!p) return;
    var dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;

    if (pointers.size === 2 && pinchStart) {
      var pts = Array.from(pointers.values());
      zoomAt(pinchStart.s * dist() / pinchStart.d,
             (pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
      dragMoved = true;
    } else if (pointers.size === 1 && scale > 1) {
      if (Math.abs(dx) + Math.abs(dy) > 0) dragMoved = true;
      tx += dx; ty += dy;
      clamp();
      apply();
    }
  });

  function endPointer(e) {
    if (!pointers.has(e.pointerId)) return;
    var wasSingle = pointers.size === 1;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchStart = null;
    if (e.type !== 'pointerup' || !wasSingle || dragMoved) return;

    var onImage = e.target === big;
    var now = Date.now();
    if (onImage && now - lastTap < 300) {            // doble toque / doble clic
      zoomAt(scale > 1 ? 1 : 2.5, e.clientX, e.clientY);
      lastTap = 0;
    } else {
      lastTap = now;
      if (!onImage && scale === 1) close();           // toque en el fondo cierra
    }
  }
  stage.addEventListener('pointerup', endPointer);
  stage.addEventListener('pointercancel', endPointer);
}

/**
 * Menú hamburguesa: abre/cierra la navegación en pantallas móviles.
 */
function initNavToggle() {
  var toggle = document.getElementById('navToggle');
  var menu = document.getElementById('navMenu');

  if (!toggle || !menu) return;

  toggle.addEventListener('click', function () {
    var isOpen = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });
}

/**
 * Cierra el menú móvil al seleccionar un enlace, para que el usuario
 * vea de inmediato la sección a la que navegó.
 */
function initSmoothScrollClose() {
  var menu = document.getElementById('navMenu');
  var toggle = document.getElementById('navToggle');
  if (!menu || !toggle) return;

  var links = menu.querySelectorAll('.nav-link');
  links.forEach(function (link) {
    link.addEventListener('click', function () {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

/**
 * Sustituye cualquier imagen rota por un placeholder estilizado,
 * conservando la relación de aspecto para no romper el layout.
 */
function initImageFallbacks() {
  var images = document.querySelectorAll('img.tech-img');

  images.forEach(function (img) {
    img.addEventListener('error', function () {
      var placeholder = document.createElement('div');
      placeholder.className = 'img-placeholder';
      placeholder.setAttribute('role', 'img');
      placeholder.setAttribute('aria-label', img.alt);
      placeholder.textContent = img.alt;
      img.replaceWith(placeholder);
    }, { once: true });
  });
}

/**
 * Año dinámico en el footer.
 */
function setFooterYear() {
  var yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
}
