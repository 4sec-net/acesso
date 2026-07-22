// ===== Ano no rodapé =====
document.getElementById("year").textContent = new Date().getFullYear();

// ===== Menu mobile =====
const navToggle = document.getElementById("navToggle");
const nav = document.getElementById("nav");

navToggle.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  navToggle.classList.toggle("open", open);
  navToggle.setAttribute("aria-expanded", String(open));
});

// Fecha o menu ao clicar em um link
nav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("open");
    navToggle.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  });
});

// ===== Animação dos contadores de estatísticas =====
const counters = document.querySelectorAll(".stat b[data-count]");

const animateCount = (el) => {
  const target = parseFloat(el.dataset.count);
  const suffix = el.dataset.suffix || "";
  const isFloat = !Number.isInteger(target);
  const duration = 1400;
  const start = performance.now();

  const tick = (now) => {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
    const value = target * eased;
    el.textContent = (isFloat ? value.toFixed(1) : Math.round(value)) + suffix;
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = (isFloat ? target.toFixed(1) : target) + suffix;
  };
  requestAnimationFrame(tick);
};

if ("IntersectionObserver" in window) {
  const obs = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );
  counters.forEach((c) => obs.observe(c));
} else {
  counters.forEach(animateCount);
}

// ===== Reveal on scroll =====
const revealEls = document.querySelectorAll(
  ".card, .plan, .value, .feature-list li, .stat"
);
revealEls.forEach((el) => {
  el.style.opacity = "0";
  el.style.transform = "translateY(16px)";
  el.style.transition = "opacity .5s ease, transform .5s ease";
});

if ("IntersectionObserver" in window) {
  const revObs = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          setTimeout(() => {
            el.style.opacity = "1";
            el.style.transform = "none";
          }, (i % 6) * 60);
          observer.unobserve(el);
        }
      });
    },
    { threshold: 0.15 }
  );
  revealEls.forEach((el) => revObs.observe(el));
} else {
  revealEls.forEach((el) => {
    el.style.opacity = "1";
    el.style.transform = "none";
  });
}

// ===== Validação do formulário de contato =====
const form = document.getElementById("contactForm");
const note = document.getElementById("formNote");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const nome = form.nome.value.trim();
  const email = form.email.value.trim();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!nome || !emailOk) {
    note.style.color = "#f87171";
    note.textContent = "Por favor, preencha seu nome e um e-mail válido.";
    return;
  }

  note.style.color = "";
  note.textContent = `Obrigado, ${nome.split(" ")[0]}! Recebemos sua mensagem e entraremos em contato em breve. ✅`;
  form.reset();
});
