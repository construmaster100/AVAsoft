/* ==========================================================================
   Música de fondo ("Iron Arena") — loop en volumen bajo, compartida entre
   index.html (login) y pages/cancha.html. La ruta al audio se calcula a
   partir de la propia URL de este script (document.currentScript) porque
   cada página lo referencia con una base relativa distinta ("assets/js/..."
   desde la raíz, "../assets/js/..." desde pages/).

   Los navegadores bloquean el autoplay con sonido sin gesto del usuario, y
   cada documento nuevo (por ejemplo al navegar de index.html a
   pages/cancha.html) exige su propio gesto — el que se hizo en la página
   anterior no cuenta. Por eso primero se intenta reproducir directo, y si
   el navegador lo bloquea, se arranca en el primer click/tecla de esa
   página.
   ========================================================================== */
(() => {
  const scriptSrc = document.currentScript.src;
  const base = scriptSrc.slice(0, scriptSrc.lastIndexOf("assets/js/"));
  const musica = new Audio(`${base}assets/audio/Iron%20Arena.mp3`);
  musica.loop = true;
  musica.volume = 0.25;

  musica.play().catch(() => {
    const iniciar = () => {
      musica.play().catch(() => {});
      document.removeEventListener("pointerdown", iniciar);
      document.removeEventListener("keydown", iniciar);
    };
    document.addEventListener("pointerdown", iniciar, { once: true });
    document.addEventListener("keydown", iniciar, { once: true });
  });
})();
