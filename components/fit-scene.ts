/** Three.js mannequin for the fit visualizer. Loaded on the client only, from
 * `FitViewer`, so the Worker bundle never carries three.js. Units are
 * centimetres; the body is built from the rider's measurements and the garment
 * is a translucent shell at the chart dimensions of the chosen size, coloured
 * by zone. Where the body shows through the shell, the garment is tight. */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Body, GarmentDims, GarmentType, ZoneStatus } from "@/lib/fit";

export type SceneModel = { body: Body; garment: GarmentDims; type: GarmentType; zones: Record<string, ZoneStatus> };
export const ZONE_COLOURS: Record<ZoneStatus, string> = { tight: "#c0392b", snug: "#d58b1f", good: "#2e8b57", loose: "#2f6fb2", baggy: "#5b4bb5" };

const DEPTH = 0.72;
/** Half-width of an ellipse with this circumference and a depth/width ratio of DEPTH. */
const rad = (circumference: number) => (circumference / (2 * Math.PI)) * 1.15;

function lathe(points: [number, number][], material: THREE.Material) {
  const geometry = new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(Math.max(x, 0.1), y)), 48);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.z = DEPTH;
  return mesh;
}
function shell(status: ZoneStatus | undefined) {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(ZONE_COLOURS[status || "good"]), transparent: true, opacity: 0.55, roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide, depthWrite: false });
}

function buildBody(body: Body, group: THREE.Group) {
  const H = body.height;
  const yShoulder = H * 0.82, yChest = H * 0.73, yWaist = H * 0.62, yHip = H * 0.52, yCrotch = H * 0.48;
  const skin = new THREE.MeshStandardMaterial({ color: 0xb9c3bd, roughness: 0.75, metalness: 0.02 });
  group.add(lathe([[6, yShoulder + 5], [body.shoulder / 2 * 0.92, yShoulder], [rad(body.chest), yChest], [rad(body.waist), yWaist], [rad(body.hips), yHip], [rad(body.hips) * 0.9, yCrotch]], skin));
  const head = new THREE.Mesh(new THREE.SphereGeometry(10.5, 32, 24), skin);
  head.position.y = H - 11; head.scale.set(0.9, 1.1, 0.95); group.add(head);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 6.2, H - 20 - yShoulder, 24), skin);
  neck.position.y = (H - 20 + yShoulder) / 2; group.add(neck);
  const angle = 0.2;
  for (const side of [-1, 1]) {
    const length = Math.max(body.sleeve, 40);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(5.2, length - 10.4, 8, 20), skin);
    arm.position.set(side * (body.shoulder / 2 + Math.sin(angle) * length / 2), yShoulder - 2 - Math.cos(angle) * length / 2, 0);
    arm.rotation.z = -side * angle; group.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(4.6, 20, 16), skin);
    hand.position.set(side * (body.shoulder / 2 + Math.sin(angle) * length), yShoulder - 2 - Math.cos(angle) * length - 3, 0);
    hand.scale.set(0.8, 1.2, 0.5); group.add(hand);
    const inseam = Math.max(body.inseam, 50);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(rad(body.thigh) * 0.95, rad(body.thigh) * 0.6, inseam, 28), skin);
    leg.position.set(side * rad(body.hips) * 0.5, yCrotch - inseam / 2, 0); group.add(leg);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(9, 6, 24), skin);
    foot.position.set(side * rad(body.hips) * 0.5, yCrotch - inseam - 3, 6); group.add(foot);
  }
}

function buildGarment(model: SceneModel, group: THREE.Group) {
  const { body, garment: g, zones } = model;
  const H = body.height;
  const yShoulder = H * 0.82, yChest = H * 0.73, yWaist = H * 0.62, yHip = H * 0.52, yCrotch = H * 0.48;
  if (model.type === "jacket") {
    const mid = (yChest + yWaist) / 2, midR = rad((g.chest + g.waist) / 2);
    group.add(lathe([[g.shoulder / 2 * 0.98 + 1.5, yShoulder + 4], [g.shoulder / 2 + 1, yShoulder - 3], [rad(g.chest) + 1, yShoulder - 6]], shell(zones.shoulder)));
    group.add(lathe([[rad(g.chest) + 1, yShoulder - 6], [rad(g.chest) + 1.2, yChest], [midR + 1, mid]], shell(zones.chest)));
    group.add(lathe([[midR + 1, mid], [rad(g.waist) + 1.2, yWaist], [rad(g.waist) + 3.5, yHip + 3]], shell(zones.waist)));
    const angle = 0.2;
    for (const side of [-1, 1]) {
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(7.6, 6.6, g.sleeve, 24, 1, true), shell(zones.sleeve));
      sleeve.position.set(side * (g.shoulder / 2 + Math.sin(angle) * g.sleeve / 2), yShoulder - 1 - Math.cos(angle) * g.sleeve / 2, 0);
      sleeve.rotation.z = -side * angle; group.add(sleeve);
    }
  } else {
    const mid = (yWaist + yHip) / 2, midR = rad((g.waist + g.hips) / 2);
    group.add(lathe([[rad(g.waist) + 1, yWaist - 1], [midR + 1, mid]], shell(zones.waist)));
    group.add(lathe([[midR + 1, mid], [rad(g.hips) + 1.2, yHip], [rad(g.hips) * 0.96 + 1, yCrotch - 2]], shell(zones.hips)));
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(rad(g.thigh) + 0.8, rad(g.thigh) * 0.72 + 0.8, g.inseam - 6, 28, 1, true), shell(zones.thigh));
      leg.position.set(side * rad(body.hips) * 0.5, yCrotch - 2 - (g.inseam - 6) / 2, 0); group.add(leg);
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(rad(g.thigh) * 0.72 + 1.2, rad(g.thigh) * 0.72 + 1.2, 6, 28, 1, true), shell(zones.inseam));
      cuff.position.set(side * rad(body.hips) * 0.5, yCrotch - 2 - (g.inseam - 6) - 3, 0); group.add(cuff);
    }
  }
}

function build(model: SceneModel) {
  const group = new THREE.Group();
  buildBody(model.body, group);
  buildGarment(model, group);
  return group;
}
function disposeGroup(group: THREE.Group) {
  group.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const m = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(m)) m.forEach((x) => x.dispose()); else m?.dispose();
  });
}

export function mountFitScene(container: HTMLElement, initial: SceneModel) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.domElement.style.display = "block";
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 3000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false; controls.autoRotate = true; controls.autoRotateSpeed = 1.4; controls.minDistance = 120; controls.maxDistance = 700;
  controls.addEventListener("start", () => { controls.autoRotate = false; });
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa8a0, 1.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(120, 260, 180); scene.add(sun);
  const back = new THREE.DirectionalLight(0xdfe8ff, 0.6); back.position.set(-150, 120, -200); scene.add(back);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(48, 48), new THREE.MeshStandardMaterial({ color: 0xe3e9e4, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  let group = build(initial); scene.add(group);
  const frame = (m: SceneModel) => { const H = m.body.height; camera.position.set(0, H * 0.56, H * 1.5); controls.target.set(0, H * 0.5, 0); controls.update(); };
  frame(initial);
  const resize = () => { const w = container.clientWidth || 300, h = container.clientHeight || 420; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  resize();
  const observer = new ResizeObserver(resize); observer.observe(container);
  let raf = 0;
  const loop = () => { controls.update(); renderer.render(scene, camera); raf = requestAnimationFrame(loop); };
  loop();
  return {
    update(m: SceneModel) { scene.remove(group); disposeGroup(group); group = build(m); scene.add(group); frame(m); },
    dispose() { cancelAnimationFrame(raf); observer.disconnect(); controls.dispose(); disposeGroup(group); renderer.dispose(); renderer.domElement.remove(); },
  };
}
