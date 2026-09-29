// Rotating chrome GlowBall logo for the homepage hero.
// Loads assets/glowball-logo.glb and renders it with a studio-lit environment so the
// metal has something to reflect. Falls back to the flat logo image if WebGL fails.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/+esm';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/loaders/GLTFLoader.js/+esm';

const holder = document.getElementById('heroLogo');
if (holder) init(holder);

// Dark studio with bright softboxes: chrome reads as chrome only with strong
// light/dark contrast to reflect.
function studioEnvironment(renderer) {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x1c1c20);
  const panel = (w, h, pos, intensity, color) => {
    const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    mat.color.set(color || 0xffffff).multiplyScalar(intensity);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(pos[0], pos[1], pos[2]);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  // behind the camera: what the flat faces mirror when turned toward the viewer
  panel(14, 3.2, [0, 3.2, 7], 5);             // top-front softbox
  panel(14, 1.2, [0, 0.4, 7], 2.2);           // mid strip
  panel(14, 2.5, [0, -3, 7], 1.1, 0xd8ccc4);  // warm low fill
  panel(12, 12, [0, 8, 0], 3);                // overhead
  panel(1.6, 9, [-7, 0.5, 2], 6);             // left strip
  panel(1.6, 9, [7, 0, 1], 4);                // right strip
  panel(12, 3, [0, -6, 2], 0.6, 0xb49a8c);    // floor bounce
  panel(6, 6, [0, 1, -8], 1.4, 0x1ee1ff);     // faint brand-cyan kick from behind
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(env, 0.02).texture;
  pmrem.dispose();
  return tex;
}

function init(holder) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch (e) {
    return; // no WebGL: keep the flat logo
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.domElement.className = 'hero-logo-canvas';
  renderer.domElement.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene();
  scene.environment = studioEnvironment(renderer);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, 4.6);

  const pivot = new THREE.Group();
  scene.add(pivot);

  function resize() {
    const size = holder.clientWidth * 1.2;   // canvas overhangs the holder by 10% each side (see .hero-logo-canvas)
    renderer.setSize(size, size, false);
  }

  let rafId = null, last = 0, spin = 0.6, clock = 0;
  function render() { renderer.render(scene, camera); }
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now; clock += dt;
    spin += dt * 0.5;                                   // ~12.5 s per turn
    pivot.rotation.y = spin;
    pivot.rotation.x = 0.16 + Math.sin(clock * 0.45) * 0.07;
    render();
    rafId = requestAnimationFrame(frame);
  }
  function start() { if (!rafId && !reduced) { last = performance.now(); rafId = requestAnimationFrame(frame); } }
  function stop() { if (rafId) cancelAnimationFrame(rafId); rafId = null; }

  new GLTFLoader().load(holder.dataset.model, (gltf) => {
    gltf.scene.traverse((o) => {
      if (o.isMesh) { o.material.metalness = 1; o.material.roughness = 0.06; }
    });
    pivot.add(gltf.scene);
    pivot.rotation.set(0.16, spin, 0);
    holder.appendChild(renderer.domElement);
    resize();
    render();
    holder.classList.add('is-3d');
    window.addEventListener('resize', () => { resize(); render(); });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => { entries[0].isIntersecting ? start() : stop(); }).observe(holder);
    } else {
      start();
    }
  }, undefined, () => { /* model failed to load: keep the flat logo */ });
}
