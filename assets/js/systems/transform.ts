import { XRS } from "../xrs";
import { MeshBuilder, Mesh, TransformNode } from "@babylonjs/core/Meshes";
import { Quaternion } from "@babylonjs/core/Maths/math";
import { Scene } from "@babylonjs/core/scene";

export class SystemTransform {
  public xrs: XRS;
  public name = "transform";
  public scene: Scene;
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
      const entity = this.scene.getMeshByName(cmd.eid) as TransformNode;
      if (cmd.set!.rot!.length === 4) {
        entity.rotationQuaternion = Quaternion.FromArray(cmd.set!.rot);
      } else {
        entity.rotationQuaternion = Quaternion.FromEulerAngles(
          cmd.set!.rot[0],
          cmd.set!.rot[1],
          cmd.set!.rot[2]
        );
      }
    });
    this.xrs.services.bus.on_set(["rot"]).subscribe((cmd) => {
      const entity = this.scene.getMeshByName(cmd.eid) as TransformNode;
      if (cmd.set!.rot!.length === 4) {
        entity.rotationQuaternion = Quaternion.FromArray(cmd.set!.rot);
      } else {
        entity.rotationQuaternion = Quaternion.FromEulerAngles(
          cmd.set!.rot[0],
          cmd.set!.rot[1],
          cmd.set!.rot[2]
        );
      }
    });

    this.xrs.services.bus.on_set(["scale"]).subscribe((cmd) => {
      const entity = this.scene.getMeshByName(cmd.eid) as TransformNode;
      entity.scaling.fromArray(cmd.set!.scale);
    });
  }
}
