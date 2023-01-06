import { Engine } from "@babylonjs/core/Engines";
import { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/";
import { Vector3 } from "@babylonjs/core/Maths/math";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import "@babylonjs/core/Materials/standardMaterial";
import { Subject } from "rxjs/internal/Subject";

export const makeScene = (spaceId: string, bus: Subject<any>) => {
  const canvas = document.getElementById(spaceId) as HTMLCanvasElement;
  // initialize babylon scene and engine
  const engine = new Engine(canvas, true);
  const scene = new Scene(engine);

  const camera: FreeCamera = new FreeCamera("free", Vector3.Zero(), scene);

  camera.attachControl(canvas, true);

  camera.onViewMatrixChangedObservable.add((cam) => {
    bus.next({
      pos: cam.position.asArray(),
      rot: cam.absoluteRotation.asArray(),
    });
  });

  const light1: HemisphericLight = new HemisphericLight(
    "light1",
    new Vector3(1, 1, 0),
    scene
  );
  const sphere: Mesh = MeshBuilder.CreateSphere(
    "sphere",
    { diameter: 1 },
    scene
  );
  sphere.position.z = 5;

  window.addEventListener("resize", () => {
    engine.resize();
  });

  engine.runRenderLoop(() => {
    scene.render();
  });
};
