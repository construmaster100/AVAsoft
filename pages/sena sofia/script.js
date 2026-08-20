/* ==========================================================
   SofiaPlus · Ingreso Usuarios Registrados — interacciones
========================================================== */

/* ---- 1. Lista de imágenes del carrusel ----
   Coloca tus fotos en «fotos de fondo» con el prefijo «sld».
   con estos nombres (o agrega más líneas siguiendo el patrón). */
/* Los fondos son los archivos con prefijo «sld» de la carpeta
   «fotos de fondo». Añadir uno nuevo es sumarlo a esta lista. */
const SLIDES = [
  'fotos de fondo/sldcocina.JPG',
  'fotos de fondo/sldelectronico.JPG',
  'fotos de fondo/sldmotor.JPG'
];

const SLIDE_INTERVAL_MS = 6000; // tiempo que cada imagen permanece visible

document.addEventListener('DOMContentLoaded', () => {

  /* ---- Construir el carrusel de fondo ---- */
  const carousel = document.getElementById('bgCarousel');
  let current = 0;

  if (carousel && SLIDES.length) {
    SLIDES.forEach((src, i) => {
      const slide = document.createElement('div');
      slide.className = 'bg-slide' + (i === 0 ? ' active' : '');
      slide.style.backgroundImage = `url("${src}")`;
      carousel.appendChild(slide);
    });

    if (SLIDES.length > 1) {
      setInterval(() => {
        const slides = carousel.querySelectorAll('.bg-slide');
        slides[current].classList.remove('active');
        current = (current + 1) % slides.length;
        slides[current].classList.add('active');
      }, SLIDE_INTERVAL_MS);
    }
  }

  /* ---- Mostrar / ocultar contraseña ---- */
  const togglePass = document.getElementById('togglePass');
  const password = document.getElementById('password');

  if (togglePass && password) {
    togglePass.addEventListener('click', () => {
      const isText = password.type === 'text';
      password.type = isText ? 'password' : 'text';
      togglePass.classList.toggle('is-visible', !isText);
    });
  }

  /* ---- Validación simple del formulario ---- */
  const loginForm = document.getElementById('loginForm');
  const docNumber = document.getElementById('docNumber');
  const errorMsg = document.getElementById('errorMsg');

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const hasDoc = docNumber.value.trim().length > 0;
      const hasPass = password.value.trim().length > 0;

      if (!hasDoc || !hasPass) {
        errorMsg.hidden = false;
        (hasDoc ? password : docNumber).focus();
        return;
      }

      errorMsg.hidden = true;
      console.log('Intento de ingreso:', {
        tipoDocumento: document.getElementById('docType').value,
        numeroDocumento: docNumber.value.trim()
      });
      // Aquí se conectaría con el endpoint real de autenticación de SofiaPlus.
      alert('Formulario listo para conectar con el servicio de autenticación.');
    });
  }

});
