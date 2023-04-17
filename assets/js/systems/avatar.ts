import { XRS } from "../xrs";
import { throttleTime } from "rxjs/operators";
import * as BABYLON from "babylonjs";

export class SystemAvatar {
  name = "avatar";
  xrs: XRS;
  init(xrs: XRS) {
    this.xrs = xrs;

    this.xrs.services.bus.entered_space.subscribe(() => {
      this.xrs.services.broker.create_channel();
      // start sending head movement after we have joined
      this.xrs.services.bus.head_movement
        .pipe(throttleTime(50))
        .subscribe(({ pos, rot }) => {
          this.xrs.services.broker.channel.push("imoved", {
            head: { pos, rot },
          });
        });
    });

    this.xrs.services.bus.on_set(["avatar"]).subscribe((cmd) => {
      if (cmd.eid !== this.xrs.config.member_id) {
        let mesh = this.xrs.services.engine.scene.getMeshByName(cmd.eid);
        if (!mesh) {
          mesh = BABYLON.MeshBuilder.CreateBox(cmd.eid, {});
        }
      }
    });

    this.xrs.services.bus.on_del(["avatar"]).subscribe((cmd) => {
      let mesh = this.xrs.services.engine.scene.getMeshByName(cmd.eid);
      mesh?.dispose();
    });

    this.xrs.services.bus.on_set(["avatar_pose"]).subscribe((cmd) => {
      const mesh = this.xrs.services.engine.scene.getMeshByName(cmd.eid);
      if (mesh) {
        mesh.position.fromArray(cmd.set?.avatar_pose.head.pos);
        mesh.rotationQuaternion = BABYLON.Quaternion.FromArray(
          cmd.set?.avatar_pose.head.rot
        );
      }
    });
  }
}
