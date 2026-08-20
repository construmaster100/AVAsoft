/* ==========================================================
   BETOWA · SENA — interacciones
========================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* ---- Cerrar aviso "Importante" ---- */
  const noticeBar = document.getElementById('noticeBar');
  const noticeClose = document.getElementById('noticeClose');

  if (noticeClose && noticeBar) {
    noticeClose.addEventListener('click', () => {
      noticeBar.classList.add('hidden');
    });
  }

  /* ---- Formulario de búsqueda ---- */
  const searchForm = document.getElementById('searchForm');
  const searchQuery = document.getElementById('searchQuery');
  const searchLocation = document.getElementById('searchLocation');

  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = searchQuery.value.trim();
      const location = searchLocation.value;

      if (!query) {
        searchQuery.focus();
        return;
      }

      console.log('Buscando programa:', { query, location });
      // Aquí se conectaría con el endpoint real de búsqueda de Betowa.
      alert(
        'Buscando: "' + query + '"' +
        (location ? '  ·  Ubicación: ' + searchLocation.selectedOptions[0].textContent : '')
      );
    });
  }

  /* ---- Botón de accesibilidad (placeholder de menú) ---- */
  const a11yBtn = document.getElementById('a11yBtn');
  if (a11yBtn) {
    a11yBtn.addEventListener('click', () => {
      alert('Panel de accesibilidad (contraste, tamaño de fuente, lector de pantalla).');
    });
  }


  /* ---- Carrusel de avisos ---- */
  const pista = document.getElementById('carruselPista');
  const puntos = document.getElementById('carruselPuntos');

  if (pista && puntos) {
    const total = pista.children.length;
    let actual = 0;
    let reloj = null;

    for (let i = 0; i < total; i++) {
      const punto = document.createElement('button');
      punto.type = 'button';
      punto.className = 'carrusel-punto';
      punto.setAttribute('role', 'tab');
      punto.setAttribute('aria-label', 'Aviso ' + (i + 1));
      punto.addEventListener('click', () => { ir(i); reiniciar(); });
      puntos.appendChild(punto);
    }

    function ir(indice) {
      actual = (indice + total) % total;
      pista.style.transform = 'translateX(-' + (actual * 100) + '%)';
      Array.from(puntos.children).forEach((p, i) => {
        p.setAttribute('aria-selected', String(i === actual));
      });
    }

    function reiniciar() {
      clearInterval(reloj);
      reloj = setInterval(() => ir(actual + 1), 6500);
    }

    const prev = document.getElementById('carruselPrev');
    const next = document.getElementById('carruselNext');
    if (prev) prev.addEventListener('click', () => { ir(actual - 1); reiniciar(); });
    if (next) next.addEventListener('click', () => { ir(actual + 1); reiniciar(); });

    /* Se detiene mientras el puntero esta encima */
    const marco = pista.parentElement;
    marco.addEventListener('mouseenter', () => clearInterval(reloj));
    marco.addEventListener('mouseleave', reiniciar);

    ir(0);
    reiniciar();
  }


});
