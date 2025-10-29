(function () {
  const MAX_INACTIVIDAD_MINUTOS = 10;
  const LIMITE_MS = MAX_INACTIVIDAD_MINUTOS * 60 * 1000;
  let temporizador;

  const reiniciarTemporizador = () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => {
      localStorage.removeItem("usuario");
      alert("Sesión finalizada por inactividad");
      window.location.href = "index.html";
    }, LIMITE_MS);
  };

  ["mousemove", "keydown", "click", "scroll"].forEach(evento => {
    window.addEventListener(evento, reiniciarTemporizador);
  });

  reiniciarTemporizador();
})();
