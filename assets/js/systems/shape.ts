import { XRS } from "../xrs";
import { MeshBuilder } from "@babylonjs/core/Meshes";

export class SystemShape {
  public xrs: XRS;
  public name = "shape";
  init(xrs: XRS) {
    this.xrs = xrs;
    this.xrs.services.bus.on_set(["shape"]).subscribe((cmd) => {
      console.log("got this", cmd);
      const scene = this.xrs.services.engine.scene;
      if (cmd.set && cmd.set["shape"] === "cylinder") {
        const cylinder = MeshBuilder.CreateCylinder(cmd.eid, {}, scene);
      } else if (cmd.set && cmd.set["shape"] === "sphere") {
        const cylinder = MeshBuilder.CreateSphere(cmd.eid, {}, scene);
      }
    });
  }
}
