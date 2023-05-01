import {
  cameraFrontFloorPosition,
  cameraFrontPosition,
  random_id,
} from "../utils/misc";
import { XRS } from "../xrs";
import * as BABYLON from "babylonjs";

export class SystemShape {
  public xrs: XRS;
  public name = "shape";
  public scene: BABYLON.Scene;

  create_shape(shape: string) {
    const pos = cameraFrontPosition(this.scene, 3);

    this.xrs.send_command({
      eid: `${shape}_${random_id(5)}`,
      set: {
        shape,
        pos,
        holdable: {},
        floor: {},
      },
    });
  }

  init(xrs: XRS) {
    this.xrs = xrs;
    this.scene = this.xrs.services.engine.scene;
    this.xrs.services.bus.on_set(["shape"]).subscribe((cmd) => {
      // don't double create
      if (this.scene.getMeshByName(cmd.eid)) {
        return;
      }
      const shape = cmd.set!["shape"] as string;
      const shape_params = cmd.set!["shape_params"] || {};
      if (
        [
          "box",
          "sphere",
          "cylinder",
          "plane",
          "capsule",
          "ground",
          "cone",
        ].includes(shape)
      ) {
        const builderFunctionName = this.getMeshBuilderFunctionName(shape);
        if (shape === "plane") {
          shape_params["sideOrientation"] = BABYLON.Mesh.DOUBLESIDE;
        }
        if (shape === "cone") {
          shape_params["diameterTop"] = 0;
        }
        const mesh = BABYLON.MeshBuilder[builderFunctionName](
          cmd.eid,
          shape_params
        );
        mesh.rotationQuaternion = new BABYLON.Quaternion();
      } else {
        throw new Error(`unsupported shape ${shape}`);
      }
    });
  }

  getMeshBuilderFunctionName(shape: string) {
    if (shape === "cone") {
      return "CreateCylinder";
    } else {
      return `Create${this.capitalize(shape)}`;
    }
  }

  capitalize(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  }
}
