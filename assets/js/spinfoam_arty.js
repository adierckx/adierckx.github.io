/**
 * SPINFOAM EASTER EGG - MODULAR ENGINE
 */

// ============================================================================
// 1. CONFIGURATION
// ============================================================================
const isMobile = window.innerWidth < 768;
const Config = {
  // Dynamique centrale
  maxTetrahedra: isMobile ? 350 : 800,
  minTetrahedra: isMobile ? 200 : 500,
  pGrow: 0.35,        
  pDestroy: 0.05,     
  pGlue: 0.15,        
  glueDist: 60,       
  
  // Voûte céleste (Densifiée)
  vaultDensity: isMobile ? 1000 : 2500, // Nombre augmenté
  vaultRadius: 1800,                    // Sphère rapprochée
  
  // Caméra
  fov: 650,
  camSpeed: 0.00015,  
  orbitRadius: 900,   
  
  // Esthétique
  colorTeal: { r: 0, g: 168, b: 168 },
  colorFushia: { r: 255, g: 0, b: 150 },
  fluctuationBase: 0.015,
};

// ============================================================================
// 2. MATHÉMATIQUES 3D
// ============================================================================
const Math3D = {
  Vec3: (x, y, z) => ({x, y, z}),
  add: (a, b) => ({x: a.x + b.x, y: a.y + b.y, z: a.z + b.z}),
  sub: (a, b) => ({x: a.x - b.x, y: a.y - b.y, z: a.z - b.z}),
  mul: (a, s) => ({x: a.x * s, y: a.y * s, z: a.z * s}),
  dot: (a, b) => a.x * b.x + a.y * b.y + a.z * b.z,
  cross: (a, b) => ({
    x: a.y * b.z - a.z * b.y, 
    y: a.z * b.x - a.x * b.z, 
    z: a.x * b.y - a.y * b.x
  }),
  mag: (a) => Math.sqrt(Math3D.dot(a, a)),
  distSq: (a, b) => (a.x-b.x)**2 + (a.y-b.y)**2 + (a.z-b.z)**2,
  normalize: (a) => {
    let m = Math3D.mag(a);
    return m === 0 ? Math3D.Vec3(0, 0, 0) : Math3D.mul(a, 1/m);
  }
};

// ============================================================================
// 3. LA VOÛTE CÉLESTE (Bruit de fond quantique)
// ============================================================================
class CelestialVault {
  constructor() {
    this.tetrahedra = [];
    this.initVault();
  }

  initVault() {
    for (let i = 0; i < Config.vaultDensity; i++) {
      // Coordonnées sphériques
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      
      // Astuce de densité : on ne les place pas tous exactement à 'vaultRadius'.
      // On crée une épaisseur (une coquille) de 30% autour de ce rayon.
      const r = Config.vaultRadius * (0.85 + Math.random() * 0.4); 
      
      const cx = r * Math.sin(phi) * Math.cos(theta);
      const cy = r * Math.sin(phi) * Math.sin(theta);
      const cz = r * Math.cos(phi);

      const center = Math3D.Vec3(cx, cy, cz);
      
      // On génère des tétraèdres beaucoup plus gros pour "tapisser" l'arrière-plan
      const s = 60 + Math.random() * 120; 

      const v = [];
      for(let j=0; j<4; j++) {
        v.push(Math3D.add(center, Math3D.Vec3((Math.random()-0.5)*s, (Math.random()-0.5)*s, (Math.random()-0.5)*s)));
      }

      this.tetrahedra.push({
        v: v,
        phase: Math.random() * Math.PI * 2,
        freq: (Config.fluctuationBase * 0.3) + Math.random() * 0.005, 
        colorRatio: Math.random(),
        amplitude: 0
      });
    }
  }

  update() {
    this.tetrahedra.forEach(t => {
      t.phase += t.freq;
      t.amplitude = Math.max(0, Math.sin(t.phase));
    });
  }
}

// ============================================================================
// 4. TOPOLOGIE DYNAMIQUE (Le cœur de la mousse)
// ============================================================================
class SpinfoamTopology {
  constructor() {
    this.vertices = [];
    this.tetrahedra = [];
    this.initSeeds();
    for(let i=0; i<600; i++) this.update(); // Thermalisation
  }

  initSeeds() {
    let s = 40;
    let numSeeds = isMobile ? 8 : 15;
    for (let i = 0; i < numSeeds; i++) {
      let cx = (Math.random() - 0.5) * 800;
      let cy = (Math.random() - 0.5) * 800;
      let cz = (Math.random() - 0.5) * 800;
      
      this.vertices.push(
        Math3D.Vec3(cx+s, cy+s, cz+s), Math3D.Vec3(cx-s, cy-s, cz+s), 
        Math3D.Vec3(cx-s, cy+s, cz-s), Math3D.Vec3(cx+s, cy-s, cz-s)
      );
      let vL = this.vertices.length;
      this.tetrahedra.push({
        v: [this.vertices[vL-4], this.vertices[vL-3], this.vertices[vL-2], this.vertices[vL-1]],
        phase: Math.random() * Math.PI * 2, freq: Config.fluctuationBase + Math.random() * 0.01, colorRatio: Math.random()
      });
    }
  }

  removeDegenerate() {
    for (let i = this.tetrahedra.length - 1; i >= 0; i--) {
      let unique = new Set(this.tetrahedra[i].v);
      if (unique.size < 4) this.tetrahedra.splice(i, 1);
    }
  }

  update() {
    const len = this.tetrahedra.length;
    
    // CROISSANCE
    if (len > 0 && (len < Config.maxTetrahedra && Math.random() < Config.pGrow || len < Config.minTetrahedra)) {
      let t = this.tetrahedra[Math.floor(Math.random() * len)];
      const faces = [[0,1,2], [0,1,3], [0,2,3], [1,2,3]];
      let fIdx = faces[Math.floor(Math.random() * 4)];
      
      let A = t.v[fIdx[0]], B = t.v[fIdx[1]], C = t.v[fIdx[2]];
      let D_old = t.v[[0,1,2,3].find(x => !fIdx.includes(x))];
      
      let AB = Math3D.sub(B, A), AC = Math3D.sub(C, A);
      let N = Math3D.normalize(Math3D.cross(AB, AC));
      if (Math3D.dot(N, Math3D.sub(A, D_old)) < 0) N = Math3D.mul(N, -1);
      
      let centroid = Math3D.mul(Math3D.add(Math3D.add(A, B), C), 1/3);
      let pushToCenter = Math3D.mul(centroid, -0.002); 
      let L = 50 + Math.random() * 80; 
      let noise = Math3D.Vec3((Math.random()-0.5)*30, (Math.random()-0.5)*30, (Math.random()-0.5)*30);
      
      let D_new = Math3D.add(Math3D.add(centroid, Math3D.mul(N, L)), Math3D.add(pushToCenter, noise));
      
      this.vertices.push(D_new);
      this.tetrahedra.push({
        v: [A, B, C, D_new],
        phase: Math.random() * Math.PI * 2, freq: Config.fluctuationBase + Math.random() * 0.01, colorRatio: Math.random()
      });
    }

    // RECOLLEMENT
    if (this.vertices.length > 20 && Math.random() < Config.pGlue) {
      let v1 = this.vertices[Math.floor(Math.random() * this.vertices.length)];
      let v2 = null;
      let minDist = Config.glueDist * Config.glueDist;
      
      for (let i = 0; i < this.vertices.length; i++) {
        let v = this.vertices[i];
        if (v === v1) continue;
        let d = Math3D.distSq(v1, v);
        if (d < minDist) { minDist = d; v2 = v; }
      }
      
      if (v2) {
        this.tetrahedra.forEach(t => {
          for (let i = 0; i < 4; i++) { if (t.v[i] === v2) t.v[i] = v1; }
        });
        this.removeDegenerate();
      }
    }

    // DESTRUCTION
    if (len > Config.minTetrahedra && Math.random() < Config.pDestroy || len > Config.maxTetrahedra) {
      this.tetrahedra.splice(Math.floor(Math.random() * this.tetrahedra.length), 1);
    }
    
    // GARBAGE COLLECTION
    if (Math.random() < 0.02) {
      let active = new Set();
      this.tetrahedra.forEach(t => t.v.forEach(v => active.add(v)));
      this.vertices = Array.from(active);
    }
  }
}

// ============================================================================
// 5. CAMÉRA
// ============================================================================
class Camera {
  constructor() {
    this.pos = Math3D.Vec3(0,0,0);
    this.fwd = Math3D.Vec3(0,0,-1);
    this.up = Math3D.Vec3(0,1,0);
    this.right = Math3D.Vec3(1,0,0);
  }

  update(globalTime) {
    let t = globalTime * Config.camSpeed;
    this.pos = Math3D.Vec3(
      Math.sin(t * 0.8) * Config.orbitRadius,
      Math.sin(t * 0.4) * (Config.orbitRadius * 0.5),
      Math.cos(t * 0.6) * Config.orbitRadius
    );
    let targetPos = Math3D.Vec3(0, 0, 0); 
    this.fwd = Math3D.normalize(Math3D.sub(targetPos, this.pos)); 
    let worldUp = Math3D.Vec3(0, 1, 0);
    if (Math.abs(this.fwd.y) > 0.99) worldUp = Math3D.Vec3(1, 0, 0); 
    this.right = Math3D.normalize(Math3D.cross(worldUp, this.fwd));
    this.up = Math3D.cross(this.fwd, this.right); 
  }

  project(vertex, width, height) {
    let offset = Math3D.sub(vertex, this.pos);
    let x_cam = Math3D.dot(offset, this.right);
    let y_cam = Math3D.dot(offset, this.up);
    let z_cam = Math3D.dot(offset, this.fwd);
    
    if (z_cam < 10) return null; // Derrière la caméra
    
    return {
      x: (x_cam * Config.fov) / z_cam + width / 2,
      y: -(y_cam * Config.fov) / z_cam + height / 2, 
      zCam: z_cam
    };
  }
}

// ============================================================================
// 6. RENDU VISUEL
// ============================================================================
class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = 0;
    this.height = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
  }

  getMixedColor(ratio, alpha) {
    const r = Math.round(Config.colorTeal.r * (1 - ratio) + Config.colorFushia.r * ratio);
    const g = Math.round(Config.colorTeal.g * (1 - ratio) + Config.colorFushia.g * ratio);
    const b = Math.round(Config.colorTeal.b * (1 - ratio) + Config.colorFushia.b * ratio);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Rendu hautement optimisé pour la toile de fond (pas de tri Z complexe)
  drawVault(vault, camera) {
    vault.tetrahedra.forEach(tet => {
      if (tet.amplitude < 0.05) return; 
      
      let projV = [];
      let behind = false;
      for (let i = 0; i < 4; i++) {
        let p = camera.project(tet.v[i], this.width, this.height);
        if (!p) { behind = true; break; }
        projV.push(p);
      }
      if (behind) return;

      const faces = [
        [projV[0], projV[1], projV[2]], [projV[0], projV[1], projV[3]],
        [projV[0], projV[2], projV[3]], [projV[1], projV[2], projV[3]]
      ];

      // Opacité très faible pour créer la profondeur de champ lointaine
      this.ctx.lineWidth = 0.5;
      this.ctx.strokeStyle = this.getMixedColor(tet.colorRatio, tet.amplitude * 0.15);
      this.ctx.fillStyle = this.getMixedColor(tet.colorRatio, tet.amplitude * 0.05);

      faces.forEach(face => {
        this.ctx.beginPath();
        this.ctx.moveTo(face[0].x, face[0].y);
        this.ctx.lineTo(face[1].x, face[1].y);
        this.ctx.lineTo(face[2].x, face[2].y);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
      });
    });
  }

  // Rendu riche pour la topologie centrale (avec tri Z strict)
  drawTopology(tetrahedra, camera) {
    let renderQueue = [];

    tetrahedra.forEach(tet => {
      tet.phase += tet.freq;
      tet.amplitude = Math.max(0, Math.sin(tet.phase)); 
      if (tet.amplitude < 0.02) return; 

      let projV = [];
      let behind = false;
      let sumZ = 0;

      for (let i = 0; i < 4; i++) {
        let p = camera.project(tet.v[i], this.width, this.height);
        if (!p) { behind = true; break; }
        sumZ += p.zCam;
        projV.push(p);
      }

      if (!behind) {
        renderQueue.push({ projV: projV, centerZ: sumZ / 4, amplitude: tet.amplitude, colorRatio: tet.colorRatio });
      }
    });

    renderQueue.sort((a, b) => b.centerZ - a.centerZ);

    renderQueue.forEach(item => {
      let proximityFade = Math.min(1, Math.max(0, (item.centerZ - 40) / 150)); 
      // La topologie centrale fond dans le noir un peu avant d'atteindre la voûte
      let distanceFade = Math.min(1, Math.max(0, 1 - (item.centerZ / (Config.vaultRadius * 0.8))));
      let finalAmp = item.amplitude * proximityFade * distanceFade;
      if (finalAmp <= 0) return;

      const faces = [
        [item.projV[0], item.projV[1], item.projV[2]], [item.projV[0], item.projV[1], item.projV[3]],
        [item.projV[0], item.projV[2], item.projV[3]], [item.projV[1], item.projV[2], item.projV[3]]
      ];

      this.ctx.lineWidth = 1;
      this.ctx.strokeStyle = this.getMixedColor(item.colorRatio, finalAmp * 0.8);
      this.ctx.fillStyle = this.getMixedColor(item.colorRatio, finalAmp * 0.15);

      faces.forEach(face => {
        this.ctx.beginPath();
        this.ctx.moveTo(face[0].x, face[0].y);
        this.ctx.lineTo(face[1].x, face[1].y);
        this.ctx.lineTo(face[2].x, face[2].y);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
      });
    });
  }

  draw(vault, topology, camera) {
    this.ctx.clearRect(0, 0, this.width, this.height);
    // On dessine le fond en premier (sans tri Z interne pour économiser du CPU)
    this.drawVault(vault, camera);
    // Puis on dessine la structure centrale détaillée
    this.drawTopology(topology.tetrahedra, camera);
  }
}

// ============================================================================
// 7. MAIN (Contrôleur)
// ============================================================================
document.addEventListener("DOMContentLoaded", function() {
  const canvas = document.getElementById('spinfoamEasterEgg');
  if (!canvas) return;

  const vault = new CelestialVault();
  const topology = new SpinfoamTopology();
  const camera = new Camera();
  const renderer = new Renderer(canvas);
  
  let globalTime = Math.random() * 5000;

  function animate() {
    globalTime += 16; 
    
    vault.update();
    topology.update();
    camera.update(globalTime);
    
    renderer.draw(vault, topology, camera);

    requestAnimationFrame(animate);
  }

  animate();
});