/* ══════════════════════════════════════════
   SOFIA Plus — Acordeón Sidebar
   SENA CEGAFE · Tunja 2026
══════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  const botones = document.querySelectorAll('.sidebar-menu .menu-btn');

  botones.forEach(btn => {
    btn.addEventListener('click', () => {
      const estaAbierto = btn.getAttribute('aria-expanded') === 'true';

      // Cerrar todos los demás (comportamiento acordeón: solo uno abierto)
      botones.forEach(otro => {
        otro.setAttribute('aria-expanded', 'false');
        otro.closest('li').classList.remove('active');
        const sub = otro.nextElementSibling;
        if (sub) {
          sub.style.maxHeight = null;
          sub.style.opacity  = '0';
        }
      });

      // Si no estaba abierto, abrir este
      if (!estaAbierto) {
        btn.setAttribute('aria-expanded', 'true');
        btn.closest('li').classList.add('active');
        const submenu = btn.nextElementSibling;
        if (submenu) {
          submenu.style.maxHeight = submenu.scrollHeight + 'px';
          submenu.style.opacity   = '1';
        }
      }
    });
  });

});
