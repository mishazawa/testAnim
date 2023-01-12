import * as THREE from 'three';

// env map
import { DebugEnvironment } from 'three/examples/jsm/environments/DebugEnvironment.js';
import { GLTFLoader }       from 'three/examples/jsm/loaders/GLTFLoader';

// FXAA
import { EffectComposer }   from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass }       from 'three/examples/jsm/postprocessing/RenderPass';
import { ShaderPass }       from 'three/examples/jsm/postprocessing/ShaderPass';
import { FXAAShader }       from 'three/examples/jsm/shaders/FXAAShader';

const MODEL_URL = 'assets/models/safe_small.glb';

const NAME_TOKENS    = 'Tokens';
const NAME_PLATE     = 'Plate';
const NAME_ANIMATION = 'Opening';

const loadGltf = url => new Promise((res, rej) => new GLTFLoader().load(url, data => res(data), undefined, rej));


const MATERIAL_BASE = {
  color: new THREE.Color(0x354350),
  roughness: .45,
};

const MATERIAL_TOKENS = {
  color: new THREE.Color(0xAFAFAF),
  roughness: .2,
  metalness: .5,
};

const CAMERA_PROPS = {
  fov: 50,
  x: 0,
  y: 1,
  z: 4.5,
}

let container = null;
let renderer  = null;
let mixer     = null;
let camera    = null;
let scene     = null;
let envMap    = null;
let clock     = null;
let animation = null;
let composer  = null;

/*
  Usage:

  init(container id).then(() => playAnimation());

  to play animation backward

  playAnimation(backwards)
*/

export function init(id = 'container') {
  container = document.getElementById(id);

  return configureScene()
    .then(() => loadGltf(MODEL_URL))
    .then((gltf) => {
      addGeometry(gltf);
      addAnimation(gltf);

      container.appendChild(renderer.domElement);
      window.addEventListener('resize', onWindowResize);

      animate();
    });
}

export function playAnimation(backward = false) {
  animation.reset()
  animation.timeScale = 1;

  if (backward) {
    animation.time = animation.getClip().duration;
    animation.timeScale = -1;
  }

  animation.play();
}

function configureScene() {
  // create renderer
  renderer = new THREE.WebGLRenderer({alpha: true});
  renderer.physicallyCorrectLights = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( container.offsetWidth, container.offsetHeight );

  // generate environment texture
  // https://threejs.org/docs/?q=PMREMGenerator#api/en/extras/PMREMGenerator
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  THREE.DefaultLoadingManager.onLoad = () => pmremGenerator.dispose();
  pmremGenerator.compileCubemapShader();

  const envScene = new DebugEnvironment();
  envMap = pmremGenerator.fromScene(envScene);

  // create scene
  scene = new THREE.Scene();
  scene.environment = envMap.texture;

  // create camera
  camera = new THREE.PerspectiveCamera(CAMERA_PROPS.fov, container.offsetWidth / container.offsetHeight, .1, 1000);
  camera.position.x = CAMERA_PROPS.x;
  camera.position.y = CAMERA_PROPS.y;
  camera.position.z = CAMERA_PROPS.z;


  // clock for animation mixer
  clock = new THREE.Clock(true);

  // create postfx stack for FXAA
  composer = new EffectComposer(renderer);
  composer.insertPass(new RenderPass(scene, camera), 0)
  composer.addPass(antialiasPass());

  return Promise.resolve()
}

function addGeometry(model) {
  const safe = model.scene;
  const material = new THREE.MeshPhysicalMaterial(MATERIAL_BASE);

  // set base material
  safe.traverse((c) => {
    c.material = material;
  });

  // set material for tokens
  const tokens              = safe.getObjectByName(NAME_TOKENS);
  tokens.material           = material.clone();
  tokens.material.color     = MATERIAL_TOKENS.color;
  tokens.material.roughness = MATERIAL_TOKENS.roughness;
  tokens.material.metalness = MATERIAL_TOKENS.metalness;

  // const plate  = safe.getObjectByName(NAME_PLATE)

  scene.add(safe)

  camera.lookAt(0, 1, 0);
}

function addAnimation({ animations, scene }) {
  const currentClip = THREE.AnimationClip.findByName(animations, NAME_ANIMATION);

  mixer = new THREE.AnimationMixer(scene);
  animation = mixer.clipAction(currentClip);
  animation.loop = THREE.LoopOnce;
  animation.clampWhenFinished = true;
}

function animate() {
  requestAnimationFrame(animate);
  render();
}

function render() {
  const dt = clock.getDelta();
  mixer.update(dt)
  composer.render();
}

function antialiasPass () {
  const fxaaPass = new ShaderPass(FXAAShader);
  const pixelRatio = renderer.getPixelRatio();
  const [w, h] = [container.offsetWidth, container.offsetHeight];
  fxaaPass.material.uniforms[ 'resolution' ].value.x = 1 / ( w * pixelRatio );
  fxaaPass.material.uniforms[ 'resolution' ].value.y = 1 / ( h * pixelRatio );
  return fxaaPass
}

function onWindowResize() {
  camera.aspect = container.offsetWidth / container.offsetHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(container.offsetWidth, container.offsetHeight);
}

