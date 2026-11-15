/* ==========================================================================
   Kapota DS "Virada" · motor de movimento
   Vanilla, sem dependência. Tudo é ativado por atributo data-kp-*.
   Expõe window.Kapota com as peças, pra vitrine e páginas reaproveitarem.
   Respeita prefers-reduced-motion: sem animação, conteúdo aparece pronto.
   ========================================================================== */
(function () {
  "use strict";

  const doc = document.documentElement;
  const reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const temMouse = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  doc.classList.add("kp-js");

  const $$ = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));
  const limita = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  const SETA = '<svg viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M1 7h12M8 2l5 5-5 5" stroke="currentColor" stroke-width="1.6"/></svg>';

  /* ---------- Quebra de texto ---------- */
  // Quebra em letras mantendo palavras inteiras (pra não quebrar linha no meio)
  function letras(el) {
    if (el.dataset.kpQuebrado) return $$(".kp-letra", el);
    const texto = el.textContent;
    el.setAttribute("aria-label", texto.trim());
    el.textContent = "";
    let i = 0;
    texto.split(/(\s+)/).forEach((pedaco) => {
      if (/^\s+$/.test(pedaco)) { el.appendChild(document.createTextNode(" ")); return; }
      if (!pedaco) return;
      const palavra = document.createElement("span");
      palavra.style.display = "inline-block";
      palavra.style.whiteSpace = "nowrap";
      palavra.setAttribute("aria-hidden", "true");
      for (const c of pedaco) {
        const s = document.createElement("span");
        s.className = "kp-letra";
        s.textContent = c;
        s.style.setProperty("--i", i++);
        palavra.appendChild(s);
      }
      el.appendChild(palavra);
    });
    el.dataset.kpQuebrado = "1";
    return $$(".kp-letra", el);
  }

  // Quebra em palavras preservando <em>, <strong> e .kp-acento como marcação
  function palavras(el) {
    if (el.dataset.kpQuebrado) return $$(".kp-palavra", el);
    const anda = (no, extra) => {
      Array.from(no.childNodes).forEach((filho) => {
        if (filho.nodeType === 3) {
          const frag = document.createDocumentFragment();
          filho.textContent.split(/(\s+)/).forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(" ")); return; }
            const s = document.createElement("span");
            s.className = "kp-palavra" + (extra ? " " + extra : "");
            s.textContent = p;
            frag.appendChild(s);
          });
          no.replaceChild(frag, filho);
        } else if (filho.nodeType === 1) {
          anda(filho, filho.classList.contains("kp-acento") ? "kp-acento" : extra);
        }
      });
    };
    anda(el, "");
    el.dataset.kpQuebrado = "1";
    return $$(".kp-palavra", el);
  }

  // Quebra em linhas visuais com máscara. Usa <br> ou data-kp-linhas="auto"
  function linhas(el) {
    if (el.dataset.kpQuebrado) return;
    const partes = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = partes
      .map((html, i) => `<span class="kp-linha-mascara"><span style="--i:${i}">${html.trim()}</span></span>`)
      .join("");
    el.dataset.kpQuebrado = "1";
  }

  /* ---------- Revelação na entrada da tela ---------- */
  // A quebra roda antes de tudo (em inicia), porque reescreve o HTML e as outras peças guardam referência aos nós
  function quebraTudo() {
    $$("[data-kp-linhas]").forEach(linhas);
    $$("[data-kp-capota]").forEach(letras);
  }
  function observaEntrada() {
    const alvos = $$("[data-kp-revela], [data-kp-capota], [data-kp-linhas]");
    if (reduz || !("IntersectionObserver" in window)) { alvos.forEach((a) => a.classList.add("is-dentro")); return; }
    const io = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-dentro"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.01 });
    alvos.forEach((a) => io.observe(a));
    return io;
  }

  /* ---------- Palavra que vira ---------- */
  // <span class="kp-vira" data-kp-vira="2400"><span>problemas</span><span>crise</span>...</span>
  function vira(el) {
    const itens = $$(":scope > span", el);
    if (itens.length < 2) return;
    let atual = 0;
    itens[0].classList.add("is-ativa");
    if (reduz) return;
    const intervalo = +el.dataset.kpVira || 2400;
    let timer = null;
    const passo = () => {
      const sai = itens[atual];
      atual = (atual + 1) % itens.length;
      sai.classList.remove("is-ativa");
      sai.classList.add("is-saindo");
      itens[atual].classList.remove("is-saindo");
      itens[atual].classList.add("is-ativa");
      setTimeout(() => sai.classList.remove("is-saindo"), 1100);
    };
    const liga = () => { if (!timer) timer = setInterval(passo, intervalo); };
    const desliga = () => { clearInterval(timer); timer = null; };
    new IntersectionObserver(([e]) => (e.isIntersecting ? liga() : desliga())).observe(el);
  }

  /* ---------- Texto que acende com o scroll ---------- */
  const acendiveis = [];
  function acende(el) { acendiveis.push({ el, palavras: palavras(el) }); }
  function atualizaAcende() {
    const h = window.innerHeight;
    acendiveis.forEach(({ el, palavras: ps }) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > h) return;
      const p = limita((h * 0.82 - r.top) / (r.height + h * 0.25), 0, 1);
      const n = Math.round(p * ps.length);
      ps.forEach((w, i) => w.classList.toggle("is-acesa", i < n));
    });
  }

  /* ---------- Contadores ---------- */
  // data-kp-conta="45" data-kp-prefixo="+" data-kp-sufixo=""
  function conta(el) {
    const alvo = parseFloat(el.dataset.kpConta);
    const casas = (el.dataset.kpConta.split(".")[1] || "").length;
    const fmt = (v) => v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
    const alvoTexto = el.querySelector("[data-kp-conta-alvo]") || el;
    if (reduz) { alvoTexto.textContent = fmt(alvo); return; }
    alvoTexto.textContent = fmt(0);
    new IntersectionObserver(([e], obs) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const t0 = performance.now();
      const dur = 1800;
      const tick = (t) => {
        const k = limita((t - t0) / dur, 0, 1);
        const ease = 1 - Math.pow(1 - k, 4);
        alvoTexto.textContent = fmt(alvo * ease);
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.6 }).observe(el);
  }

  /* ---------- Embaralha (scramble) no hover ---------- */
  const SIMBOLOS = "KAPOTA01#/\\<>_+*";
  function embaralha(el) {
    const original = el.textContent;
    let raf = null;
    const roda = () => {
      if (reduz) return;
      cancelAnimationFrame(raf);
      let quadro = 0;
      const total = original.length * 2 + 6;
      const passo = () => {
        el.textContent = original
          .split("")
          .map((c, i) => (c === " " ? " " : i < quadro / 2 ? original[i] : SIMBOLOS[(Math.random() * SIMBOLOS.length) | 0]))
          .join("");
        if (++quadro <= total) raf = requestAnimationFrame(passo);
        else el.textContent = original;
      };
      passo();
    };
    (el.closest("a, button") || el).addEventListener("mouseenter", roda);
    el._embaralha = roda;
  }

  /* ---------- Faixa corrida que reage à velocidade do scroll ---------- */
  const faixas = [];
  function faixa(el) {
    const trilho = el.querySelector(".kp-faixa__trilho");
    if (!trilho) return;
    // duplica o conteúdo até cobrir 2x a largura da tela
    const base = trilho.innerHTML;
    while (trilho.scrollWidth < window.innerWidth * 2.2) trilho.insertAdjacentHTML("beforeend", base);
    trilho.insertAdjacentHTML("beforeend", trilho.innerHTML);
    $$(".kp-faixa__item", trilho).forEach((it, i) => { if (i > 0) it.setAttribute("aria-hidden", "true"); });
    faixas.push({ trilho, x: 0, dir: el.dataset.kpFaixa === "direita" ? 1 : -1, vel: +(el.dataset.kpVel || 0.6) });
  }
  let velScroll = 0;
  function atualizaFaixas() {
    faixas.forEach((f) => {
      const metade = f.trilho.scrollWidth / 2;
      f.x += (f.vel + Math.abs(velScroll) * 0.08) * f.dir;
      if (f.x <= -metade) f.x += metade;
      if (f.x >= 0 && f.dir > 0) f.x -= metade;
      const inclina = limita(velScroll * 0.25, -8, 8);
      f.trilho.style.transform = `translate3d(${f.x}px,0,0) skewX(${-inclina * f.dir}deg)`;
    });
  }

  /* ---------- Seção horizontal presa (pin) ---------- */
  // <section data-kp-horizontal><div class="kp-horizontal__fixo"><div class="kp-horizontal__trilho">…
  const horizontais = [];
  function horizontal(el) {
    const trilho = el.querySelector("[data-kp-trilho]");
    if (!trilho) return;
    const mede = () => {
      if (window.innerWidth < 900 || reduz) { el.style.height = ""; trilho.style.transform = ""; el.classList.add("is-empilhado"); return; }
      el.classList.remove("is-empilhado");
      const extra = trilho.scrollWidth - window.innerWidth;
      el.style.height = `${window.innerHeight + extra}px`;
      el._extra = extra;
    };
    mede();
    window.addEventListener("resize", mede);
    horizontais.push({ el, trilho, barra: el.querySelector("[data-kp-progresso]") });
  }
  function atualizaHorizontais() {
    horizontais.forEach(({ el, trilho, barra }) => {
      if (el.classList.contains("is-empilhado")) return;
      const r = el.getBoundingClientRect();
      const p = limita(-r.top / (r.height - window.innerHeight), 0, 1);
      trilho.style.transform = `translate3d(${-p * el._extra}px,0,0)`;
      if (barra) barra.style.transform = `scaleX(${p})`;
      el.style.setProperty("--p", p.toFixed(4));
    });
  }

  /* ---------- Paralaxe simples ---------- */
  const paralaxes = [];
  function paralaxe(el) { paralaxes.push({ el, f: +(el.dataset.kpParalaxe || 0.15) }); }
  function atualizaParalaxe() {
    const h = window.innerHeight;
    paralaxes.forEach(({ el, f }) => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > h + 200) return;
      const c = r.top + r.height / 2 - h / 2;
      el.style.transform = `translate3d(0, ${(-c * f).toFixed(1)}px, 0)`;
    });
  }

  /* ---------- Laço único de scroll ---------- */
  let ultimoY = window.scrollY;
  let rodando = false;
  function quadro() {
    const y = window.scrollY;
    velScroll = lerp(velScroll, y - ultimoY, 0.2);
    ultimoY = y;
    atualizaAcende();
    atualizaHorizontais();
    atualizaParalaxe();
    atualizaFaixas();
    atualizaNav(y);
    requestAnimationFrame(quadro);
  }
  function ligaLaco() { if (rodando) return; rodando = true; requestAnimationFrame(quadro); }

  /* ---------- Navegação ---------- */
  let nav = null, secoesClaras = [];
  function atualizaNav(y) {
    if (!nav) return;
    nav.classList.toggle("is-solida", y > 40);
    if (!nav.classList.contains("is-fixa")) {
      if (y > 400 && velScroll > 1.5) nav.classList.add("is-escondida");
      else if (velScroll < -1.5 || y < 400) nav.classList.remove("is-escondida");
    }
    // fica clara quando está sobre seção clara
    const meio = 42;
    const clara = secoesClaras.some((s) => { const r = s.getBoundingClientRect(); return r.top <= meio && r.bottom >= meio; });
    nav.classList.toggle("is-clara", clara);
  }
  function iniciaNav() {
    nav = document.querySelector(".kp-nav");
    secoesClaras = $$(".kp-claro, .kp-brasa").filter((s) => !s.closest(".kp-nav, .kp-menu"));
    const botao = document.querySelector(".kp-nav__menu");
    const menu = document.querySelector(".kp-menu");
    if (botao && menu) {
      const alterna = (abre) => {
        botao.setAttribute("aria-expanded", String(abre));
        menu.classList.toggle("is-aberto", abre);
        menu.setAttribute("aria-hidden", String(!abre));
        nav.classList.toggle("is-fixa", abre);
        nav.style.color = abre ? "var(--kp-preto)" : "";
        document.body.style.overflow = abre ? "hidden" : "";
      };
      botao.addEventListener("click", () => alterna(botao.getAttribute("aria-expanded") !== "true"));
      $$("a", menu).forEach((a) => a.addEventListener("click", () => alterna(false)));
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") alterna(false); });
    }
  }

  /* ---------- Cursor e magnetismo ---------- */
  function iniciaCursor() {
    if (!temMouse || reduz) return;
    const ponto = document.createElement("div");
    const anel = document.createElement("div");
    ponto.className = "kp-cursor";
    anel.className = "kp-cursor-anel";
    anel.innerHTML = "<span></span>";
    document.body.append(ponto, anel);
    doc.classList.add("kp-tem-cursor");
    let mx = -100, my = -100, ax = -100, ay = -100;
    window.addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
    const segue = () => {
      ax = lerp(ax, mx, 0.18);
      ay = lerp(ay, my, 0.18);
      ponto.style.transform = `translate3d(${mx}px,${my}px,0)`;
      anel.style.transform = `translate3d(${ax}px,${ay}px,0)`;
      requestAnimationFrame(segue);
    };
    segue();
    const rotulo = anel.querySelector("span");
    document.addEventListener("mouseover", (e) => {
      const alvo = e.target.closest("[data-kp-cursor], a, button, input, textarea, select, label");
      anel.classList.remove("is-grande", "is-link");
      if (!alvo) return;
      if (alvo.dataset.kpCursor) { anel.classList.add("is-grande"); rotulo.textContent = alvo.dataset.kpCursor; }
      else anel.classList.add("is-link");
    });
    document.addEventListener("mouseleave", () => { mx = my = -100; });
  }

  function magnetico(el) {
    if (!temMouse || reduz) return;
    const forca = +(el.dataset.kpMagnetico || 0.35);
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate3d(${x * forca}px, ${y * forca}px, 0)`;
    });
    el.addEventListener("mouseleave", () => { el.style.transform = ""; });
  }

  /* ---------- Tipo que respira perto do mouse ---------- */
  // Cada letra ganha peso e largura conforme a distância do cursor (Bricolage é variável)
  const proximos = [];
  function proximidade(el) {
    if (!temMouse || reduz) return;
    const ls = letras(el);
    const min = +(el.dataset.kpPesoMin || 500), max = +(el.dataset.kpPesoMax || 800);
    proximos.push({ el, ls, min, max, alcance: +(el.dataset.kpAlcance || 260) });
  }
  function iniciaProximidade() {
    if (!proximos.length) return;
    let mx = -9999, my = -9999, ativo = false;
    window.addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY; if (!ativo) { ativo = true; requestAnimationFrame(passo); } }, { passive: true });
    function passo() {
      proximos.forEach(({ el, ls, min, max, alcance }) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) return;
        ls.forEach((l) => {
          const b = l.getBoundingClientRect();
          const d = Math.hypot(mx - (b.left + b.width / 2), my - (b.top + b.height / 2));
          const k = 1 - limita(d / alcance, 0, 1);
          const alvoPeso = min + (max - min) * k * k;
          const alvoLarg = 100 - 22 * k * k;
          l._p = lerp(l._p || min, alvoPeso, 0.2);
          l._w = lerp(l._w || 100, alvoLarg, 0.2);
          l.style.fontVariationSettings = `"wght" ${l._p.toFixed(0)}, "wdth" ${l._w.toFixed(1)}`;
        });
      });
      requestAnimationFrame(passo);
    }
  }

  /* ---------- Inclinação 3D ---------- */
  function inclina(el) {
    if (!temMouse || reduz) return;
    const max = +(el.dataset.kpInclina || 8);
    el.style.transformStyle = "preserve-3d";
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(1000px) rotateY(${x * max}deg) rotateX(${-y * max}deg)`;
      el.style.setProperty("--mx", `${(x + 0.5) * 100}%`);
      el.style.setProperty("--my", `${(y + 0.5) * 100}%`);
    });
    el.addEventListener("mouseleave", () => { el.style.transform = ""; });
  }

  /* ---------- Relógio de Campina Grande ---------- */
  function relogio(el) {
    const fmt = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "America/Fortaleza" });
    const tick = () => { el.textContent = fmt.format(new Date()); };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- Acordeão ---------- */
  function acordeao(raiz) {
    const botoes = $$("[aria-controls]", raiz);
    botoes.forEach((b) => b.addEventListener("click", () => {
      const abre = b.getAttribute("aria-expanded") !== "true";
      if (raiz.dataset.kpAcordeao === "um") botoes.forEach((o) => o.setAttribute("aria-expanded", "false"));
      b.setAttribute("aria-expanded", String(abre));
    }));
  }

  /* ---------- Campos de select com rótulo flutuante ---------- */
  function selects() {
    $$(".kp-campo select").forEach((s) => {
      const marca = () => s.classList.toggle("is-preenchido", !!s.value);
      s.addEventListener("change", marca);
      marca();
    });
  }

  /* ---------- Intro (uma vez por sessão) ---------- */
  function intro() {
    const el = document.querySelector(".kp-intro");
    if (!el) return Promise.resolve();
    let ja = false;
    try { ja = sessionStorage.getItem("kp-intro") === "1" || new URLSearchParams(location.search).has("sem-intro"); } catch (e) {}
    if (reduz || ja) { el.remove(); return Promise.resolve(); }
    document.body.style.overflow = "hidden";
    const palavra = el.querySelector(".kp-intro__palavra");
    letras(palavra);
    const cont = el.querySelector(".kp-intro__contador span");
    return new Promise((pronto) => {
      const t0 = performance.now(), dur = 1400;
      const tick = (t) => {
        const k = limita((t - t0) / dur, 0, 1);
        const e = 1 - Math.pow(1 - k, 3);
        el.style.setProperty("--p", e.toFixed(3));
        if (cont) cont.textContent = String(Math.round(e * 100)).padStart(3, "0");
        if (k < 1) return requestAnimationFrame(tick);
        el.classList.add("is-capotando");
        setTimeout(() => {
          el.classList.add("is-saindo");
          document.body.style.overflow = "";
          try { sessionStorage.setItem("kp-intro", "1"); } catch (e) {}
          pronto();
          setTimeout(() => el.remove(), 1200);
        }, 1150);
      };
      requestAnimationFrame(tick);
    });
  }

  /* ---------- Montagem ---------- */
  function seta() { return SETA; }

  function inicia() {
    quebraTudo();
    iniciaNav();
    $$("[data-kp-vira]").forEach(vira);
    $$("[data-kp-acende]").forEach(acende);
    $$("[data-kp-conta]").forEach(conta);
    $$("[data-kp-embaralha]").forEach(embaralha);
    $$("[data-kp-faixa]").forEach(faixa);
    $$("[data-kp-horizontal]").forEach(horizontal);
    $$("[data-kp-paralaxe]").forEach(paralaxe);
    $$("[data-kp-magnetico]").forEach(magnetico);
    $$("[data-kp-proximo]").forEach(proximidade);
    $$("[data-kp-inclina]").forEach(inclina);
    $$("[data-kp-relogio]").forEach(relogio);
    $$("[data-kp-acordeao]").forEach(acordeao);
    $$("[data-kp-seta]").forEach((el) => { el.innerHTML = SETA; });
    selects();
    iniciaCursor();
    iniciaProximidade();
    ligaLaco();
    intro().then(() => {
      observaEntrada();
      document.dispatchEvent(new CustomEvent("kp:pronto"));
    });
  }

  window.Kapota = { letras, palavras, linhas, embaralha, magnetico, inclina, conta, seta, reduz, inicia };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", inicia);
  else inicia();
})();
