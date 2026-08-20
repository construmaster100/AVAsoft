/* ==========================================================
   SENA · Página principal — interacciones del carrusel
========================================================== */

document.addEventListener('DOMContentLoaded', () => {

  const slides = Array.from(document.querySelectorAll('.hero-slide'));
  const dotsContainers = Array.from(document.querySelectorAll('[data-dots]'));
  const prevBtn = document.getElementById('heroPrev');
  const nextBtn = document.getElementById('heroNext');

  if (!slides.length) return;

  let current = slides.findIndex(s => s.classList.contains('active'));
  if (current < 0) current = 0;

  let autoplayTimer = null;
  const AUTOPLAY_MS = 7000;

  /* ---- construir los puntos indicadores (una copia por slide) ---- */
  dotsContainers.forEach(container => {
    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.setAttribute('aria-label', 'Ir a la diapositiva ' + (i + 1));
      if (i === current) dot.classList.add('active');
      dot.addEventListener('click', () => goTo(i));
      container.appendChild(dot);
    });
  });

  function updateUI() {
    slides.forEach((s, i) => s.classList.toggle('active', i === current));
    dotsContainers.forEach(container => {
      container.querySelectorAll('button').forEach((d, i) => d.classList.toggle('active', i === current));
    });
  }

  function goTo(index) {
    current = ((index % slides.length) + slides.length) % slides.length;
    updateUI();
    restartAutoplay();
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  function restartAutoplay() {
    if (autoplayTimer) clearInterval(autoplayTimer);
    autoplayTimer = setInterval(next, AUTOPLAY_MS);
  }

  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);

  restartAutoplay();
});
