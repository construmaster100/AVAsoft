// Login de demo con dos cuentas fijas, validadas en el cliente porque
// todavía no existe auth.routes.js. La cuenta que coincide decide el
// "slot" (playerOne / playerTwo) — el servidor de sockets usa ese mismo
// slot para asignar el personaje correcto y rechazar que dos dispositivos
// entren como el mismo jugador a la vez.
const ACCOUNTS = [
  { slot: "playerOne", user: "jugador 1", pass: "contraseña 1", displayName: "Jugador 1" },
  { slot: "playerTwo", user: "jugador 2", pass: "contraseña 2", displayName: "Jugador 2" },
];

const form = document.getElementById("login-form");
const errorEl = document.getElementById("form-error");
const userInput = document.getElementById("player-user");
const passInput = document.getElementById("player-pass");

function normalize(str) { return str.trim().toLowerCase(); }

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const user = normalize(userInput.value);
  const pass = passInput.value;
  const account = ACCOUNTS.find((a) => a.user === user && a.pass === pass);

  if (!account) {
    showError("Usuario o contraseña incorrectos.");
    passInput.focus();
    return;
  }

  errorEl.hidden = true;

  // --- placeholder de autenticación (reemplazar por el backend real) ---
  sessionStorage.setItem("mySlot", account.slot);
  sessionStorage.setItem("myName", account.displayName);
  // ------------------------------------------------------------------

  window.location.href = "../game/game.html";
});
