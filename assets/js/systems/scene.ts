import { Engine } from "@babylonjs/core/Engines";
import { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/";
import { Vector3 } from "@babylonjs/core/Maths/math";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import "@babylonjs/core/Materials/standardMaterial";
import { XRS } from "../xrs";

export class SystemScene {
  public canvas: HTMLCanvasElement;
  public name: "scene";
  public xrs: XRS;
  init(xrs: XRS) {
    this.xrs = xrs;
    this.create_canvas();
    this.create_scene();
    this.xrs.bus.commands_to_process.subscribe((v) => {
      console.log("scene gets a stab at", v);
    });
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
    const scene = new Scene(engine);
    this.xrs.scene = scene;

    const camera: FreeCamera = new FreeCamera("free", Vector3.Zero(), scene);
    camera.attachControl(this.canvas, true);

    camera.onViewMatrixChangedObservable.add((cam) => {
      // bus.next({
      //   pos: cam.position.asArray(),
      //   rot: cam.absoluteRotation.asArray(),
      // });
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
  }
}
