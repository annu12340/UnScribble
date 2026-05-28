/**
 * Educational 3D body-region map (Three.js r128).
 * Stylized mannequin with region highlighting, hover, and legend sync.
 */

const REGION_LABELS = {
  head: "Head",
  neck: "Neck / thyroid",
  chest: "Chest",
  abdomen: "Abdomen",
  kidneys: "Kidneys",
  limbs: "Arms & legs",
};

const REGION_KEYS = ["head", "neck", "chest", "abdomen", "kidneys", "limbs"];

const VIEWER_INSTANCE_KEY = "__body3dViewer";

const SKIN = {
  base: 0xc9b5a8,
  hover: 0xd8ccc4,
  inactive: 0xb8a99c,
  active: 0x2dd4a8,
  activeEmissive: 0x047857,
  kidney: 0xb8907a,
};

/**
 * @param {HTMLElement} mapEl
 * @param {{ regions?: string[], organs?: string[], summary?: string, uncertain?: boolean }} bodyEffects
 */
export function renderBodyMap(mapEl, bodyEffects) {
  if (!mapEl) return;

  const active = new Set(bodyEffects?.regions || []);

  if (mapEl[VIEWER_INSTANCE_KEY]) {
    mapEl[VIEWER_INSTANCE_KEY].dispose();
    mapEl[VIEWER_INSTANCE_KEY] = null;
  }

  mapEl.innerHTML = `
    <div class="body-map-stage">
      <div class="body-map-canvas" role="img" aria-label="3D body model with highlighted affected regions"></div>
      <p class="body-map-hint" aria-hidden="true">Drag to rotate · scroll to zoom</p>
      <div class="body-map-tooltip" hidden></div>
    </div>
    <ul class="body-map-legend" role="list">
      ${REGION_KEYS.map(
        (id) =>
          `<li class="body-map-legend-item" data-region="${id}" tabindex="0" role="button" aria-pressed="${active.has(id)}">
            <span class="body-map-dot"></span>
            <span class="body-map-legend-label">${REGION_LABELS[id]}</span>
          </li>`
      ).join("")}
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
    const viewer = new Body3DViewer(canvasEl, active, mapEl);
    mapEl[VIEWER_INSTANCE_KEY] = viewer;
    wireLegend(mapEl, viewer);
  } catch (error) {
    console.error("Body3DViewer failed:", error);
    canvasEl.innerHTML =
      '<p class="body-effects-loading">Could not load 3D body model.</p>';
  }
}

function wireLegend(mapEl, viewer) {
  const items = mapEl.querySelectorAll(".body-map-legend-item");
  items.forEach((item) => {
    const region = item.getAttribute("data-region");
    item.classList.toggle("is-active", viewer.activeRegions.has(region));

    const activate = () => viewer.focusRegion(region);
    item.addEventListener("click", activate);
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activate();
      }
    });
  });
}

function makeCapsule(radius, length, material) {
  const group = new THREE.Group();
  const shaft = Math.max(0.04, length - radius * 2);
  const cyl = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 0.92, shaft, 16, 1),
    material
  );
  const capSegs = 18;
  const top = new THREE.Mesh(new THREE.SphereGeometry(radius, capSegs, 14), material);
  top.position.y = shaft / 2;
  const bottom = new THREE.Mesh(new THREE.SphereGeometry(radius, capSegs, 14), material);
  bottom.position.y = -shaft / 2;
  group.add(cyl, top, bottom);
  return group;
}

function latheFromPoints(profile, segments = 28) {
  const pts = profile.map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(pts, segments);
}

function tagPart(object, region) {
  object.userData.region = region;
  object.traverse((child) => {
    if (child.isMesh) {
      child.userData.region = region;
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return object;
}

class Body3DViewer {
  /**
   * @param {HTMLElement} container
   * @param {Set<string>} activeRegions
   * @param {HTMLElement} rootEl
   */
  constructor(container, activeRegions, rootEl) {
    this.container = container;
    this.rootEl = rootEl;
    this.activeRegions = activeRegions;
    this.focusedRegion = null;
    this.hoveredRegion = null;
    this.regionMeshes = new Map();
    this.materials = new Map();
    this.frameId = null;
    this.clock = new THREE.Clock();
    this.disposed = false;
    this.isDragging = false;
    this.autoRotate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.tooltipEl = rootEl?.querySelector(".body-map-tooltip") || null;

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
    this.scene.background = new THREE.Color(0xe8f6ef);
    this.scene.fog = new THREE.Fog(0xe8f6ef, 12, 22);

    this.camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 50);
    this.camera.position.set(0, 0.35, 6.2);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    this.container.innerHTML = "";
    this.container.appendChild(this.renderer.domElement);

    if (typeof THREE.OrbitControls !== "undefined") {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.target.set(0, 0.1, 0);
      this.controls.enablePan = false;
      this.controls.minDistance = 4.5;
      this.controls.maxDistance = 9;
      this.controls.maxPolarAngle = Math.PI * 0.55;
      this.controls.minPolarAngle = Math.PI * 0.32;
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.07;
      this.controls.addEventListener("start", () => {
        this.isDragging = true;
        this.autoRotate = false;
      });
      this.controls.addEventListener("end", () => {
        this.isDragging = false;
        window.setTimeout(() => {
          if (!this.isDragging) this.autoRotate = true;
        }, 4000);
      });
    }

    this.setupLights();
    this.buildModel();
    this.bindPointerEvents();
    this.animate();

    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(this.container);
  }

  setupLights() {
    this.scene.add(new THREE.HemisphereLight(0xf0fdf4, 0x94a3b8, 0.55));

    const key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(4, 9, 6);
    key.castShadow = true;
    key.shadow.mapSize.width = 1024;
    key.shadow.mapSize.height = 1024;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 24;
    key.shadow.camera.left = -4;
    key.shadow.camera.right = 4;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -6;
    this.scene.add(key);

    const rim = new THREE.DirectionalLight(0x6ee7b7, 0.35);
    rim.position.set(-5, 2, -4);
    this.scene.add(rim);

    const fill = new THREE.DirectionalLight(0xffffff, 0.25);
    fill.position.set(-3, 4, 8);
    this.scene.add(fill);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(3.2, 48),
      new THREE.MeshStandardMaterial({
        color: 0xd1fae5,
        roughness: 0.95,
        metalness: 0,
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2.65;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  materialFor(region, state = "inactive") {
    const key = `${region}:${state}`;
    if (this.materials.has(key)) return this.materials.get(key);

    const configs = {
      inactive: {
        color: SKIN.inactive,
        roughness: 0.62,
        metalness: 0.04,
        emissive: 0x000000,
        emissiveIntensity: 0,
      },
      base: {
        color: SKIN.base,
        roughness: 0.5,
        metalness: 0.06,
        emissive: 0x000000,
        emissiveIntensity: 0,
      },
      active: {
        color: SKIN.active,
        roughness: 0.38,
        metalness: 0.12,
        emissive: SKIN.activeEmissive,
        emissiveIntensity: 0.45,
      },
      hover: {
        color: SKIN.hover,
        roughness: 0.45,
        metalness: 0.08,
        emissive: 0x065f46,
        emissiveIntensity: 0.2,
      },
      focus: {
        color: 0x5eead4,
        roughness: 0.32,
        metalness: 0.15,
        emissive: 0x0d9488,
        emissiveIntensity: 0.55,
      },
    };

    const cfg = configs[state] || configs.inactive;
    const mat = new THREE.MeshStandardMaterial({
      color: cfg.color,
      roughness: cfg.roughness,
      metalness: cfg.metalness,
      emissive: cfg.emissive,
      emissiveIntensity: cfg.emissiveIntensity,
      flatShading: false,
    });
    this.materials.set(key, mat);
    return mat;
  }

  register(part, region) {
    tagPart(part, region);
    if (!this.regionMeshes.has(region)) this.regionMeshes.set(region, []);
    part.traverse((child) => {
      if (child.isMesh) {
        this.regionMeshes.get(region).push(child);
        this.applyMaterial(child, region);
      }
    });
    return part;
  }

  resolveState(region) {
    if (this.focusedRegion === region) return "focus";
    if (this.hoveredRegion === region) return "hover";
    if (this.activeRegions.has(region)) return "active";
    return "inactive";
  }

  applyMaterial(mesh, region) {
    const state = this.resolveState(region);
    mesh.material = this.materialFor(region, state);
  }

  refreshMaterials() {
    for (const [region, meshes] of this.regionMeshes) {
      for (const mesh of meshes) this.applyMaterial(mesh, region);
    }
    this.syncLegend();
  }

  syncLegend() {
    if (!this.rootEl) return;
    this.rootEl.querySelectorAll(".body-map-legend-item").forEach((item) => {
      const region = item.getAttribute("data-region");
      const isActive = this.activeRegions.has(region);
      const isFocus = this.focusedRegion === region;
      item.classList.toggle("is-active", isActive);
      item.classList.toggle("is-focus", isFocus);
      item.setAttribute("aria-pressed", String(isActive));
    });
  }

  focusRegion(region) {
    this.focusedRegion = this.focusedRegion === region ? null : region;
    this.refreshMaterials();
    if (this.focusedRegion && this.modelGroup) {
      const targetY = {
        head: 1.8,
        neck: 1.35,
        chest: 0.55,
        abdomen: -0.35,
        kidneys: -0.2,
        limbs: 0,
      }[region];
      if (targetY != null && this.controls) {
        this.controls.target.y = targetY * 0.35;
      }
    } else if (this.controls) {
      this.controls.target.y = 0.1;
    }
  }

  buildModel() {
    this.modelGroup = new THREE.Group();
    const parts = [];

    const head = this.register(
      new THREE.Mesh(new THREE.SphereGeometry(0.52, 32, 28), this.materialFor("head", "inactive")),
      "head"
    );
    head.scale.set(1, 1.08, 0.92);
    head.position.y = 2.05;
    parts.push(head);

    const neck = this.register(
      makeCapsule(0.17, 0.42, this.materialFor("neck", "inactive")),
      "neck"
    );
    neck.position.y = 1.52;
    parts.push(neck);

    const chest = this.register(
      new THREE.Mesh(
        latheFromPoints([
          [0.32, -0.55],
          [0.62, -0.2],
          [0.72, 0.35],
          [0.58, 0.75],
          [0.38, 0.95],
        ]),
        this.materialFor("chest", "inactive")
      ),
      "chest"
    );
    chest.position.y = 0.55;
    parts.push(chest);

    const abdomen = this.register(
      new THREE.Mesh(
        latheFromPoints([
          [0.38, -0.95],
          [0.68, -0.45],
          [0.62, 0.2],
          [0.42, 0.95],
        ]),
        this.materialFor("abdomen", "inactive")
      ),
      "abdomen"
    );
    abdomen.position.y = -0.55;
    parts.push(abdomen);

    const pelvis = this.register(
      new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 24, 18),
        this.materialFor("abdomen", "inactive")
      ),
      "abdomen"
    );
    pelvis.scale.set(1.15, 0.55, 0.85);
    pelvis.position.y = -1.05;
    parts.push(pelvis);

    const kidneyGeo = new THREE.SphereGeometry(0.14, 16, 14);
    const kidneyL = this.register(
      new THREE.Mesh(kidneyGeo, this.materialFor("kidneys", "inactive")),
      "kidneys"
    );
    kidneyL.scale.set(1, 1.35, 0.7);
    kidneyL.position.set(-0.38, -0.15, 0.28);
    const kidneyR = this.register(
      new THREE.Mesh(kidneyGeo.clone(), this.materialFor("kidneys", "inactive")),
      "kidneys"
    );
    kidneyR.scale.set(1, 1.35, 0.7);
    kidneyR.position.set(0.38, -0.15, 0.28);
    parts.push(kidneyL, kidneyR);

    const buildLimbChain = (side) => {
      const sign = side === "L" ? -1 : 1;
      const mat = () => this.materialFor("limbs", "inactive");

      const upper = this.register(makeCapsule(0.14, 0.72, mat()), "limbs");
      upper.position.set(sign * 0.92, 0.75, 0);
      upper.rotation.z = sign * 0.22;
      parts.push(upper);

      const lower = this.register(makeCapsule(0.11, 0.68, mat()), "limbs");
      lower.position.set(sign * 1.18, 0.05, 0.05);
      lower.rotation.z = sign * 0.08;
      parts.push(lower);

      const hand = this.register(
        new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 12), mat()),
        "limbs"
      );
      hand.scale.set(0.9, 1.1, 0.7);
      hand.position.set(sign * 1.32, -0.42, 0.06);
      parts.push(hand);

      const thigh = this.register(makeCapsule(0.17, 0.88, mat()), "limbs");
      thigh.position.set(sign * 0.32, -1.35, 0);
      thigh.rotation.x = 0.04;
      parts.push(thigh);

      const calf = this.register(makeCapsule(0.13, 0.82, mat()), "limbs");
      calf.position.set(sign * 0.34, -2.18, 0.04);
      parts.push(calf);

      const foot = this.register(
        new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.38), mat()),
        "limbs"
      );
      foot.position.set(sign * 0.34, -2.62, 0.1);
      parts.push(foot);
    };

    buildLimbChain("L");
    buildLimbChain("R");

    for (const part of parts) this.modelGroup.add(part);

    this.modelGroup.rotation.y = 0.15;
    this.modelGroup.position.y = 0.08;
    this.scene.add(this.modelGroup);
    this.refreshMaterials();
  }

  bindPointerEvents() {
    const canvas = this.renderer.domElement;
    canvas.style.touchAction = "none";

    const onMove = (event) => {
      if (this.disposed) return;
      const rect = canvas.getBoundingClientRect();
      this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      this.updateHover();
    };

    const onLeave = () => {
      this.hoveredRegion = null;
      this.refreshMaterials();
      this.hideTooltip();
    };

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("click", () => {
      if (this.hoveredRegion) this.focusRegion(this.hoveredRegion);
    });
  }

  updateHover() {
    if (!this.modelGroup) return;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObject(this.modelGroup, true);
    const hit = hits.find((h) => h.object.userData.region);
    const region = hit?.object.userData.region || null;

    if (region !== this.hoveredRegion) {
      this.hoveredRegion = region;
      this.refreshMaterials();
    }

    if (region && this.tooltipEl) {
      this.tooltipEl.hidden = false;
      this.tooltipEl.textContent = REGION_LABELS[region] || region;
      const rect = this.container.getBoundingClientRect();
      const x = ((this.pointer.x + 1) / 2) * rect.width;
      const y = ((1 - this.pointer.y) / 2) * rect.height;
      this.tooltipEl.style.left = `${x}px`;
      this.tooltipEl.style.top = `${y}px`;
    } else {
      this.hideTooltip();
    }
  }

  hideTooltip() {
    if (this.tooltipEl) this.tooltipEl.hidden = true;
  }

  animate() {
    if (this.disposed) return;
    this.frameId = requestAnimationFrame(() => this.animate());

    const t = this.clock.getElapsedTime();
    const pulse = 0.38 + Math.sin(t * 2.2) * 0.12;

    for (const region of this.activeRegions) {
      const meshes = this.regionMeshes.get(region) || [];
      for (const mesh of meshes) {
        if (mesh.material?.emissiveIntensity != null && this.resolveState(region) === "active") {
          mesh.material.emissiveIntensity = pulse;
        }
      }
    }

    if (this.autoRotate && this.modelGroup && !this.isDragging) {
      this.modelGroup.rotation.y += 0.004;
    }

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

    for (const mat of this.materials.values()) mat.dispose();
    this.materials.clear();

    if (this.modelGroup) {
      this.modelGroup.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
      });
    }

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
