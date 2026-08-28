document.addEventListener("DOMContentLoaded", function() { 
  const canvas = document.getElementById('spinfoamCanvas'); 
  if (!canvas) return; 
  const ctx = canvas.getContext('2d'); 
  let width, height; 

// ======================================================================
  // CONFIGURATION 
  // ======================================================================
  // Détection d'un affichage mobile au chargement
  const isMobile = window.innerWidth < 768;

  const CONFIG = {
    // Topologie de base
    numNodes: isMobile ? 250 : 1000,            // Densité drastiquement réduite sur mobile
    maxDistance: isMobile ? 150 : 120,          // Légèrement augmenté sur mobile pour maintenir la connectivité
    
    // Interaction
    mouseRadius: isMobile ? 120 : 180,          // Zone d'interaction réduite sur petit écran
    mouseForce: 1.5,            
    
    // Esthétique (Iridescence)
    colorTeal: { r: 0, g: 168, b: 168 },     
    colorFushia: { r: 255, g: 0, b: 150 },   
    waveSpeed: 0.005,           
    waveFreq: 0.003,            
    maxFushiaRatio: 0.45,       
    
    // Fluctuations Quantiques (Création/Destruction douce)
    fluctuationRate: 0.01,     
    fadeSmoothness: 2.5,        
    fadeOffset: 0.2,            
    
    // Ponts Quantiques (Connexions non-locales)
    probBridge: 0.05,           
    maxBridges: isMobile ? 5 : 12,              // Moins de ponts à calculer sur mobile
    bridgeLife: 150             
  };
  // ======================================================================

  const maxDistSq = CONFIG.maxDistance * CONFIG.maxDistance;

  function resizeCanvas() { 
    width = canvas.width = window.innerWidth; 
    height = canvas.height = canvas.parentElement.offsetHeight; 
  } 
  window.addEventListener('resize', resizeCanvas); 
  resizeCanvas(); 

  const nodes = []; 
  const bridges = []; 
  let globalTime = 0; 
  let mouse = { x: null, y: null }; 

  window.addEventListener('mousemove', (e) => { 
    const rect = canvas.getBoundingClientRect(); 
    mouse.x = e.clientX - rect.left; 
    mouse.y = e.clientY - rect.top; 
  }); 

  window.addEventListener('mouseleave', () => { 
    mouse.x = null; 
    mouse.y = null; 
  }); 

  for (let i = 0; i < CONFIG.numNodes; i++) { 
    nodes.push({ 
      x: Math.random() * width, 
      y: Math.random() * height, 
      vx: (Math.random() - 0.5) * 0.5, 
      vy: (Math.random() - 0.5) * 0.5, 
      baseRadius: Math.random() * 2 + 0.5, 
      kinematicPhase: Math.random() * Math.PI * 2, 
      existencePhase: Math.random() * Math.PI * 2, 
      amplitude: 1, // Champ d'existence continu entre 0 et 1
      colorRatio: 0 
    }); 
  } 

  function getMixedColor(ratio, alpha) {
    const r = Math.round(CONFIG.colorTeal.r * (1 - ratio) + CONFIG.colorFushia.r * ratio);
    const g = Math.round(CONFIG.colorTeal.g * (1 - ratio) + CONFIG.colorFushia.g * ratio);
    const b = Math.round(CONFIG.colorTeal.b * (1 - ratio) + CONFIG.colorFushia.b * ratio);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function animate() { 
    ctx.clearRect(0, 0, width, height); 
    globalTime += CONFIG.waveSpeed;

    // 1. MISE À JOUR (Cinématique, Onde de couleur et Amplitude)
    nodes.forEach(node => { 
      node.kinematicPhase += 0.02; 
      node.existencePhase += CONFIG.fluctuationRate;
      
      // L'amplitude remplace le booléen. Mapping lisse via sinus et bornage [0, 1]
      const rawSine = Math.sin(node.existencePhase);
      node.amplitude = Math.max(0, Math.min(1, (rawSine + CONFIG.fadeOffset) * CONFIG.fadeSmoothness));
      
      const waveX = Math.sin(node.x * CONFIG.waveFreq + globalTime);
      const waveY = Math.cos(node.y * CONFIG.waveFreq + globalTime * 0.8);
      node.colorRatio = Math.max(0, (waveX + waveY) * 0.5) * CONFIG.maxFushiaRatio;

      node.x += node.vx + Math.sin(node.kinematicPhase) * 0.1; 
      node.y += node.vy + Math.cos(node.kinematicPhase) * 0.1; 
      
      if (node.x < 0 || node.x > width) node.vx *= -1; 
      if (node.y < 0 || node.y > height) node.vy *= -1; 
      
      if (mouse.x !== null && mouse.y !== null) { 
        const dx = node.x - mouse.x; 
        const dy = node.y - mouse.y; 
        const distSq = dx * dx + dy * dy;
        const mouseRadiusSq = CONFIG.mouseRadius * CONFIG.mouseRadius;
        
        if (distSq < mouseRadiusSq) { 
          const dist = Math.sqrt(distSq);
          const force = (CONFIG.mouseRadius - dist) / CONFIG.mouseRadius; 
          node.x += (dx / dist) * force * CONFIG.mouseForce; 
          node.y += (dy / dist) * force * CONFIG.mouseForce; 
        } 
      } 
    }); 

    // 2. PONTS QUANTIQUES NON-LOCAUX
    if (Math.random() < CONFIG.probBridge && bridges.length < CONFIG.maxBridges) {
      const n1 = nodes[Math.floor(Math.random() * nodes.length)];
      const n2 = nodes[Math.floor(Math.random() * nodes.length)];
      
      // On exige que les deux nœuds aient une amplitude maximale pour initier un pont
      if (n1 !== n2 && n1.amplitude > 0.9 && n2.amplitude > 0.9) {
        const dx = n1.x - n2.x;
        const dy = n1.y - n2.y;
        if (dx*dx + dy*dy > maxDistSq) {
            bridges.push({ n1, n2, life: CONFIG.bridgeLife, maxLife: CONFIG.bridgeLife });
        }
      }
    }

    for (let i = bridges.length - 1; i >= 0; i--) {
      const b = bridges[i];
      b.life--;
      
      // Effondrement si durée de vie expirée ou si l'un des nœuds fluctue vers 0
      if (b.life <= 0 || b.n1.amplitude < 0.1 || b.n2.amplitude < 0.1) {
        bridges.splice(i, 1);
        continue;
      }
      
      const timeAmplitude = Math.sin((b.life / b.maxLife) * Math.PI); 
      const avgColorRatio = (b.n1.colorRatio + b.n2.colorRatio) / 2;
      
      // Transparence pondérée par l'amplitude temporelle ET spatiale (topologique)
      const finalAlpha = timeAmplitude * 0.6 * b.n1.amplitude * b.n2.amplitude;
      
      ctx.beginPath();
      ctx.moveTo(b.n1.x, b.n1.y);
      ctx.lineTo(b.n2.x, b.n2.y);
      ctx.strokeStyle = getMixedColor(avgColorRatio, finalAlpha);
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 3. RÉSEAU LOCAL (Optimisé pour densité élevée)
    for (let i = 0; i < nodes.length; i++) { 
      // Culling : on ignore le nœud s'il est presque invisible
      if (nodes[i].amplitude < 0.01) continue; 

      for (let j = i + 1; j < nodes.length; j++) { 
        if (nodes[j].amplitude < 0.01) continue;

        const dx = nodes[i].x - nodes[j].x; 
        const dy = nodes[i].y - nodes[j].y; 
        const distSq = dx * dx + dy * dy; 
        
        // Optimisation : On teste le carré de la distance d'abord
        if (distSq < maxDistSq) { 
          const dist = Math.sqrt(distSq);
          
          // La transparence dépend de la distance ET du produit des amplitudes des nœuds
          const distanceAlpha = (1 - dist / CONFIG.maxDistance) * 0.4; 
          const jointAmplitude = nodes[i].amplitude * nodes[j].amplitude;
          const finalAlpha = distanceAlpha * jointAmplitude;
          
          const thickness = (Math.sin(nodes[i].kinematicPhase + j) + 1.5) * 1.0; 
          const avgColorRatio = (nodes[i].colorRatio + nodes[j].colorRatio) / 2;
          
          ctx.beginPath(); 
          ctx.moveTo(nodes[i].x, nodes[i].y); 
          ctx.lineTo(nodes[j].x, nodes[j].y); 
          ctx.strokeStyle = getMixedColor(avgColorRatio, finalAlpha); 
          ctx.lineWidth = thickness; 
          ctx.stroke(); 
        } 
      } 
    } 

    // 4. DESSIN DES NŒUDS
    nodes.forEach(node => { 
      if (node.amplitude < 0.01) return;

      ctx.beginPath(); 
      ctx.arc(node.x, node.y, node.baseRadius + Math.sin(node.kinematicPhase) * 0.5, 0, Math.PI * 2); 
      // L'opacité du nœud est directement son champ d'amplitude
      ctx.fillStyle = getMixedColor(node.colorRatio, node.amplitude * 0.9); 
      ctx.fill(); 
    }); 

    requestAnimationFrame(animate); 
  } 

  animate(); 
});