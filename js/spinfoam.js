document.addEventListener("DOMContentLoaded", function() {
  const canvas = document.getElementById('spinfoamCanvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  let width, height;

  function resizeCanvas() {
    // S'adapte à la taille de la fenêtre et du parent
    width = canvas.width = window.innerWidth;
    height = canvas.height = canvas.parentElement.offsetHeight;
  }
  
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  const nodes = [];
  const numNodes = 100; // Densité augmentée pour le plein écran
  const maxDistance = 150;
  let mouse = { x: null, y: null, radius: 180 };

  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });

  window.addEventListener('mouseleave', () => {
    mouse.x = null;
    mouse.y = null;
  });

  for (let i = 0; i < numNodes; i++) {
    nodes.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      baseRadius: Math.random() * 2 + 0.5,
      phase: Math.random() * Math.PI * 2
    });
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);
    
    nodes.forEach(node => {
      node.phase += 0.02;
      node.x += node.vx + Math.sin(node.phase) * 0.1;
      node.y += node.vy + Math.cos(node.phase) * 0.1;
      
      if (node.x < 0 || node.x > width) node.vx *= -1;
      if (node.y < 0 || node.y > height) node.vy *= -1;
      
      if (mouse.x !== null && mouse.y !== null) {
        const dx = node.x - mouse.x;
        const dy = node.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouse.radius) {
          const force = (mouse.radius - dist) / mouse.radius;
          node.x += (dx / dist) * force * 1.5;
          node.y += (dy / dist) * force * 1.5;
        }
      }
    });
    
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < maxDistance) {
          const alpha = (1 - dist / maxDistance) * 0.4;
          const thickness = (Math.sin(nodes[i].phase + j) + 1.5) * 1.0;
          
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.strokeStyle = `rgba(0, 168, 168, ${alpha})`; // Accent Teal
          ctx.lineWidth = thickness;
          ctx.stroke();
        }
      }
    }
    
    nodes.forEach(node => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.baseRadius + Math.sin(node.phase) * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 168, 168, 0.9)';
      ctx.fill();
    });
    
    requestAnimationFrame(animate);
  }
  animate();
});