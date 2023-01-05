import { Engine } from "@babylonjs/core/Engines";
import { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/";
import { Vector3 } from "@babylonjs/core/Maths/math";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import "@babylonjs/core/Materials/standardMaterial";

export const makeScene = (spaceId: string) => {
  const canvas = document.getElementById(spaceId) as HTMLCanvasElement;
  // initialize babylon scene and engine
  const engine = new Engine(canvas, true);
  const scene = new Scene(engine);

  const camera: ArcRotateCamera = new ArcRotateCamera(
    "Camera",
    Math.PI / 2,
    Math.PI / 2,
    2,
    Vector3.Zero(),
    scene
  );
  camera.attachControl(canvas, true);
  const light1: HemisphericLight = new HemisphericLight(
    "light1",
    new Vector3(1, 1, 0),
    scene
  );
  var sphere: Mesh = MeshBuilder.CreateSphere("sphere", { diameter: 1 }, scene);

  window.addEventListener("resize", () => {
    engine.resize();
  });

  engine.runRenderLoop(() => {
    scene.render();
  });
};
