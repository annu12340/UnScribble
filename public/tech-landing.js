// Scroll progress & nav (shared pattern with landing.js)
const updateProgress = () => {
  const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = documentHeight > 0 ? (window.scrollY / documentHeight) * 100 : 0;
  document.querySelector(".progress-bar").style.width = `${progress}%`;
};

const updateNav = () => {
  const nav = document.querySelector(".nav");
  if (!nav) return;
  nav.classList.toggle("scrolled", window.scrollY > 50);
};

window.addEventListener("scroll", () => {
  updateProgress();
  updateNav();
});

const observeVisible = (selector, className = "visible", threshold = 0.2) => {
  const nodes = document.querySelectorAll(selector);
  if (!nodes.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add(className);
      });
    },
    { threshold }
  );

  nodes.forEach((node) => observer.observe(node));
};

const observeChapters = () => {
  observeVisible(".chapter", "visible", 0.15);
};

const animateFlowNodes = () => {
  const nodes = document.querySelectorAll(".flowchart-svg [data-animate]");
  if (!nodes.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const delay = Number(el.dataset.delay || 0);
        setTimeout(() => el.classList.add("flow-visible"), delay);
      });
    },
    { threshold: 0.25 }
  );

  nodes.forEach((node) => observer.observe(node));
};

document.addEventListener("DOMContentLoaded", () => {
  observeChapters();
  observeVisible(".magic-item", "visible", 0.25);
  observeVisible(".agent-card", "visible", 0.2);
  observeVisible(".algo-item", "visible", 0.2);
  observeVisible(".sse-event", "visible", 0.3);
  observeVisible(".arch-layer", "visible", 0.3);
  animateFlowNodes();
  updateProgress();
  updateNav();
});
