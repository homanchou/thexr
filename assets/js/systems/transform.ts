import { XRS } from "../xrs";
import { filter } from "rxjs/operators";
import { command_has_component_set } from "../entity_component_store";
export class SystemTransform {
  name = "transform";
  xrs: XRS;
  init(xrs: XRS) {
    this.xrs = xrs;
    this.xrs.bus.commands_to_process
      .pipe(filter((cmd) => command_has_component_set(cmd, "pos")))
      .subscribe((cmd) => {
        const mesh = this.xrs.scene.getMeshByName(cmd.eid);
        if (mesh) {
          mesh.position.fromArray(cmd.set?.pos);
        }
      });
    // this.xrs.bus.commands_to_process
    //   .pipe(
    //     filter(
    //       (cmd) =>
    //         cmd.cp.find((cmp) => cmp.path === "pos" && cmp.op === "set") !==
    //         undefined
    //     )
    //   )
    //   .subscribe((cmd) => {
    //     const mesh = this.xrs.scene.getMeshByName(cmd.eid)
    //     if (mesh) {
    //         mesh.position.fromArray(cmd.cp["pos"])
    //     }
    //   });
  }
}
