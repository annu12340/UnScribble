/**
 * 3D Protein Structure Viewer using Three.js
 * Displays ESMFold-predicted protein structures and drug binding sites
 */

class ProteinViewer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error("Container not found:", containerId);
      return;
    }

    if (typeof THREE === "undefined") {
      console.error("THREE.js not loaded");
      this.container.innerHTML =
        '<div class="loading">3D library not loaded. Please refresh the page.</div>';
      return;
    }

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.proteinMesh = null;

    try {
      this.init();
    } catch (error) {
      console.error("Failed to initialize 3D viewer:", error);
      this.container.innerHTML =
        '<div class="loading">Failed to initialize 3D viewer.</div>';
    }
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);

    this.camera = new THREE.PerspectiveCamera(
      75,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000,
    );
    this.camera.position.z = 50;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(
      this.container.clientWidth,
      this.container.clientHeight,
    );

    this.container.innerHTML = "";
    this.container.appendChild(this.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    this.scene.add(directionalLight);

    if (typeof THREE.OrbitControls !== "undefined") {
      this.controls = new THREE.OrbitControls(
        this.camera,
        this.renderer.domElement,
      );
      this.controls.enableDamping = true;
    } else {
      console.warn("OrbitControls not available, using auto-rotation only");
    }

    window.addEventListener("resize", () => this.onWindowResize());
    this.animate();
  }

  /**
   * Load and display protein structure from PDB data
   */
  async loadProteinStructure(pdbData, medicationName) {
    if (this.proteinMesh) {
      this.scene.remove(this.proteinMesh);
    }

    if (pdbData === "MOCK_PDB_DATA") {
      this.proteinMesh = this.createMockProtein();
      this.scene.add(this.proteinMesh);
      this.highlightBindingSite();
      this.addLabel(medicationName);
      return;
    }

    try {
      const atoms = this.parsePDB(pdbData);
      this.proteinMesh = this.createProteinMesh(atoms);
      this.scene.add(this.proteinMesh);
      this.highlightBindingSite();
      this.addLabel(medicationName);
    } catch (error) {
      console.error("Failed to parse PDB data:", error);
      this.proteinMesh = this.createMockProtein();
      this.scene.add(this.proteinMesh);
      this.highlightBindingSite();
      this.addLabel(medicationName);
    }
  }

  /**
   * Create a mock protein structure for demo purposes
   */
  createMockProtein() {
    const group = new THREE.Group();

    // Create a simplified protein-like structure
    // Alpha helix representation
    for (let i = 0; i < 20; i++) {
      const angle = i * 0.5;
      const radius = 5;
      const x = Math.cos(angle) * radius;
      const y = i * 2 - 20;
      const z = Math.sin(angle) * radius;

      // Backbone atoms
      const geometry = new THREE.SphereGeometry(0.8, 16, 16);
      const material = new THREE.MeshPhongMaterial({ color: 0x3498db });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(x, y, z);
      group.add(sphere);

      // Side chains
      if (i % 3 === 0) {
        const sideChain = new THREE.Mesh(
          new THREE.SphereGeometry(0.5, 12, 12),
          new THREE.MeshPhongMaterial({ color: 0xe74c3c }),
        );
        sideChain.position.set(x * 1.5, y, z * 1.5);
        group.add(sideChain);
      }
    }

    // Add beta sheet
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 5; j++) {
        const geometry = new THREE.SphereGeometry(0.6, 12, 12);
        const material = new THREE.MeshPhongMaterial({ color: 0x2ecc71 });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(i * 2 - 10, 10, j * 2 - 5);
        group.add(sphere);
      }
    }

    return group;
  }

  /**
   * Parse PDB format data into atom coordinates
   */
  parsePDB(pdbData) {
    // Simplified PDB parser
    // In production, use a proper PDB parser library
    const atoms = [];
    const lines = pdbData.split("\n");

    for (const line of lines) {
      if (line.startsWith("ATOM")) {
        const x = parseFloat(line.substring(30, 38));
        const y = parseFloat(line.substring(38, 46));
        const z = parseFloat(line.substring(46, 54));
        const element = line.substring(76, 78).trim();

        atoms.push({ x, y, z, element });
      }
    }

    return atoms;
  }

  /**
   * Create 3D mesh from atom data
   */
  createProteinMesh(atoms) {
    const group = new THREE.Group();

    // Color scheme for different atoms
    const colors = {
      C: 0x909090, // Carbon - gray
      N: 0x3050f8, // Nitrogen - blue
      O: 0xff0d0d, // Oxygen - red
      S: 0xffff30, // Sulfur - yellow
      H: 0xffffff, // Hydrogen - white
    };

    // Create sphere for each atom
    atoms.forEach((atom) => {
      const geometry = new THREE.SphereGeometry(0.3, 16, 16);
      const material = new THREE.MeshPhongMaterial({
        color: colors[atom.element] || 0xffc0cb,
      });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(atom.x, atom.y, atom.z);
      group.add(sphere);
    });

    // Create bonds between nearby atoms (simplified)
    this.createBonds(atoms, group);

    return group;
  }

  /**
   * Create bonds between atoms
   */
  createBonds(atoms, group) {
    const bondDistance = 2.0; // Angstroms

    for (let i = 0; i < atoms.length; i++) {
      for (let j = i + 1; j < atoms.length; j++) {
        const distance = Math.sqrt(
          Math.pow(atoms[i].x - atoms[j].x, 2) +
            Math.pow(atoms[i].y - atoms[j].y, 2) +
            Math.pow(atoms[i].z - atoms[j].z, 2),
        );

        if (distance < bondDistance) {
          const geometry = new THREE.CylinderGeometry(0.1, 0.1, distance);
          const material = new THREE.MeshPhongMaterial({ color: 0x808080 });
          const bond = new THREE.Mesh(geometry, material);

          // Position and orient bond
          bond.position.set(
            (atoms[i].x + atoms[j].x) / 2,
            (atoms[i].y + atoms[j].y) / 2,
            (atoms[i].z + atoms[j].z) / 2,
          );

          group.add(bond);
        }
      }
    }
  }

  /**
   * Highlight the drug binding site
   */
  highlightBindingSite() {
    // Add a glowing sphere at the binding site
    const geometry = new THREE.SphereGeometry(5, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.2,
      wireframe: true,
    });
    const bindingSite = new THREE.Mesh(geometry, material);
    bindingSite.position.set(0, 0, 0); // Would be actual binding site coords
    this.scene.add(bindingSite);
  }

  /**
   * Add text label
   */
  addLabel(text) {
    // Create canvas for text
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = 512;
    canvas.height = 128;

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.font = "Bold 48px Arial";
    context.fillStyle = "#000000";
    context.textAlign = "center";
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(0, 30, 0);
    sprite.scale.set(20, 5, 1);
    this.scene.add(sprite);
  }

  /**
   * Animation loop
   */
  animate() {
    requestAnimationFrame(() => this.animate());

    // Rotate protein slowly
    if (this.proteinMesh) {
      this.proteinMesh.rotation.y += 0.005;
    }

    if (this.controls) {
      this.controls.update();
    }

    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Handle window resize
   */
  onWindowResize() {
    this.camera.aspect =
      this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(
      this.container.clientWidth,
      this.container.clientHeight,
    );
  }
}

// Export for use in other modules
if (typeof window !== "undefined") {
  window.ProteinViewer = ProteinViewer;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = ProteinViewer;
}
