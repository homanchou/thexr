import * as BABYLON from "babylonjs";

import { XRS } from "../xrs";

import { fromBabylonObservable, truncate } from "../utils/misc";

import { PosRot } from "./bus";

export class ServiceEngine {
  public canvas: HTMLCanvasElement;
  public name = "scene";
  public xrs: XRS;
  public free_camera: BABYLON.FreeCamera;
  public scene: BABYLON.Scene;

  init(xrs: XRS) {
    this.xrs = xrs;

    this.create_canvas();
    this.create_scene();
  }

  activeCamera() {
    return this.scene.activeCamera;
  }

  setActiveCameraToPosRot(pos_rot: PosRot) {
    const cam = this.activeCamera() as BABYLON.UniversalCamera;
    cam.position.fromArray(pos_rot.pos);
    cam.rotationQuaternion.copyFromFloats(
      pos_rot.rot[0],
      pos_rot.rot[1],
      pos_rot.rot[2],
      pos_rot.rot[3]
    );
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

    this.xrs.services.bus.entered_space.subscribe(() => {
      this.canvas.focus();
    });
  }

  createFreeCamera() {
    this.free_camera = new BABYLON.FreeCamera(
      "free",
      BABYLON.Vector3.Zero(),
      this.scene
    );
    this.free_camera.attachControl(this.canvas, true);
    this.free_camera.inertia = 0;
    this.free_camera.angularSensibility = 500;
    this.free_camera.minZ = 0.1;
    this.free_camera.rotationQuaternion = new BABYLON.Quaternion();

    fromBabylonObservable(
      this.free_camera.onViewMatrixChangedObservable
    ).subscribe((cam) => {
      this.xrs.services.bus.head_movement.next({
        pos: cam.position.asArray().map((v) => truncate(v)),
        rot: cam.absoluteRotation.asArray().map((v) => truncate(v)),
      });
      // might want to do something with camera "head" movement
      // such as detect gestures, stepping over things, trigger other events
      // notify others etc
    });
  }

  create_scene() {
    // initialize babylon scene and engine
    const engine = new BABYLON.Engine(this.canvas, true);
    this.scene = new BABYLON.Scene(engine);
    window["scene"] = this.scene;
    this.createFreeCamera();

    window.addEventListener("resize", () => {
      engine.resize();
    });

    engine.runRenderLoop(() => {
      this.scene.render();
    });
  }
}
