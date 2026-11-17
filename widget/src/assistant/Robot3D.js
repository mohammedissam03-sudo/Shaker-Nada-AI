import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { getCharacter } from './PersonaManager.js';

export function createRobot3D(container, gender = 'male') {
  if (!(container instanceof HTMLElement)) {
    throw new Error('Robot3D requires a valid container');
  }

  const character = getCharacter(gender);
  const primaryColor = new THREE.Color(character.color);

  // 1. Three.js scene
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    40,
    1,
    0.1,
    100
  );

  camera.position.set(0, 0.5, 6);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  });

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, 2)
  );

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  // 2. Lighting
  scene.add(new THREE.AmbientLight(0xffffff, 2));

  const light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(3, 5, 6);
  scene.add(light);

  // 3. Robot group
  const robot = new THREE.Group();
  scene.add(robot);

  const shellMaterial = new THREE.MeshStandardMaterial({
    color: 0xe8eef7,
    metalness: 0.35,
    roughness: 0.3
  });

  const faceMaterial = new THREE.MeshStandardMaterial({
    color: 0x16243c,
    metalness: 0.15,
    roughness: 0.25
  });

  const accentMaterial = new THREE.MeshStandardMaterial({
    color: primaryColor,
    metalness: 0.2,
    roughness: 0.35
  });

  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: primaryColor,
    emissive: primaryColor,
    emissiveIntensity: 1.5
  });

  
// 4. Head
const head = new THREE.Mesh(
  new RoundedBoxGeometry(1.55, 1.18, 0.82, 8, 0.22),
  shellMaterial
);
head.position.y = 0.65;
robot.add(head);

const face = new THREE.Mesh(
  new RoundedBoxGeometry(1.08, 0.78, 0.10, 8, 0.16),
  faceMaterial
);
face.position.set(0, 0.65, 0.43);
robot.add(face);

  // 5. Eyes

  // 5. Interactive eyes and mouth
  const eyes = [];

  for (const x of [-0.30, 0.30]) {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 24, 24),
      eyeMaterial
    );

    eye.position.set(x, 0.72, 0.5);

    robot.add(eye);
    eyes.push(eye);
  }

  // Curved mouth for facial expressions
  const mouth = new THREE.Mesh(
    new THREE.TorusGeometry(
      0.18,
      0.024,
      8,
      32,
      Math.PI
    ),
    eyeMaterial
  );

  mouth.position.set(0, 0.4, 0.52);
  mouth.rotation.z = Math.PI;

  robot.add(mouth);

  // 6. Body
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.48, 0.45, 8, 24),
    shellMaterial
  );
  body.position.y = -0.65;
  robot.add(body);

  const chest = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 24, 24),
    accentMaterial
  );
  chest.position.set(0, -0.55, 0.45);
  robot.add(chest);

  // 7. Arms
  for (const x of [-0.75, 0.75]) {
    const arm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.15, 0.32, 6, 16),
      accentMaterial
    );
    arm.position.set(x, -0.55, 0);
    robot.add(arm);
  }

  // 8. Antenna
  const antenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 0.4),
    shellMaterial
  );
  antenna.position.y = 1.43;
  robot.add(antenna);

  const antennaTip = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 16, 16),
    accentMaterial
  );
  antennaTip.position.y = 1.67;
  robot.add(antennaTip);

  // 9. Responsive sizing
  function resize() {
    const width = container.clientWidth || 300;
    const height = container.clientHeight || 350;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
  }

  resize();

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);


  // 10. Interactive robot animation
  const clock = new THREE.Clock();
  let animationId;
  let running = true;

  let robotState = 'idle';



function animate() {
  if (!running) return;

  // Frame-independent timing
  const delta = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;

  // Lower = slower and smoother transition
  // Higher = faster transition
  const bodySmoothness = 5;
  const faceSmoothness = 7;

  // Default targets: IDLE
  let targetY = Math.sin(time * 2) * 0.12;
  let targetRotY = Math.sin(time) * 0.12;
  let targetRotZ = 0;

  let eyeOpen = 1;
  let eyeWidth = 1;
  let eyeOffset = 0;

  let mouthCurve = 0.08;
  let mouthAngle = Math.PI;

  // Select target pose for the current state
  switch (robotState) {

    case 'thinking':
      targetY = Math.sin(time * 3) * 0.07;
      targetRotY = Math.sin(time * 2) * 0.2;
      targetRotZ = 0.12;

      eyeOpen = 0.75;
      eyeOffset = Math.sin(time * 2) * 0.045;
      mouthCurve = 0.1;
      break;

    case 'happy':
      targetY = Math.abs(Math.sin(time * 5)) * 0.28;
      targetRotY = Math.sin(time * 4) * 0.25;
      targetRotZ = Math.sin(time * 5) * 0.09;

      eyeOpen = 0.5;
      eyeWidth = 1.15;
      mouthCurve = 0.9;
      break;

    case 'tired':
      targetY = -0.14 + Math.sin(time) * 0.035;
      targetRotY = Math.sin(time * 0.5) * 0.05;
      targetRotZ = -0.15;

      eyeOpen = 0.25;
      mouthCurve = 0.4;
      mouthAngle = 0;
      break;

    default:
      // Natural blinking
      eyeOpen = (time % 4.5 < 0.14) ? 0.12 : 1;
      break;
  }

  // Smoothly blend BODY transformations
  robot.position.y = THREE.MathUtils.damp(
    robot.position.y,
    targetY,
    bodySmoothness,
    delta
  );

  robot.rotation.y = THREE.MathUtils.damp(
    robot.rotation.y,
    targetRotY,
    bodySmoothness,
    delta
  );

  robot.rotation.z = THREE.MathUtils.damp(
    robot.rotation.z,
    targetRotZ,
    bodySmoothness,
    delta
  );

  // Smoothly blend EYE expressions
  eyes.forEach((eye, index) => {
    const baseX = index === 0 ? -0.30 : 0.30;
    eye.position.x = THREE.MathUtils.damp(
      eye.position.x,
      baseX + eyeOffset,
      faceSmoothness,
      delta
    );

    eye.scale.y = THREE.MathUtils.damp(
      eye.scale.y,
      eyeOpen,
      faceSmoothness,
      delta
    );

    eye.scale.x = THREE.MathUtils.damp(
      eye.scale.x,
      eyeWidth,
      faceSmoothness,
      delta
    );
  });

  // Smoothly blend MOUTH expressions
  mouth.rotation.z = THREE.MathUtils.damp(
    mouth.rotation.z,
    mouthAngle,
    faceSmoothness,
    delta
  );

  mouth.scale.y = THREE.MathUtils.damp(
    mouth.scale.y,
    mouthCurve,
    faceSmoothness,
    delta
  );

  renderer.render(scene, camera);


  animationId = requestAnimationFrame(animate);
}


  animate();

  // 11. Robot controls and cleanup
  return {
    setState(nextState) {
      const allowedStates = [
        'idle',
        'thinking',
        'happy',
        'tired'
      ];

      if (allowedStates.includes(nextState)) {
        robotState = nextState;
      }
    },

    destroy() {
      running = false;
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();

      scene.traverse((object) => {
        if (object.isMesh) {
          object.geometry.dispose();
        }
      });

      shellMaterial.dispose();
      faceMaterial.dispose();
      accentMaterial.dispose();
      eyeMaterial.dispose();

      renderer.dispose();
      renderer.domElement.remove();
    }
  };
}
