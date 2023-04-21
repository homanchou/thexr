import { ServiceBus } from "../services/bus";
import type { XRS } from "../xrs";
import * as BABYLON from "babylonjs";

const ANIMATION_FRAME_PER_SECOND = 60;

export class SystemAnimate {
  name = "animate";
  public xrs: XRS;
  public bus: ServiceBus;
  public scene: BABYLON.Scene;
  public animatables: Record<string, BABYLON.Nullable<BABYLON.Animatable>> = {};
  init(xrs: XRS) {
    this.xrs = xrs;
    this.bus = this.xrs.services.bus;
    this.scene = this.xrs.services.engine.scene;
    this.bus.animate_translate.subscribe((req) => {
      let target = req.target;
      if (typeof target === "string") {
        target = this.scene.getMeshByName(target) as BABYLON.AbstractMesh;
      }
      let from = req.from;
      let to = req.to;
      if (Array.isArray(from)) {
        from = BABYLON.Vector3.FromArray(from);
      }
      if (Array.isArray(to)) {
        to = BABYLON.Vector3.FromArray(to);
      }
      const animationName = `translate_${target.name}`;
      if (this.animatables[animationName]) {
        this.animatables[animationName]?.stop();
        delete this.animatables[animationName];
      }
      const animatable = BABYLON.Animation.CreateAndStartAnimation(
        animationName,
        target,
        "position",
        ANIMATION_FRAME_PER_SECOND,
        Math.ceil((req.duration * 60) / 1000),
        from,
        to,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
        undefined,
        () => {
          if (req.callback) {
            req.callback();
            delete this.animatables[animationName];
          }
        },
        this.scene
      );
      this.animatables[animationName] = animatable;
    });

    //rotation
    this.bus.animate_rotation.subscribe((req) => {
      let target = req.target;
      if (typeof target === "string") {
        target = this.scene.getMeshByName(target) as BABYLON.AbstractMesh;
      }
      let from = req.from;
      let to = req.to;
      if (Array.isArray(from)) {
        from = BABYLON.Quaternion.FromArray(from);
      }
      if (Array.isArray(to)) {
        to = BABYLON.Quaternion.FromArray(to);
      }
      const animationName = `rotation_${target.name}`;
      if (this.animatables[animationName]) {
        this.animatables[animationName]?.stop();
        delete this.animatables[animationName];
      }
      const animatable = BABYLON.Animation.CreateAndStartAnimation(
        animationName,
        target,
        "rotationQuaternion",
        ANIMATION_FRAME_PER_SECOND,
        Math.ceil((req.duration * 60) / 1000),
        from,
        to,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
        undefined,
        () => {
          if (req.callback) {
            req.callback();
            delete this.animatables[animationName];
          }
        },
        this.scene
      );
      this.animatables[animationName] = animatable;
    });
  }
}
