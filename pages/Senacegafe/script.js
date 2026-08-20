/* ==========================================================
   SENA CEGAFE · Plantilla — interacciones
========================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* ---- Menú de navegación con desplegables ---- */
  const navToggle = document.getElementById('navToggle');
  const navList = document.getElementById('navList');
  const conMenu = Array.from(document.querySelectorAll('.tiene-menu'));

  const cerrarTodos = (excepto) => {
    conMenu.forEach(li => {
      if (li === excepto) return;
      li.classList.remove('abierto');
      const padre = li.querySelector('.menu-padre');
      if (padre) padre.setAttribute('aria-expanded', 'false');
    });
  };

  /* Hamburguesa: abre y cierra la lista entera */
  if (navToggle && navList) {
    navToggle.addEventListener('click', () => {
      const abierta = navList.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(abierta));
      if (!abierta) cerrarTodos(null);
    });
  }

  /* Cada padre despliega el suyo y cierra los demás.
     Se intercepta el clic porque el destino real está en el
     primer ítem del desplegable; así el padre nunca navega
     antes de que se vea lo que contiene. */
  conMenu.forEach(li => {
    const padre = li.querySelector('.menu-padre');
    if (!padre) return;

    padre.addEventListener('click', (e) => {
      e.preventDefault();
      const abierto = li.classList.contains('abierto');
      cerrarTodos(li);
      li.classList.toggle('abierto', !abierto);
      padre.setAttribute('aria-expanded', String(!abierto));
    });
  });

  /* Los enlaces finales sí navegan: cierran todo al pulsarse */
  document.querySelectorAll('.nav-list a:not(.menu-padre)').forEach(enlace => {
    enlace.addEventListener('click', () => {
      cerrarTodos(null);
      if (navList) navList.classList.remove('open');
      if (navToggle) navToggle.setAttribute('aria-expanded', 'false');

      document.querySelectorAll('.nav-list a').forEach(a => a.classList.remove('active'));
      const raiz = enlace.closest('.tiene-menu');
      (raiz ? raiz.querySelector('.menu-padre') : enlace).classList.add('active');
    });
  });

  /* Escape cierra; un clic fuera también */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrarTodos(null);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.site-nav')) cerrarTodos(null);
  });

  /* ---- Carrusel de avisos ---- */
  const pista = document.getElementById('slidesPista');
  const puntos = document.getElementById('slidesPuntos');

  if (pista && puntos) {
    const total = pista.children.length;
    let actual = 0;
    let reloj = null;

    /* Un punto por aviso */
    for (let i = 0; i < total; i++) {
      const punto = document.createElement('button');
      punto.type = 'button';
      punto.className = 'slides-punto';
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
      reloj = setInterval(() => ir(actual + 1), 6000);
    }

    const prev = document.getElementById('slidesPrev');
    const next = document.getElementById('slidesNext');
    if (prev) prev.addEventListener('click', () => { ir(actual - 1); reiniciar(); });
    if (next) next.addEventListener('click', () => { ir(actual + 1); reiniciar(); });

    /* Se detiene mientras el puntero está encima: no arrastra al lector */
    const marco = pista.parentElement;
    marco.addEventListener('mouseenter', () => clearInterval(reloj));
    marco.addEventListener('mouseleave', reiniciar);

    ir(0);
    reiniciar();
  }


});
