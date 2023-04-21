import { XRS } from "../xrs";
import { throttleTime } from "rxjs/operators";
import * as BABYLON from "babylonjs";
import { PosRot, ServiceBus } from "../services/bus";
import { throttleByMovement } from "../utils/misc";

export class SystemAvatar {
  name = "avatar";
  xrs: XRS;
  avatars: { [member_id: string]: Avatar } = {};
  init(xrs: XRS) {
    this.xrs = xrs;

    this.xrs.services.bus.entered_space.subscribe(() => {
      this.xrs.services.broker.create_channel();
      // start sending head movement after we have joined
      this.xrs.services.bus.head_movement
        .pipe(throttleTime(50))
        .pipe(throttleByMovement(0.005))
        .subscribe(({ pos, rot }) => {
          this.xrs.services.broker.channel.push("imoved", {
            head: { pos, rot },
          });
        });
    });

    this.xrs.services.bus.on_set(["avatar"]).subscribe((cmd) => {
      console.log("creating avatar");
      // let mesh = this.xrs.services.engine.scene.getMeshByName(cmd.eid);
      // if (!mesh) {
      //   mesh = BABYLON.MeshBuilder.CreateBox(cmd.eid, {});
      // }
      let avatar = this.avatars[cmd.eid];
      if (!avatar) {
        avatar = new Avatar(cmd.eid, this.xrs);
        this.avatars[cmd.eid] = avatar;
      }
    });

    this.xrs.services.bus.on_del(["avatar"]).subscribe((cmd) => {
      // let mesh = this.xrs.services.engine.scene.getMeshByName(cmd.eid);
      // mesh?.dispose();
      const avatar = this.avatars[cmd.eid];
      if (avatar) {
        avatar.dispose();
      }
      delete this.avatars[cmd.eid];
    });

    this.xrs.services.bus.on_set(["avatar_pose"]).subscribe((cmd) => {
      return;
      // const mesh = this.xrs.services.engine.scene.getMeshByName(cmd.eid);
      // if (mesh) {
      //   mesh.position.fromArray(cmd.set?.avatar_pose.head.pos);
      //   mesh.rotationQuaternion = BABYLON.Quaternion.FromArray(
      //     cmd.set?.avatar_pose.head.rot
      //   );
      // }
      const avatar = this.avatars[cmd.eid];
      if (avatar) {
        avatar.pose(cmd.set?.avatar_pose);
      }
    });
  }
}

class Avatar {
  public height: number; // actual height of user

  public headTransform: BABYLON.TransformNode;
  public leftTransform: BABYLON.TransformNode;
  public rightTransform: BABYLON.TransformNode;

  public headMesh: BABYLON.AbstractMesh;
  public rightHandMesh: BABYLON.AbstractMesh;
  public leftHandMesh: BABYLON.AbstractMesh;
  public scene: BABYLON.Scene;

  public bus: ServiceBus;

  constructor(public member_id: string, public xrs: XRS) {
    this.scene = this.xrs.services.engine.scene;
    this.bus = this.xrs.services.bus;
    this.createHeadIfNotExist();

    this.createHandIfNotExist("left");

    this.setHandRaisedPosition(this.leftTransform, "left");

    this.createHandIfNotExist("right");
    this.setHandRaisedPosition(this.rightTransform, "right");
  }

  dispose() {
    this.headTransform.dispose();
    this.leftTransform.dispose();
    this.rightTransform.dispose();
    this.headMesh.dispose();
    this.leftHandMesh.dispose();
    this.rightHandMesh.dispose();
  }

  createHeadIfNotExist() {
    const headTransformName = `${this.member_id}_avatar_head_transform`;
    const headName = `${this.member_id}_avatar_head`;
    const headT = this.scene.getTransformNodeByName(headTransformName);

    if (!headT) {
      this.headTransform = new BABYLON.TransformNode(
        headTransformName,
        this.scene
      );
      this.headTransform.rotationQuaternion = new BABYLON.Quaternion();

      const box = BABYLON.MeshBuilder.CreateBox(
        headName,
        { size: 0.3 },
        this.scene
      );
      box.isPickable = false;
      // box.metadata ||= {};
      // box.metadata["member_id"] = member_id;
      // BABYLON.Tags.AddTagsTo(box, "avatar");
      box.visibility = 0.5;
      if (this.member_id === this.xrs.config.member_id) {
        // don't draw my own head, it gets in the way

        box.setEnabled(false);
      }
      this.headMesh = box;
      this.headMesh.parent = this.headTransform;
    }
  }

  createHandIfNotExist(hand: string) {
    const transformName = `${this.member_id}_avatar_${hand}_transform`;
    const meshName = `${this.member_id}_avatar_${hand}`;
    let transform = this.scene.getTransformNodeByName(transformName);
    if (!transform) {
      transform = new BABYLON.TransformNode(transformName, this.scene);
      transform.rotationQuaternion = new BABYLON.Quaternion();
      this[`${hand}Transform`] = transform;
      const mesh = BABYLON.MeshBuilder.CreateBox(
        meshName,
        { width: 0.053, height: 0.08, depth: 0.1 },
        this.scene
      );

      mesh.isPickable = false;
      mesh.visibility = 0.5;
      this[`${hand}HandMesh`] = mesh;
      mesh.parent = transform;
    }
  }

  setHandRaisedPosition(handTransform: BABYLON.TransformNode, hand: string) {
    if (handTransform?.parent) {
      return;
    }
    let offset;
    if (hand[0] === "l") {
      offset = [-0.2, 0, 0.2];
    } else {
      offset = [0.2, 0, 0.2];
    }
    // first parent to head so that our adjustments on local space...
    if (this.member_id != this.xrs.config.member_id) {
      handTransform.parent = this.headTransform;
    } else {
      handTransform.parent = this.scene.activeCamera;
    }
    handTransform.rotationQuaternion?.copyFromFloats(0, 0, 0, 1);
    handTransform.position.copyFromFloats(offset[0], offset[1], offset[2]);
  }

  poseMeshUsingPosRot(node: BABYLON.TransformNode, posRot: PosRot) {
    if (!node) {
      return;
    }
    // if we're getting a hand position, then free the hand from the face
    if (node.parent) {
      node.setParent(null);
    }

    // this.animatables.push(
    //   this.context.BABYLON.Animation.CreateAndStartAnimation(
    //     "",
    //     mesh,
    //     "position",
    //     ANIMATION_FRAME_PER_SECOND,
    //     TOTAL_ANIMATION_FRAMES,
    //     mesh.position,
    //     this.context.BABYLON.Vector3.FromArray(pose.pos),
    //     this.context.BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    //   )
    // );
    node.position.fromArray(posRot.pos);

    let newQuaternion;
    if (posRot.rot.length === 4) {
      newQuaternion = BABYLON.Quaternion.FromArray(posRot.rot);
    } else if (posRot.rot.length === 3) {
      newQuaternion = BABYLON.Quaternion.FromEulerAngles(
        posRot.rot[0],
        posRot.rot[1],
        posRot.rot[2]
      );
    }
    node.rotationQuaternion = newQuaternion;
    // this.animatables.push(
    //   this.context.BABYLON.Animation.CreateAndStartAnimation(
    //     "",
    //     mesh,
    //     "rotationQuaternion",
    //     ANIMATION_FRAME_PER_SECOND,
    //     TOTAL_ANIMATION_FRAMES,
    //     mesh.rotationQuaternion,
    //     newQuaternion,
    //     this.context.BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    //   )
    // );
  }

  pose(p: { head: PosRot; left?: PosRot; right?: PosRot }) {
    // this.stopPreviousAnimations();
    // this.poseMeshUsingPosRot(this.head, avatarComponent.head);
    this.bus.animate_translate.next({
      target: this.headTransform,
      from: this.headTransform.position,
      to: BABYLON.Vector3.FromArray(p.head.pos),
      duration: 100,
    });

    // this.signalHub.service.emit("animate_translate", {
    //   target: this.headTransform,
    //   from: this.headTransform.position,
    //   to: this.data.head.pos,
    //   duration: 100,
    // });

    this.bus.animate_rotation.next({
      target: this.headTransform,
      from: this.headTransform.rotationQuaternion as BABYLON.Quaternion,
      to: BABYLON.Quaternion.FromArray(p.head.rot),
      duration: 100,
    });

    // this.signalHub.service.emit("animate_rotation", {
    //   target: this.headTransform,
    //   from: this.headTransform.rotationQuaternion,
    //   to: this.data.head.rot,
    //   duration: 100,
    // });

    if (p.left) {
      this.poseMeshUsingPosRot(this.leftTransform, p.left);
    } else {
      this.setHandRaisedPosition(this.leftTransform, "left");
    }
    if (p.right) {
      this.poseMeshUsingPosRot(this.rightTransform, p.right);
    } else {
      this.setHandRaisedPosition(this.rightTransform, "right");
    }
  }
}
