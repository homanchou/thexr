import { XRS } from "../xrs";
import * as BABYLON from "babylonjs";
export class SystemTransform {
  public xrs: XRS;
  public name = "transform";
  public scene: BABYLON.Scene;
  init(xrs: XRS) {
    this.xrs = xrs;
    this.scene = this.xrs.services.engine.scene;

    this.xrs.services.bus.on_set(["pos"]).subscribe((cmd) => {
      const entity = this.scene.getMeshByName(cmd.eid);
      if (entity) {
        entity.position.fromArray(cmd.set?.pos);
      }
    });
    this.xrs.services.bus.on_set(["rot"]).subscribe((cmd) => {
      const entity = this.scene.getMeshByName(cmd.eid) as BABYLON.TransformNode;
      if (cmd.set!.rot!.length === 4) {
        entity.rotationQuaternion = BABYLON.Quaternion.FromArray(cmd.set!.rot);
      } else {
        entity.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(
          cmd.set!.rot[0],
          cmd.set!.rot[1],
          cmd.set!.rot[2]
        );
      }
    });
    this.xrs.services.bus.on_set(["rot"]).subscribe((cmd) => {
      const entity = this.scene.getMeshByName(cmd.eid) as BABYLON.TransformNode;
      if (cmd.set!.rot!.length === 4) {
        entity.rotationQuaternion = BABYLON.Quaternion.FromArray(cmd.set!.rot);
      } else {
        entity.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(
          cmd.set!.rot[0],
          cmd.set!.rot[1],
          cmd.set!.rot[2]
        );
      }
    });

    this.xrs.services.bus.on_set(["scale"]).subscribe((cmd) => {
      const entity = this.scene.getMeshByName(cmd.eid) as BABYLON.TransformNode;
      entity.scaling.fromArray(cmd.set!.scale);
    });
  }
}
