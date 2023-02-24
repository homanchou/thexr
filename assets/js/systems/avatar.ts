import { XRS } from "../xrs";
import { throttleTime } from "rxjs/operators";
import { MeshBuilder } from "@babylonjs/core/Meshes";
import { Quaternion } from "@babylonjs/core/Maths/math";

export class SystemAvatar {
  name = "avatar";
  xrs: XRS;
  init(xrs: XRS) {
    this.xrs = xrs;
    this.xrs.services.bus.head_movement
      .pipe(throttleTime(50))
      .subscribe(({ pos, rot }) => {
        this.xrs.send_command(
          {
            eid: this.xrs.config.member_id,
            set: { avatar: "box", pos, rot },
          },
          false
        );
      });

    this.xrs.services.bus.on_set(["avatar"]).subscribe((cmd) => {
      console.log("avatar receiving", cmd);
      const scene = this.xrs.services.engine.scene;
      let mesh = scene.getMeshByName(cmd.eid);
      if (!mesh) {
        mesh = MeshBuilder.CreateBox(cmd.eid, {});
      }
      mesh.position.fromArray(cmd.set?.pos);
      mesh.rotationQuaternion = Quaternion.FromArray(cmd.set?.rot);
    });
  }
}
