/**
 * Educational 3D body-region map for medication effects (Three.js r128 compatible).
 */

const REGION_LABELS = {
  head: "Head",
  neck: "Neck / thyroid",
  chest: "Chest",
  abdomen: "Abdomen",
  kidneys: "Kidneys",
  limbs: "Arms & legs",
};

const VIEWER_INSTANCE_KEY = "__body3dViewer";

/**
 * @param {HTMLElement} mapEl
 * @param {{ regions?: string[], organs?: string[], summary?: string, uncertain?: boolean }} bodyEffects
 */
export function renderBodyMap(mapEl, bodyEffects) {
  if (!mapEl) return;

  const active = new Set(bodyEffects?.regions || []);
  const regionKeys = ["head", "neck", "chest", "abdomen", "kidneys", "limbs"];

  if (mapEl[VIEWER_INSTANCE_KEY]) {
    mapEl[VIEWER_INSTANCE_KEY].dispose();
    mapEl[VIEWER_INSTANCE_KEY] = null;
  }

  mapEl.innerHTML = `
    <div class="body-map-canvas" role="img" aria-label="3D body model with highlighted affected regions"></div>
    <ul class="body-map-legend" aria-hidden="true">
      ${regionKeys
        .map(
          (id) =>
            `<li class="${active.has(id) ? "is-active" : ""}"><span class="body-map-dot"></span>${REGION_LABELS[id]}</li>`
        )
        .join("")}
    </ul>
  `;

  const canvasEl = mapEl.querySelector(".body-map-canvas");
  if (!canvasEl) return;

  if (typeof THREE === "undefined") {
    canvasEl.innerHTML =
      '<p class="body-effects-loading">3D viewer unavailable (Three.js not loaded).</p>';
    return;
  }

  try {
    mapEl[VIEWER_INSTANCE_KEY] = new Body3DViewer(canvasEl, active);
  } catch (error) {
    console.error("Body3DViewer failed:", error);
    canvasEl.innerHTML =
      '<p class="body-effects-loading">Could not load 3D body model.</p>';
  }
}

/** CapsuleGeometry is not in Three r128 — build from cylinder + spheres. */
function makeCapsule(radius, length, material) {
  const group = new THREE.Group();
  const shaft = Math.max(0.05, length - radius * 2);
  const cyl = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, shaft, 14, 1),
    material
  );
  const top = new THREE.Mesh(new THREE.SphereGeometry(radius, 14, 12), material);
  top.position.y = shaft / 2;
  const bottom = new THREE.Mesh(new THREE.SphereGeometry(radius, 14, 12), material);
  bottom.position.y = -shaft / 2;
  group.add(cyl, top, bottom);
  return group;
}

class Body3DViewer {
  /**
   * @param {HTMLElement} container
   * @param {Set<string>} activeRegions
   */
  constructor(container, activeRegions) {
    this.container = container;
    this.activeRegions = activeRegions;
    this.frameId = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.modelGroup = null;
    this.resizeObserver = null;
    this.controls = null;
    this.disposed = false;
    requestAnimationFrame(() => this.initWhenReady());
  }

  initWhenReady() {
    if (this.disposed) return;

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width < 24 || height < 24) {
      requestAnimationFrame(() => this.initWhenReady());
      return;
    }

    try {
      this.init();
    } catch (error) {
      console.error("Body3DViewer init failed:", error);
      this.container.innerHTML =
        '<p class="body-effects-loading">3D model failed to load.</p>';
    }
  }

  init() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xeafaf1);

    this.camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 100);
    this.camera.position.set(0, 0.15, 7.4);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0xeafaf1, 1);

    this.container.innerHTML = "";
    this.container.appendChild(this.renderer.domElement);

    if (typeof THREE.OrbitControls !== "undefined") {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enablePan = false;
      this.controls.minDistance = 5.2;
      this.controls.maxDistance = 9.5;
      this.controls.maxPolarAngle = Math.PI * 0.58;
      this.controls.minPolarAngle = Math.PI * 0.35;
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.08;
    }

    this.setupLights();
    this.buildModel();
    this.animate();

    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(this.container);
  }

  setupLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 0.65);
    key.position.set(3, 8, 6);
    const fill = new THREE.DirectionalLight(0xa7f3d0, 0.45);
    fill.position.set(-4, 2, 5);
    this.scene.add(key, fill);
  }

  buildModel() {
    const inactive = new THREE.MeshPhongMaterial({
      color: 0xb8c5d4,
      shininess: 28,
      flatShading: false,
    });
    const active = new THREE.MeshPhongMaterial({
      color: 0x10b981,
      emissive: 0x047857,
      emissiveIntensity: 0.35,
      shininess: 40,
    });

    const mat = (region) =>
      this.activeRegions.has(region) ? active.clone() : inactive.clone();

    this.modelGroup = new THREE.Group();

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.68, 24, 20), mat("head"));
    head.position.y = 2.12;

    const neck = makeCapsule(0.2, 0.5, mat("neck"));
    neck.position.y = 1.34;

    const chest = makeCapsule(0.78, 1.35, mat("chest"));
    chest.position.y = 0.38;

    const abdomen = makeCapsule(0.66, 1.05, mat("abdomen"));
    abdomen.position.y = -0.88;

    const kidneyMat = mat("kidneys");
    const kidneyL = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 14), kidneyMat);
    kidneyL.scale.set(1, 1.3, 0.75);
    kidneyL.position.set(-0.44, -0.52, 0.32);
    const kidneyR = kidneyL.clone();
    kidneyR.position.x = 0.44;

    const limbMat = mat("limbs");
    const armL = makeCapsule(0.16, 1.5, limbMat);
    armL.position.set(-1.02, 0.32, 0);
    armL.rotation.z = 0.12;
    const armR = makeCapsule(0.16, 1.5, limbMat);
    armR.position.set(1.02, 0.32, 0);
    armR.rotation.z = -0.12;

    const legL = makeCapsule(0.19, 1.7, limbMat);
    legL.position.set(-0.34, -2.32, 0);
    const legR = makeCapsule(0.19, 1.7, limbMat);
    legR.position.set(0.34, -2.32, 0);

    this.modelGroup.add(
      head,
      neck,
      chest,
      abdomen,
      kidneyL,
      kidneyR,
      armL,
      armR,
      legL,
      legR
    );
    this.modelGroup.rotation.y = -0.2;
    this.modelGroup.position.y = -0.12;

    this.scene.add(this.modelGroup);
  }

  animate() {
    if (this.disposed) return;
    this.frameId = requestAnimationFrame(() => this.animate());
    if (this.modelGroup) this.modelGroup.rotation.y += 0.005;
    if (this.controls) this.controls.update();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  onResize() {
    if (!this.renderer || !this.camera) return;
    const width = Math.max(24, this.container.clientWidth);
    const height = Math.max(24, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  dispose() {
    this.disposed = true;
    if (this.frameId) cancelAnimationFrame(this.frameId);
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.controls) this.controls.dispose();
    if (this.renderer) this.renderer.dispose();
  }
}

/**
 * @param {HTMLElement} organsEl
 * @param {HTMLElement} summaryEl
 * @param {{ organs?: string[], summary?: string, uncertain?: boolean }} bodyEffects
 */
export function renderBodyEffectsText(organsEl, summaryEl, bodyEffects) {
  if (summaryEl) {
    summaryEl.textContent = bodyEffects?.summary || "";
    summaryEl.classList.toggle("is-uncertain", Boolean(bodyEffects?.uncertain));
  }

  if (!organsEl) return;

  const organs = bodyEffects?.organs || [];
  if (!organs.length) {
    organsEl.innerHTML = "";
    return;
  }

  organsEl.innerHTML = organs
    .map((name) => `<li class="body-effects-organ">${escapeHtml(name)}</li>`)
    .join("");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
