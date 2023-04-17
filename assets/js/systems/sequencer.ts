import { XRS } from "../xrs";

export class SystemSequencer {
  public xrs: XRS;
  public name = "sequencer";
  init(xrs: XRS) {
    this.xrs = xrs;
    this.xrs.services.bus.on_set(["sequencer"]).subscribe((cmd) => {
      const scene = this.xrs.services.engine.scene;
      console.debug("sequencer", cmd);
      //   if (cmd.set && cmd.set["shape"] === "cylinder") {
      //     const cylinder = MeshBuilder.CreateCylinder(cmd.eid, {}, scene);
      //   } else if (cmd.set && cmd.set["shape"] === "sphere") {
      //     const cylinder = MeshBuilder.CreateSphere(cmd.eid, {}, scene);
      //   }
    });
  }
}
