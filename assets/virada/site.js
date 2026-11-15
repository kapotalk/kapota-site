/* Home do mock: radar com posts reais, formulários simulados.
   Roda antes do Kapota.inicia (que espera o DOMContentLoaded). */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  // no ar (kapota.com.br) a página vem com <html data-kp-site>
  const NO_AR = document.documentElement.hasAttribute("data-kp-site");
  const WORKER = "https://kapota-newsletter.sigakapota.workers.dev";
  const SETA = '<svg viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M1 7h12M8 2l5 5-5 5" stroke="currentColor" stroke-width="1.6"/></svg>';

  /* ---------- Hero: luz laranja segue o mouse ---------- */
  const hero = $("[data-kp-hero]");
  if (hero) {
    hero.addEventListener("mousemove", (e) => {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty("--mx", `${e.clientX - r.left}px`);
      hero.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
    // a luz mora no filho; repassa as variáveis
    const luz = $(".kp-hero__luz", hero);
    hero.addEventListener("mousemove", () => {
      luz.style.setProperty("--mx", hero.style.getPropertyValue("--mx"));
      luz.style.setProperty("--my", hero.style.getPropertyValue("--my"));
    });
  }

  /* ---------- Radar com posts reais ---------- */
  const radar = $("[data-kp-radar]");
  if (radar && window.KP_POSTS) {
    $$("[data-kp-total-posts]").forEach((el) => (el.textContent = KP_POSTS.length));
    const [d, ...resto] = KP_POSTS;
    const url = (p) => (NO_AR ? `/blog/${p.s}/` : `artigo.html?s=${encodeURIComponent(p.s)}`);
    radar.innerHTML = `
      <article class="kp-artigo kp-artigo--destaque" data-kp-revela data-kp-cursor="Ler">
        <div class="kp-artigo__meta"><span class="kp-tag kp-tag--brasa">${esc(d.c)}</span><span class="kp-meta">${esc(d.d)}</span></div>
        <h3 class="kp-artigo__titulo"><a href="${url(d)}">${esc(d.t)}</a></h3>
        <p class="kp-artigo__resumo">${esc(d.e)}</p>
        <span class="kp-artigo__seta">${SETA}</span>
      </article>
      <div class="kp-radar__lista">
        ${resto.slice(0, 4).map((p, i) => `
          <article class="kp-artigo" data-kp-revela style="--kp-atraso:${(i + 1) * 90}ms">
            <div>
              <div class="kp-artigo__meta"><span class="kp-meta kp-acento">${esc(p.c)}</span><span class="kp-meta">${esc(p.d)}</span></div>
              <h3 class="kp-artigo__titulo"><a href="${url(p)}">${esc(p.t)}</a></h3>
            </div>
            <span class="kp-artigo__seta">${SETA}</span>
          </article>`).join("")}
      </div>`;
  }

  /* ---------- Formulários ---------- */
  // newsletter: no ar quem cuida é o /assets/newsletter.js do site; aqui só simula
  if (!NO_AR) $$("[data-kp-newsletter]").forEach((f) => f.addEventListener("submit", (e) => {
    e.preventDefault();
    const estado = f.nextElementSibling;
    if (estado) estado.textContent = "Pronto. Você está na lista (simulação do mock).";
    f.reset();
  }));
  const contato = $("[data-kp-contato]");
  // contato: no ar grava no banco do Worker (vai pro painel de audiência); no mock só simula
  if (contato) contato.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!contato.checkValidity()) { contato.reportValidity(); return; }
    if (!NO_AR) { contato.classList.add("is-enviado"); return; }
    const erro = $("[data-kp-contato-erro]", contato);
    const botao = $("button[type=submit]", contato);
    const valor = (s) => ($(s, contato).value || "").trim();
    erro.textContent = "Enviando...";
    botao.disabled = true;
    try {
      const r = await fetch(`${WORKER}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: valor("#c-nome"), email: valor("#c-email"), assunto: valor("#c-assunto"), mensagem: valor("#c-msg"), site: valor("[data-kp-contato-mel]") })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { erro.textContent = d.error || "Não deu pra enviar agora. Tenta de novo em um instante."; return; }
      erro.textContent = "";
      contato.classList.add("is-enviado");
    } catch {
      erro.textContent = "Não deu pra enviar agora. Confere a internet e tenta de novo.";
    } finally {
      botao.disabled = false;
    }
  });
})();
