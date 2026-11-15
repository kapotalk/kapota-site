(function () {
  const WORKER_URL = "https://kapota-newsletter.sigakapota.workers.dev";

  // Inscrição: manda o email pro Worker e escreve a resposta em `msg`.
  async function inscreve(email, msg, form) {
    msg.textContent = "Enviando...";
    try {
      const res = await fetch(`${WORKER_URL}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        msg.textContent = data.error || "Não deu pra cadastrar, tenta de novo.";
        return;
      }
      msg.textContent =
        data.status === "already-confirmed"
          ? "Você já está inscrito."
          : "Quase lá. Confirma no email que acabamos de te mandar.";
      if (data.status !== "already-confirmed") form.reset();
    } catch {
      msg.textContent = "Não deu pra cadastrar, tenta de novo.";
    }
  }

  // Site novo (identidade Virada): os formulários já estão na página.
  function ligaFormularios(forms) {
    forms.forEach((form) => {
      const msg = form.nextElementSibling;
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        inscreve(form.querySelector('input[type="email"]').value, msg, form);
      });
    });
  }

  // Página no formato antigo: injeta o bloco antes do rodapé.
  function buildWidget() {
    const wrap = document.createElement("div");
    wrap.className = "nl-widget";
    wrap.innerHTML = `
      <style>
        .nl-widget { background:#0a0a0a; color:#fff; border-top:1px solid rgba(255,255,255,0.14); padding:2.4rem 0; }
        .nl-widget .nl-wrap { max-width:900px; margin:0 auto; padding:0 1.5rem; }
        .nl-widget h3 { font-family:"Space Grotesk", ui-sans-serif, sans-serif; font-size:1.15rem; margin:0 0 0.4rem; }
        .nl-widget p { font-family:"JUST Sans", -apple-system, sans-serif; color:#9a9a9a; font-size:0.92rem; margin:0 0 1rem; }
        .nl-widget form { display:flex; gap:0.6rem; flex-wrap:wrap; }
        .nl-widget input[type="email"] { flex:1; min-width:200px; padding:0.7rem 1rem; border-radius:999px; border:1px solid rgba(255,255,255,0.2); background:transparent; color:#fff; font-size:0.92rem; }
        .nl-widget button { padding:0.7rem 1.4rem; border-radius:999px; border:none; background:#ff5a1f; color:#0a0a0a; font-weight:700; font-family:"Space Grotesk", sans-serif; font-size:0.9rem; cursor:pointer; }
        .nl-widget .nl-msg { margin-top:0.7rem; font-size:0.85rem; }
      </style>
      <div class="nl-wrap">
        <h3>Toda segunda, 8h, o resumo da semana no seu email.</h3>
        <p>Deixa seu email e recebe o que saiu na Leitura de Mercado.</p>
        <form class="nl-form">
          <input type="email" class="nl-email" placeholder="seu@email.com" required>
          <button type="submit">Assinar</button>
        </form>
        <div class="nl-msg" aria-live="polite"></div>
      </div>`;
    return wrap;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const forms = document.querySelectorAll("form[data-kp-newsletter]");
    if (forms.length) {
      ligaFormularios(forms);
      return;
    }
    const footer = document.querySelector("footer");
    if (!footer || footer.previousElementSibling?.classList?.contains("nl-widget")) return;
    const widget = buildWidget();
    footer.parentNode.insertBefore(widget, footer);
    const form = widget.querySelector(".nl-form");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      inscreve(widget.querySelector(".nl-email").value, widget.querySelector(".nl-msg"), form);
    });
  });
})();
