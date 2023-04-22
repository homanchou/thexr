import { setPos, setRot, setScale } from "../utils/misc";
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
        setPos(entity, cmd.set!.pos);
      }
    });

    this.xrs.services.bus.on_set(["rot"]).subscribe((cmd) => {
      const entity = this.scene.getMeshByName(cmd.eid);
      if (entity) {
        setRot(entity, cmd.set!.rot);
      }
    });

    this.xrs.services.bus.on_set(["scale"]).subscribe((cmd) => {
      const entity = this.scene.getMeshByName(cmd.eid);
      if (entity) {
        setScale(entity, cmd.set!.scale);
      }
    });

    this.xrs.services.bus.on_del(["parent"]).subscribe((cmd) => {
      const entity = this.scene.getMeshByName(cmd.eid);
      if (entity) {
        entity.parent = null;
      }
    });

    this.xrs.services.bus.on_set(["parent"]).subscribe((cmd) => {
      const entity = this.scene.getMeshByName(cmd.eid);
      if (!entity) {
        return;
      }
      // if already parented to this entity, there is nothing to do
      if (entity.parent?.name === cmd.eid) {
        return;
      }

      // either a transform or another mesh
      const parent =
        this.scene.getTransformNodeByName(cmd.set?.parent) ||
        this.scene.getMeshByName(cmd.set?.parent);

      if (!parent) {
        // maybe the parent doesn't exist yet, for now, do nothing
        return;
      }

      // parenting fights with imposters, so remove the imposter if this was just thrown
      if (entity.physicsImpostor) {
        entity.physicsImpostor.dispose();
        entity.physicsImpostor = null;
      }
      entity.parent = parent;
    });
  }
}
