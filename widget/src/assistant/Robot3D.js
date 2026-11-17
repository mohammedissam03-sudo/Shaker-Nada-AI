import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * Shaker & Nada | OptiFit 3D Robot V4
 * Procedural Three.js model. No downloaded GLB/FBX assets required.
 * Public API: createRobot3D(container, gender) -> setState, setGender, destroy
 * States: idle, thinking, happy, tired, excited, wink.
 */
export function createRobot3D(container, gender = 'male') {
  if (!(container instanceof HTMLElement)) {
    throw new Error('Robot3D requires a valid container');
  }

  let currentGender = gender === 'female' ? 'female' : 'male';
  let state = 'idle';
  let active = true;
  let frameId = 0;

  const theme = (g) => g === 'female' ? {
    shell: 0xf04c9e,
    shellLight: 0xff94c6,
    shellDark: 0xb92569,
    glow: 0xff5fbd,
    eye: 0xff89dc
  } : {
    shell: 0x286deb,
    shellLight: 0x65b0ff,
    shellDark: 0x1646ae,
    glow: 0x35c5ff,
    eye: 0x75e4ff
  };

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
  camera.position.set(0, 0.08, 5.65);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.42;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  container.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 1.65));
  const key = new THREE.DirectionalLight(0xffffff, 3.2);
  key.position.set(-2.5, 4.5, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fc8ff, 2.6);
  rim.position.set(3, 2, -3);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffffff, 1.1);
  fill.position.set(3, -2, 4);
  scene.add(fill);

  const materialList = [];
  function track(m) { materialList.push(m); return m; }
  const glossy = (color) => track(new THREE.MeshPhysicalMaterial({
    color, metalness: 0.28, roughness: 0.20,
    clearcoat: 1, clearcoatRoughness: 0.095
  }));
  const darkMetal = track(new THREE.MeshStandardMaterial({
    color: 0x172038, metalness: 0.68, roughness: 0.29
  }));
  const visor = track(new THREE.MeshPhysicalMaterial({
    color: 0x050c1e, metalness: 0.16, roughness: 0.11,
    clearcoat: 1, clearcoatRoughness: 0.045
  }));
  const blackGlass = track(new THREE.MeshPhysicalMaterial({
    color: 0x07152c, metalness: 0.23, roughness: 0.12,
    clearcoat: 1, clearcoatRoughness: 0.06
  }));
  const whiteHighlight = track(new THREE.MeshBasicMaterial({ color: 0xffffff }));
  const shell = glossy(0x286deb);
  const shellLight = glossy(0x65b0ff);
  const shellDark = glossy(0x1646ae);
  const glow = track(new THREE.MeshStandardMaterial({
    color: 0x35c5ff, emissive: 0x35c5ff,
    emissiveIntensity: 2.1, metalness: 0.04, roughness: 0.26
  }));
  const eyeGlow = track(new THREE.MeshBasicMaterial({ color: 0x75e4ff }));
  const subtleGlow = track(new THREE.MeshBasicMaterial({ color: 0x35c5ff,
    transparent: true, opacity: 0.35, depthWrite: false }));

  function mesh(geometry, material, parent, position = [0, 0, 0]) {
    const item = new THREE.Mesh(geometry, material);
    item.position.set(...position);
    parent.add(item);
    return item;
  }
  const round = (w, h, d, radius, segments = 5) =>
    new RoundedBoxGeometry(w, h, d, segments, radius);
  const ball = (radius, width = 24, height = 16) =>
    new THREE.SphereGeometry(radius, width, height);
  function lightTube(points, radius, parent, mat = glow) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    return mesh(new THREE.TubeGeometry(curve, 22, radius, 6, false), mat, parent);
  }

  const robot = new THREE.Group();
  scene.add(robot);

  // BODY — pointed, glossy, floating torso (not a plain capsule).
  const bodyPoints = [
    [0.01, -1.32], [0.10, -1.30], [0.23, -1.22],
    [0.37, -1.06], [0.46, -0.86], [0.50, -0.67],
    [0.48, -0.48], [0.40, -0.34], [0.24, -0.27], [0.05, -0.27]
  ].map(([r, y]) => new THREE.Vector2(r, y));
  mesh(new THREE.LatheGeometry(bodyPoints, 40), shell, robot);
  mesh(new THREE.CylinderGeometry(0.18, 0.19, 0.12, 28), darkMetal, robot, [0, -0.23, 0]);
  mesh(new THREE.TorusGeometry(0.20, 0.027, 8, 30), shellLight, robot, [0, -0.25, 0]).rotation.x = Math.PI / 2;

  // Chest display with workout/heart icons; model stays the same for both personas.
  mesh(round(0.57, 0.46, 0.105, 0.11), shellDark, robot, [0, -0.69, 0.475]);
  mesh(round(0.49, 0.38, 0.11, 0.09), blackGlass, robot, [0, -0.69, 0.534]);
  const dumbbell = new THREE.Group();
  dumbbell.position.set(0, -0.69, 0.607);
  robot.add(dumbbell);
  mesh(round(0.27, 0.037, 0.026, 0.012), glow, dumbbell);
  for (const x of [-0.16, 0.16]) {
    mesh(round(0.045, 0.16, 0.028, 0.015), glow, dumbbell, [x, 0, 0]);
    mesh(round(0.028, 0.095, 0.03, 0.01), whiteHighlight, dumbbell, [x, 0, 0.015]);
  }
  const heartGroup = new THREE.Group();
  heartGroup.position.set(0, -0.69, 0.608);
  robot.add(heartGroup);
  const heartShape = new THREE.Shape();
  heartShape.moveTo(0, -0.13);
  heartShape.bezierCurveTo(-0.11, -0.06, -0.17, 0.03, -0.10, 0.10);
  heartShape.bezierCurveTo(-0.05, 0.16, 0, 0.10, 0, 0.06);
  heartShape.bezierCurveTo(0.01, 0.12, 0.075, 0.15, 0.12, 0.09);
  heartShape.bezierCurveTo(0.18, 0.01, 0.10, -0.07, 0, -0.13);
  mesh(new THREE.ShapeGeometry(heartShape), glow, heartGroup);
  lightTube([[-0.11, -0.01, 0.007], [-0.055, -0.01, 0.007],
    [-0.025, 0.045, 0.007], [0.01, -0.045, 0.007],
    [0.055, 0.008, 0.007], [0.11, 0.008, 0.007]], 0.009, heartGroup, whiteHighlight);

  // Curved glowing body edge details.
  lightTube([[-0.35, -0.90, 0.27], [-0.32, -1.01, 0.27],
    [-0.22, -1.15, 0.22], [-0.08, -1.25, 0.13]], 0.023, robot);
  lightTube([[0.35, -0.90, 0.27], [0.32, -1.01, 0.27],
    [0.22, -1.15, 0.22], [0.08, -1.25, 0.13]], 0.023, robot);

  // ARMS — proper independent shoulder pivots, downward at rest.
  const shoulders = [];
  for (const side of [-1, 1]) {
    const armPivot = new THREE.Group();
    armPivot.position.set(side * 0.53, -0.48, 0.015);
    robot.add(armPivot);
    mesh(ball(0.155), darkMetal, armPivot);
    mesh(ball(0.098), shellLight, armPivot, [side * 0.07, -0.02, 0]);
    const arm = mesh(ball(0.215, 28, 22), shell, armPivot,
      [side * 0.16, -0.32, 0.025]);
    arm.scale.set(0.92, 2.12, 0.78);
    lightTube([[side * 0.135, -0.10, 0.186],
      [side * 0.17, -0.30, 0.193],
      [side * 0.165, -0.48, 0.17],
      [side * 0.13, -0.59, 0.105]], 0.021, armPivot);
    shoulders.push({ pivot: armPivot, side });
  }

  // HEAD V4.1 — smaller, softly oval head and matching oval screen.
  // The head pivot still drives the existing nod/tilt animations.
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.37, 0);
  headPivot.scale.set(0.93, 0.93, 1);
  robot.add(headPivot);

  // A smooth ellipsoid avoids the rectangular silhouette of RoundedBoxGeometry.
  const headShell = mesh(ball(1, 48, 32), shell, headPivot);
  headShell.scale.set(0.84, 0.63, 0.49);

  // Matching oval border and black facial display, layered toward the camera.
  const faceBezel = mesh(ball(1, 48, 32), shellLight,
    headPivot, [0, -0.02, 0.450]);
  faceBezel.scale.set(0.765, 0.49, 0.085);

  const faceGlass = mesh(ball(1, 48, 32), visor,
    headPivot, [0, -0.02, 0.515]);
  faceGlass.scale.set(0.715, 0.445, 0.075);

  // Subtle gloss, placed just above the curved display surface.
  const shine = mesh(round(0.34, 0.035, 0.012, 0.017),
    subtleGlow, headPivot, [-0.25, 0.34, 0.558]);
  shine.rotation.z = -0.14;

  // Side LED modules follow the narrower silhouette.
  for (const side of [-1, 1]) {
    mesh(round(0.18, 0.43, 0.26, 0.085), shellDark,
      headPivot, [side * 0.83, -0.015, 0.055]);
    mesh(round(0.08, 0.31, 0.26, 0.038), glow,
      headPivot, [side * 0.855, -0.015, 0.16]);
  }
  // Antenna with metallic curved shaft and glowing ball.
  lightTube([[0, 0.64, 0], [0.035, 0.78, 0],
    [0.11, 0.87, 0]], 0.042, headPivot, darkMetal);
  mesh(ball(0.12), glow, headPivot, [0.11, 0.95, 0]);
  mesh(ball(0.055), whiteHighlight, headPivot, [0.075, 0.985, 0.048]);

  // FACE — two independently animated eyes (rings, pupils, highlights), eyebrows and mouth.
  const eyes = [];
  const brows = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();

eye.position.set(side * 0.25, 0.10, 0.605);
    headPivot.add(eye);
    mesh(new THREE.TorusGeometry(0.141, 0.029, 8, 32), glow, eye);
    mesh(ball(0.083, 20, 16), eyeGlow, eye, [0, 0, 0.012]);
    mesh(ball(0.047, 16, 12), visor, eye, [0.006, -0.003, 0.081]);
    mesh(ball(0.019, 12, 10), whiteHighlight, eye, [-0.027, 0.035, 0.117]);
    eyes.push(eye);
    const brow = new THREE.Group();

brow.position.set(side * 0.25, 0.34, 0.593);
    headPivot.add(brow);
    lightTube([[-0.105, -0.015, 0], [0, 0.025, 0], [0.105, -0.015, 0]],
      0.012, brow, glow);
    brows.push(brow);
  }

  const mouthPivot = new THREE.Group();
  mouthPivot.position.set(0, -0.25, 0.608);
  headPivot.add(mouthPivot);
  const smileShape = new THREE.Shape();
  smileShape.moveTo(-0.13, 0.02);
  smileShape.bezierCurveTo(-0.075, -0.09, 0.075, -0.09, 0.13, 0.02);
  smileShape.bezierCurveTo(0.08, -0.012, -0.08, -0.012, -0.13, 0.02);
  const smile = mesh(new THREE.ShapeGeometry(smileShape), glow, mouthPivot);
  const openMouth = mesh(new THREE.SphereGeometry(0.09, 20, 16), eyeGlow,
    mouthPivot, [0, -0.022, 0]);
  openMouth.scale.set(1.1, 0.80, 0.12);
  openMouth.visible = false;

  // Subtle levitation highlight under the body; transparent and web-friendly.
  const halo = new THREE.Group();
  scene.add(halo);
  const haloMaterial = track(new THREE.MeshBasicMaterial({
    color: 0x35c5ff, transparent: true, opacity: 0.32,
    depthWrite: false, blending: THREE.AdditiveBlending
  }));
  const haloRing = mesh(new THREE.TorusGeometry(0.42, 0.065, 9, 48),
    haloMaterial, halo, [0, -1.59, 0]);
  haloRing.rotation.x = Math.PI / 2;
  haloRing.scale.y = 0.55;

  function setGender(nextGender) {
    if (!['male', 'female'].includes(nextGender)) return;
    currentGender = nextGender;
    const c = theme(currentGender);
    shell.color.setHex(c.shell);
    shellLight.color.setHex(c.shellLight);
    shellDark.color.setHex(c.shellDark);
    glow.color.setHex(c.glow);
    glow.emissive.setHex(c.glow);
    eyeGlow.color.setHex(c.eye);
    subtleGlow.color.setHex(c.glow);
    haloMaterial.color.setHex(c.glow);
    rim.color.setHex(currentGender === 'female' ? 0xffb3e0 : 0x9fc8ff);
    dumbbell.visible = currentGender === 'male';
    heartGroup.visible = currentGender === 'female';
  }
  setGender(currentGender);

  function resize() {
    const width = Math.max(1, container.clientWidth || 210);
    const height = Math.max(1, container.clientHeight || 260);
    const aspect = width / height;
    camera.aspect = aspect;
    camera.position.z = aspect < 0.68 ? 6.2 : 5.65;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  const clock = new THREE.Clock();
  const damp = (value, target, speed, dt) => THREE.MathUtils.damp(value, target, speed, dt);

  function animate() {
    if (!active) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    let bob = Math.sin(t * 1.55) * 0.085;
    let bodyYaw = Math.sin(t * 0.65) * 0.065;
    let bodyRoll = 0;
    let headTilt = Math.sin(t * 0.75) * 0.018;
    let headYaw = Math.sin(t * 0.72) * 0.045;
    let eyeHeight = 1;
    let eyeWidth = 1;
    let mouthOpen = false;
    let leftAngle = -0.20 + Math.sin(t * 0.82) * 0.018;
    let rightAngle = 0.20 - Math.sin(t * 0.82 + 0.5) * 0.018;
    let browTilt = 0;

    // State transitions are smoothly interpolated; no abrupt arm jumps.
    switch (state) {
      case 'thinking':
        bob = Math.sin(t * 1.35) * 0.05;
        headTilt = 0.14;
        headYaw = 0.20 + Math.sin(t * 0.9) * 0.04;
        rightAngle = -0.52;
        leftAngle = -0.14;
        eyeHeight = 0.86;
        browTilt = -0.10;
        break;
      case 'happy':
      case 'excited':
        bob = 0.10 + Math.abs(Math.sin(t * 4.2)) * 0.19;
        headTilt = Math.sin(t * 3.4) * 0.11;
        bodyYaw = Math.sin(t * 3.2) * 0.12;
        leftAngle = -0.85 + Math.sin(t * 6.1) * 0.20;
        rightAngle = 0.85 - Math.sin(t * 6.1 + 0.65) * 0.20;
        eyeHeight = 0.72;
        eyeWidth = 1.05;
        mouthOpen = true;
        browTilt = 0.08;
        break;
case 'tired':
  // DIZZY ANIMATION

  // Floating with unstable balance
  bob = -0.07 + Math.sin(t * 2.4) * 0.055;

  // Body swaying from side to side
  bodyRoll = Math.sin(t * 3.2) * 0.15;

  // Slight body rotation
  bodyYaw = Math.sin(t * 2.5) * 0.18;

  // Head wobbling as if dizzy
  headTilt = Math.sin(t * 4.0 + 0.8) * 0.22;
  headYaw = Math.sin(t * 2.8 + 1.1) * 0.20;

  // Arms moving with unstable balance
  leftAngle =
    -0.20 + Math.sin(t * 3.1) * 0.13;

  rightAngle =
    0.20 + Math.sin(t * 3.4 + 0.7) * 0.13;

  // Dizzy facial expression
  eyeHeight = 0.55;
  eyeWidth = 0.94;
  browTilt = -0.12;
  mouthOpen = true;

  break;

      case 'wink':
        headTilt = 0.09;
        leftAngle = -0.15;
        rightAngle = 0.52;
        mouthOpen = true;
        break;
      default:
        break;
    }
    // Periodic natural blink, except explicit face states.
    const blink = (t % 4.8) < 0.14 ? 0.14 : 1;
    if (state === 'idle') eyeHeight *= blink;
    robot.position.y = damp(robot.position.y, bob, 4.6, dt);
    robot.rotation.y = damp(robot.rotation.y, bodyYaw, 3.8, dt);
    robot.rotation.z = damp(robot.rotation.z, bodyRoll, 4.2, dt);
    headPivot.rotation.z = damp(headPivot.rotation.z, headTilt, 5, dt);
    headPivot.rotation.y = damp(headPivot.rotation.y, headYaw, 4.6, dt);

    shoulders[0].pivot.rotation.z = damp(
      shoulders[0].pivot.rotation.z, leftAngle, 4.2, dt);
    shoulders[1].pivot.rotation.z = damp(
      shoulders[1].pivot.rotation.z, rightAngle, 4.2, dt);

    eyes.forEach((eye, i) => {
      const activeHeight = state === 'wink' && i === 1 ? 0.07 : eyeHeight;
      eye.scale.y = damp(eye.scale.y, activeHeight, 9, dt);
      eye.scale.x = damp(eye.scale.x, eyeWidth, 8, dt);
    });
    brows.forEach((brow, i) => {
      const dir = i === 0 ? -1 : 1;
      brow.rotation.z = damp(brow.rotation.z, dir * browTilt, 7, dt);
    });
    smile.visible = !mouthOpen;
    openMouth.visible = mouthOpen;
    mouthPivot.scale.y = damp(mouthPivot.scale.y,
      state === 'tired' ? 0.5 : (state === 'thinking' ? 0.65 : 1), 7, dt);
    antennaPulse();
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(animate);
  }

  function antennaPulse() {
    // No additional lights or textures needed; emissive intensity pulses gently.
    glow.emissiveIntensity = 1.85 + 0.24 * Math.sin(clock.elapsedTime * 2.1);
  }
  animate();

  return {
    setState(nextState) {
      if (['idle', 'thinking', 'happy', 'tired', 'excited', 'wink'].includes(nextState)) {
        state = nextState;
      }
    },
    setGender,
    destroy() {
      if (!active) return;
      active = false;
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      const geometries = new Set();
      scene.traverse((obj) => {
        if (obj.isMesh && obj.geometry) geometries.add(obj.geometry);
      });
      geometries.forEach(g => g.dispose());
      materialList.forEach(m => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    }
  };
}
