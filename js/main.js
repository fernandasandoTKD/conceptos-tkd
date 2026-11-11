document.addEventListener('DOMContentLoaded', function () {
  initNavToggle();
  initSmoothScrollClose();
  initImageFallbacks();
  setFooterYear();
});

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
