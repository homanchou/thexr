import { Engine } from "@babylonjs/core/Engines";
import { Scene } from "@babylonjs/core/scene";
import "@babylonjs/core/Debug/debugLayer"; // Augments the scene with the debug methods
import "@babylonjs/inspector"; // Injects a local ES6 version of the inspector to prevent automatically relying on the none compatible version

import { MeshBuilder } from "@babylonjs/core/Meshes/";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import "@babylonjs/core/Materials/standardMaterial";
import { XRS } from "../xrs";
import { fromBabylonObservable, truncate } from "../misc";

export class ServiceEngine {
  public canvas: HTMLCanvasElement;
  public name = "scene";
  public xrs: XRS;
  public free_camera: FreeCamera;
  public scene: Scene;

  init(xrs: XRS) {
    this.xrs = xrs;

    this.create_canvas();
    this.create_scene();
  }

  create_canvas() {
    this.canvas = document.createElement("canvas") as HTMLCanvasElement;
    this.canvas.id = this.xrs.config.space_id;
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.zIndex = "1";
    this.canvas.style.position = "absolute";
    this.canvas.style.touchAction = "none";
    this.canvas.style.outline = "none";

    document.body.append(this.canvas);
  }

  create_scene() {
    // initialize babylon scene and engine
    const engine = new Engine(this.canvas, true);
    this.scene = new Scene(engine);
    window["scene"] = this.scene;
    this.free_camera = new FreeCamera("free", Vector3.Zero(), this.scene);
    this.free_camera.attachControl(this.canvas, true);
    this.free_camera.inertia = 0;
    this.free_camera.angularSensibility = 500;
    this.free_camera.minZ = 0.1;

    fromBabylonObservable(
      this.free_camera.onViewMatrixChangedObservable
    ).subscribe((cam) => {
      this.xrs.services.bus.head_movement.next({
        pos: cam.position.asArray(),
        rot: cam.absoluteRotation.asArray(),
      });
      // might want to do something with camera "head" movement
      // such as detect gestures, stepping over things, trigger other events
      // notify others etc
    });

    const light1: HemisphericLight = new HemisphericLight(
      "light1",
      new Vector3(1, 1, 0),
      this.scene
    );
    const sphere: Mesh = MeshBuilder.CreateSphere(
      "sphere",
      { diameter: 1 },
      this.scene
    );
    sphere.position.z = 5;

    const sphere1: Mesh = MeshBuilder.CreateSphere(
      "sphere1",
      { diameter: 0.5 },
      this.scene
    );
    sphere1.position.z = 5;
    sphere1.position.y = 3;

    window.addEventListener("resize", () => {
      engine.resize();
    });

    engine.runRenderLoop(() => {
      this.scene.render();
    });
  }
}
