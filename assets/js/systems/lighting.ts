import { XRS } from "../xrs";
import * as BABYLON from "babylonjs";

export class SystemLighting {
  public xrs: XRS;
  public name = "lighting";
  init(xrs: XRS) {
    this.xrs = xrs;
    this.xrs.services.bus.on_set(["lighting"]).subscribe((cmd) => {
      const scene = this.xrs.services.engine.scene;
      const lighting = cmd.set!["lighting"] as string;
      new BABYLON.HemisphericLight(
        cmd.eid,
        new BABYLON.Vector3(0, 1, 0),
        scene
      );
    });
  }

  capitalize(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  }
}
