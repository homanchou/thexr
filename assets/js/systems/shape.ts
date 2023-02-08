import { XRS } from "../xrs";
import { filter } from "rxjs/operators";
import { MeshBuilder } from "@babylonjs/core";
import { command_has_component_set } from "../entity_component_store";
export class SystemShape {
  name = "shape";
  xrs: XRS;
  init(xrs: XRS) {
    this.xrs = xrs;
    this.xrs.bus.commands_to_process
      .pipe(filter((cmd) => command_has_component_set(cmd, "shape")))
      .subscribe((cmd) => {
        MeshBuilder.CreateBox(cmd.eid, {}, xrs.scene);
      });
  }
}
