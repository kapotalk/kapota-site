/* Lista do blog: séries, busca, agrupamento por mês, carregar mais, prévia no mouse.
   Estado na URL (?serie=&q=) pra link direto de série funcionar. */
(function () {
  "use strict";
  const { posts, series, url, esc, semAcento, desde } = KpBlog;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const SETA = '<svg viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M1 7h12M8 2l5 5-5 5" stroke="currentColor" stroke-width="1.6"/></svg>';
  const PASSO = 20;

  const elSeries = $("[data-kp-series]");
  const elBusca = $("[data-kp-busca]");
  const elLista = $("[data-kp-lista]");
  const elDestaques = $("[data-kp-destaques]");
  const elContagem = $("[data-kp-contagem]");
  const elVazio = $("[data-kp-vazio]");
  const elMais = $("[data-kp-mais]");

  $$("[data-kp-total]").forEach((el) => { el.textContent = posts.length; el.closest("[data-kp-conta]").dataset.kpConta = posts.length; });
  $$("[data-kp-desde]").forEach((el) => (el.textContent = desde));

  const params = new URLSearchParams(location.search);
  // série renomeada: link antigo continua caindo no lugar certo
  const RENOMEADAS = { "radar-de-noticias": "se-atualize", "leitura-estrategica": "se-atualize", "radar-da-semana": "resumo-da-semana", "modelo-mental": "nota-mental", "mentalize": "nota-mental", "frase-comentada": "pensa-nisso", "frase-do-dia": "pensa-nisso" };
  const pedida = params.get("serie") || "todas";
  const estado = { serie: RENOMEADAS[pedida] || pedida, q: params.get("q") || "", mostrando: PASSO };
  elBusca.value = estado.q;

  /* ---------- Chips de série ---------- */
  elSeries.innerHTML = [`<button class="kp-tag" data-serie="todas">Todas <small>${posts.length}</small></button>`]
    .concat(series.map((s) => `<button class="kp-tag" data-serie="${s.slug}">${esc(s.nome)} <small>${s.total}</small></button>`))
    .join("");
  const chips = $$("[data-serie]", elSeries);

  /* ---------- Destaques: o mais novo + o mais novo de duas outras séries ---------- */
  function destaques() {
    const [a] = posts;
    const outros = [];
    for (const p of posts) {
      if (p.serie === a.serie || outros.some((o) => o.serie === p.serie)) continue;
      outros.push(p);
      if (outros.length === 2) break;
    }
    const card = (p, grande) => `
      <article class="kp-artigo kp-artigo--destaque" data-kp-cursor="Ler">
        <div class="kp-artigo__meta"><span class="kp-tag ${grande ? "kp-tag--brasa" : ""}">${esc(p.c)}</span><span class="kp-meta">${p.dia} ${p.mesCurto} · ${p.min} min</span></div>
        <h2 class="kp-artigo__titulo"><a href="${url(p)}">${esc(p.t)}</a></h2>
        ${grande ? `<p class="kp-artigo__resumo">${esc(p.e)}</p>` : ""}
        <span class="kp-artigo__seta">${SETA}</span>
      </article>`;
    elDestaques.innerHTML = `${card(a, true)}<div class="kp-destaques__lado">${outros.map((p) => card(p, false)).join("")}</div>`;
  }

  /* ---------- Filtro ---------- */
  const marca = (texto, termos) => {
    let html = esc(texto);
    if (!termos.length) return html;
    // marca cada termo ignorando acento: acha a posição no texto sem acento e recorta o original
    const base = semAcento(texto);
    const faixas = [];
    termos.forEach((t) => { let i = base.indexOf(t); while (i > -1) { faixas.push([i, i + t.length]); i = base.indexOf(t, i + t.length); } });
    if (!faixas.length) return html;
    faixas.sort((x, y) => x[0] - y[0]);
    let out = "", pos = 0;
    faixas.forEach(([a, b]) => { if (a < pos) return; out += esc(texto.slice(pos, a)) + "<mark>" + esc(texto.slice(a, b)) + "</mark>"; pos = b; });
    return out + esc(texto.slice(pos));
  };

  function filtrados() {
    const termos = semAcento(estado.q).split(/\s+/).filter((t) => t.length > 1);
    return {
      termos,
      lista: posts.filter((p) => (estado.serie === "todas" || p.serieSlug === estado.serie) && termos.every((t) => p.busca.includes(t)))
    };
  }

  let jaRenderizados = 0;
  function render(anima) {
    const { termos, lista } = filtrados();
    const visiveis = lista.slice(0, estado.mostrando);
    const filtrando = estado.serie !== "todas" || termos.length;

    chips.forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.serie === estado.serie)));
    elDestaques.style.display = filtrando ? "none" : "";
    elVazio.classList.toggle("is-visivel", lista.length === 0);
    $("[data-kp-termo]").textContent = `“${estado.q}”`;
    elContagem.textContent = lista.length ? `Mostrando ${visiveis.length} de ${lista.length} artigo${lista.length > 1 ? "s" : ""}` : "";
    elMais.style.display = visiveis.length < lista.length ? "" : "none";
    $("[data-kp-mais-barra]").style.transform = `scaleX(${lista.length ? visiveis.length / lista.length : 0})`;

    // agrupa por mês
    const grupos = [];
    visiveis.forEach((p) => {
      let g = grupos[grupos.length - 1];
      if (!g || g.chave !== p.mesChave) grupos.push((g = { chave: p.mesChave, nome: p.mesNome, itens: [] }));
      g.itens.push(p);
    });
    const totalMes = {};
    lista.forEach((p) => (totalMes[p.mesChave] = (totalMes[p.mesChave] || 0) + 1));

    let n = 0;
    elLista.innerHTML = grupos.map((g) => `
      <section class="kp-mes" aria-label="${esc(g.nome)}">
        <div class="kp-mes__titulo"><h2>${esc(g.nome)}</h2><span class="kp-meta">${totalMes[g.chave]} artigo${totalMes[g.chave] > 1 ? "s" : ""}</span></div>
        ${g.itens.map((p) => {
          const novo = anima === "tudo" || n++ >= jaRenderizados;
          return `
          <article class="kp-item${novo ? " is-novo" : ""}" style="--i:${novo ? n % PASSO : 0}" data-indice="${p.i}">
            <span class="kp-item__data"><b>${p.dia}</b>${p.mesCurto}</span>
            <span class="kp-item__serie">${esc(p.c)}</span>
            <h3 class="kp-item__titulo"><a href="${url(p)}">${marca(p.t, termos)}</a></h3>
            <span class="kp-item__tempo">${p.min} min</span>
            <span class="kp-artigo__seta">${SETA}</span>
          </article>`;
        }).join("")}
      </section>`).join("");
    jaRenderizados = visiveis.length;
  }

  function salvaUrl() {
    const p = new URLSearchParams();
    if (estado.serie !== "todas") p.set("serie", estado.serie);
    if (estado.q) p.set("q", estado.q);
    history.replaceState(null, "", `${location.pathname}${p.toString() ? "?" + p : ""}`);
  }

  chips.forEach((c) => c.addEventListener("click", () => {
    estado.serie = c.dataset.serie;
    estado.mostrando = PASSO;
    jaRenderizados = 0;
    salvaUrl();
    render("tudo");
    c.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }));
  let espera;
  elBusca.addEventListener("input", () => {
    clearTimeout(espera);
    espera = setTimeout(() => { estado.q = elBusca.value.trim(); estado.mostrando = PASSO; jaRenderizados = 0; salvaUrl(); render("tudo"); }, 140);
  });
  $("[data-kp-limpa]").addEventListener("click", () => { elBusca.value = ""; estado.q = ""; estado.serie = "todas"; salvaUrl(); render("tudo"); elBusca.focus(); });
  $("[data-kp-carrega]").addEventListener("click", () => { estado.mostrando += PASSO; render("novos"); });

  // "/" foca a busca, Esc limpa
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== elBusca && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); elBusca.focus(); }
    if (e.key === "Escape" && document.activeElement === elBusca && elBusca.value) { elBusca.value = ""; elBusca.dispatchEvent(new Event("input")); }
  });

  /* ---------- Prévia que segue o mouse ---------- */
  const previa = $(".kp-previa");
  if (window.matchMedia("(hover: hover)").matches && !Kapota.reduz) {
    let alvoX = 0, alvoY = 0, x = 0, y = 0, ativo = false;
    const meta = $('[data-previa="meta"]', previa), texto = $('[data-previa="texto"]', previa);
    elLista.addEventListener("mousemove", (e) => {
      alvoX = e.clientX + 28; alvoY = e.clientY + 28;
      const item = e.target.closest(".kp-item");
      if (!item) { previa.classList.remove("is-visivel"); return; }
      const p = posts[+item.dataset.indice];
      if (previa.dataset.atual !== String(p.i)) {
        previa.dataset.atual = p.i;
        meta.textContent = `${p.c} · ${p.min} min de leitura`;
        texto.textContent = p.e;
      }
      previa.classList.add("is-visivel");
      if (!ativo) { ativo = true; x = alvoX; y = alvoY; requestAnimationFrame(segue); }
    });
    elLista.addEventListener("mouseleave", () => previa.classList.remove("is-visivel"));
    function segue() {
      x += (alvoX - x) * 0.16; y += (alvoY - y) * 0.16;
      // não deixa sair pela direita nem por baixo
      const px = Math.min(x, innerWidth - previa.offsetWidth - 16);
      const py = Math.min(y, innerHeight - previa.offsetHeight - 16);
      previa.style.transform = `translate3d(${px}px, ${py}px, 0)`;
      requestAnimationFrame(segue);
    }
  }

  /* ---------- Newsletter simulada ---------- */
  // no ar quem cuida é o /assets/newsletter.js do site
  if (!KpBlog.noAr) $$("[data-kp-newsletter]").forEach((f) => f.addEventListener("submit", (e) => {
    e.preventDefault();
    f.nextElementSibling.textContent = "Pronto. Você está na lista (simulação do mock).";
    f.reset();
  }));

  destaques();
  render("tudo");
})();
