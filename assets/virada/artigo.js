/* Página de artigo: carrega o corpo real (data/artigos/<slug>.html), monta sumário,
   destaca o "O que isso muda", barra de leitura, copiar trecho, vizinhos e relacionados. */
(function () {
  "use strict";
  const { posts, url, urlSerie, noAr, urlReal, esc, slug } = KpBlog;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const campo = (n) => $(`[data-art="${n}"]`);
  const SETA = '<svg viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M1 7h12M8 2l5 5-5 5" stroke="currentColor" stroke-width="1.6"/></svg>';


  // no ar o slug vem da própria página (estática); no mock, de ?s=
  const pedido = noAr ? document.body.dataset.slug : new URLSearchParams(location.search).get("s");
  const post = posts.find((p) => p.s === pedido) || posts[0];
  const real = urlReal(post);

  /* ---------- Cabeçalho ---------- */
  // no ar o cabeçalho já vem pronto no HTML (gerado pelo scripts/generate-site.mjs do site)
  if (!noAr) {
    document.title = `${post.t} · Klysman Kley`;
    campo("titulo").textContent = post.t;
    const serieLink = campo("serie-link");
    serieLink.textContent = post.c;
    serieLink.href = urlSerie(post.serieSlug);
    campo("data").textContent = post.d;
    campo("tempo").textContent = `${post.min} min de leitura`;
  }
  campo("whatsapp").href = `https://wa.me/?text=${encodeURIComponent(`${post.t} ${real}`)}`;
  campo("linkedin").href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(real)}`;
  campo("x").href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(post.t)}&url=${encodeURIComponent(real)}`;

  const aviso = campo("aviso");
  let tAviso;
  const avisa = (t) => { aviso.textContent = t; aviso.classList.add("is-visivel"); clearTimeout(tAviso); tAviso = setTimeout(() => aviso.classList.remove("is-visivel"), 1800); };
  const copia = (texto, msg) => (navigator.clipboard ? navigator.clipboard.writeText(texto) : Promise.reject()).then(() => avisa(msg), () => avisa("Não deu pra copiar"));
  campo("copiar").addEventListener("click", () => copia(real, "Link copiado"));

  /* ---------- Vizinhos e relacionados ---------- */
  const anterior = posts[post.i + 1];
  const proximo = posts[post.i - 1];
  campo("vizinhos").innerHTML = [
    anterior ? `<div class="kp-vizinho"><span class="kp-meta">← Anterior · ${esc(anterior.c)}</span><strong><a href="${url(anterior)}">${esc(anterior.t)}</a></strong></div>` : "<div></div>",
    proximo ? `<div class="kp-vizinho kp-vizinho--prox"><span class="kp-meta">Mais recente · ${esc(proximo.c)} →</span><strong><a href="${url(proximo)}">${esc(proximo.t)}</a></strong></div>` : "<div></div>"
  ].join("");

  const daSerie = posts.filter((p) => p.serieSlug === post.serieSlug && p !== post);
  const rel = daSerie.slice(0, 3);
  posts.forEach((p) => { if (rel.length < 3 && p !== post && !rel.includes(p)) rel.push(p); });
  campo("serie-nome").textContent = daSerie.length ? post.serie : "do blog";
  campo("serie-todos").href = urlSerie(post.serieSlug);
  campo("relacionados").innerHTML = rel.map((p, i) => `
    <article class="kp-artigo" data-kp-revela style="--kp-atraso:${i * 90}ms">
      <div class="kp-artigo__meta"><span class="kp-meta kp-acento">${esc(p.c)}</span><span class="kp-meta">${p.dia} ${p.mesCurto}</span></div>
      <h3 class="kp-artigo__titulo"><a href="${url(p)}">${esc(p.t)}</a></h3>
      <p class="kp-artigo__resumo">${esc(p.e)}</p>
      <span class="kp-artigo__seta">${SETA}</span>
    </article>`).join("");

  /* ---------- Corpo ---------- */
  const corpo = campo("corpo");
  const sumario = campo("sumario");
  let titulos = [];

  function prepara() {
    // ids e sumário
    titulos = $$("h2", corpo);
    titulos.forEach((h, i) => { h.id = `${String(i + 1).padStart(2, "0")}-${slug(h.textContent).slice(0, 48)}`; });
    sumario.innerHTML = titulos.map((h) => `<li><a href="#${h.id}">${esc(h.textContent)}</a></li>`).join("");

    // "O que isso muda" vira bloco próprio, até antes das fontes
    const muda = titulos.find((h) => /^o que (isso|essa|esse) muda/i.test(h.textContent.trim()));
    if (muda) {
      const bloco = document.createElement("div");
      bloco.className = "kp-muda";
      muda.before(bloco);
      let n = muda;
      while (n && !(n.classList && n.classList.contains("sources"))) { const prox = n.nextElementSibling; bloco.appendChild(n); n = prox; }
    }

    // fontes mostram o domínio
    $$(".sources a", corpo).forEach((a) => {
      try { a.insertAdjacentHTML("beforeend", ` <small>${esc(new URL(a.href).hostname.replace(/^www\./, ""))}</small>`); } catch (e) {}
    });

    // frase de destaque acende a barra quando entra na tela
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-dentro"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -20% 0px" });
    $$(".pull", corpo).forEach((p) => io.observe(p));
  }

  if (noAr) prepara(); // corpo já veio no HTML
  else fetch(`../data/artigos/${encodeURIComponent(post.s)}.html`)
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then((html) => { corpo.innerHTML = html; prepara(); })
    .catch(() => { corpo.innerHTML = `<p class="lead">${esc(post.e)}</p><p>O corpo deste artigo não foi encontrado no mock. Rode <code>node tools/importar-blog.mjs</code> de novo.</p>`; });

  /* ---------- Progresso de leitura e sumário ativo ---------- */
  const barra = $("[data-kp-progresso-leitura]");
  const pct = campo("pct");
  function leitura() {
    const r = corpo.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight * 0.35 - r.top) / (r.height - innerHeight * 0.3)));
    barra.style.transform = `scaleX(${p})`;
    pct.textContent = `${Math.round(p * 100)}% lido`;
    let ativo = null;
    titulos.forEach((h) => { if (h.getBoundingClientRect().top < innerHeight * 0.4) ativo = h.id; });
    $$("a", sumario).forEach((a) => a.classList.toggle("is-ativo", a.getAttribute("href") === `#${ativo}`));
    requestAnimationFrame(leitura);
  }
  requestAnimationFrame(leitura);

  /* ---------- Copiar trecho selecionado ---------- */
  const trecho = campo("trecho");
  let textoTrecho = "";
  corpo.addEventListener("mouseup", () => {
    setTimeout(() => {
      const sel = getSelection();
      const t = sel ? sel.toString().trim() : "";
      if (t.length < 20 || !corpo.contains(sel.anchorNode)) { trecho.classList.remove("is-visivel"); return; }
      const r = sel.getRangeAt(0).getBoundingClientRect();
      textoTrecho = t;
      trecho.style.left = `${r.left + r.width / 2 + scrollX}px`;
      trecho.style.top = `${r.top + scrollY - 12}px`;
      trecho.classList.add("is-visivel");
    }, 10);
  });
  document.addEventListener("mousedown", (e) => { if (e.target !== trecho) trecho.classList.remove("is-visivel"); });
  trecho.addEventListener("click", () => {
    copia(`“${textoTrecho}” (Klysman Kley, ${real})`, "Trecho copiado com o link");
    trecho.classList.remove("is-visivel");
    getSelection().removeAllRanges();
  });

  /* ---------- Newsletter simulada ---------- */
  // no ar quem cuida é o /assets/newsletter.js do site
  if (!KpBlog.noAr) $$("[data-kp-newsletter]").forEach((f) => f.addEventListener("submit", (e) => {
    e.preventDefault();
    f.nextElementSibling.textContent = "Pronto. Você está na lista (simulação do mock).";
    f.reset();
  }));
})();
