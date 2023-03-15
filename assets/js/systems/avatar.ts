import { XRS } from "../xrs";
import { throttleTime } from "rxjs/operators";
import { MeshBuilder } from "@babylonjs/core/Meshes";
import { Quaternion } from "@babylonjs/core/Maths/math";
import { UniversalCamera } from "@babylonjs/core";

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
      console.log("avatar was set for ", cmd);
      if (cmd.eid !== this.xrs.config.member_id) {
        let mesh = this.xrs.services.engine.scene.getMeshByName(cmd.eid);
        if (!mesh) {
          mesh = MeshBuilder.CreateBox(cmd.eid, {});
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
        mesh.rotationQuaternion = Quaternion.FromArray(
          cmd.set?.avatar_pose.head.rot
        );
      }
    });

    // this.xrs.services.bus.member_poses.subscribe((payload) => {
    //   const scene = this.xrs.services.engine.scene;
    //   for (const [eid, data] of Object.entries(payload)) {
    //     if (eid === this.xrs.config.member_id) {
    //       // set pref camera position
    //       const cam = this.xrs.services.engine.scene
    //         .activeCamera as UniversalCamera;
    //       if (cam) {
    //         cam.position.fromArray(data.head.pos);
    //         cam.rotationQuaternion = Quaternion.FromArray(data.head.rot);
    //       }
    //     } else {
    //       const mesh = scene.getMeshByName(eid);
    //       if (mesh) {
    //         mesh.position.fromArray(data.head.pos);
    //         mesh.rotationQuaternion = Quaternion.FromArray(data.head.rot);
    //       }
    //     }
    //   }
    // });

    // this.xrs.services.bus.member_moved.subscribe((payload) => {
    //   const scene = this.xrs.services.engine.scene;
    //   const mesh = scene.getMeshByName(payload.eid);
    //   if (mesh) {
    //     mesh.position.fromArray(payload.head.pos);
    //     mesh.rotationQuaternion = Quaternion.FromArray(payload.head.rot);
    //   }
    // });

    // this.xrs.services.bus.presence_state.subscribe((payload) => {
    //   const scene = this.xrs.services.engine.scene;
    //   Object.keys(payload).forEach((entity_id) => {
    //     if (entity_id === this.xrs.config.member_id) {
    //       return;
    //     }
    //     let mesh = scene.getMeshByName(entity_id);
    //     if (!mesh) {
    //       mesh = MeshBuilder.CreateBox(entity_id, {});
    //     }
    //   });
    // });

    // this.xrs.services.bus.presence_diff.subscribe((payload) => {
    //   const scene = this.xrs.services.engine.scene;
    //   Object.keys(payload.joins).forEach((entity_id) => {
    //     if (entity_id === this.xrs.config.member_id) {
    //       return;
    //     }
    //     let mesh = scene.getMeshByName(entity_id);
    //     if (!mesh) {
    //       mesh = MeshBuilder.CreateBox(entity_id, {});
    //     }
    //   });
    //   Object.keys(payload.leaves).forEach((entity_id) => {
    //     let mesh = scene.getMeshByName(entity_id);
    //     mesh?.dispose();
    //   });
    // });

    // this.xrs.services.bus.on_set(["avatar_head"]).subscribe((cmd) => {
    //
    //   const scene = this.xrs.services.engine.scene;
    //   let mesh = scene.getMeshByName(cmd.eid);
    //   if (!mesh) {
    //     mesh = MeshBuilder.CreateBox(cmd.eid, {});
    //   }
    //   // mesh.position.fromArray(cmd.set?.pos);
    //   // mesh.rotationQuaternion = Quaternion.FromArray(cmd.set?.rot);
    // });
  }
}
