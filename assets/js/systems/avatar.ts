import { XRS } from "../xrs";
import { map, mergeWith, tap, throttleTime } from "rxjs/operators";
import * as BABYLON from "babylonjs";
import { PosRot, ServiceBus } from "../services/bus";
import {
  camPosRot,
  getPosRot,
  setPos,
  setRot,
  throttleByMovement,
} from "../utils/misc";

export class SystemAvatar {
  name = "avatar";
  xrs: XRS;
  avatars: { [member_id: string]: Avatar } = {};
  bus: ServiceBus;
  init(xrs: XRS) {
    this.xrs = xrs;
    this.bus = this.xrs.services.bus;
    // change this to after channel connected
    this.bus.entered_space.subscribe(() => {
      // TODO, move this line to broker, no reason why avatar should connect the channel
      this.xrs.services.broker.create_channel();

      this.start_sending_avatar_movement();
    });

    this.bus.on_set(["avatar"]).subscribe((cmd) => {
      let avatar = this.avatars[cmd.eid];
      if (!avatar) {
        avatar = new Avatar(cmd.eid, this.xrs);
        this.avatars[cmd.eid] = avatar;
      }
    });

    this.bus.on_del(["avatar"]).subscribe((cmd) => {
      // let mesh = this.xrs.services.engine.scene.getMeshByName(cmd.eid);
      // mesh?.dispose();
      const avatar = this.avatars[cmd.eid];
      if (avatar) {
        avatar.dispose();
      }
      delete this.avatars[cmd.eid];
    });

    this.bus.on_set(["avatar_pose"]).subscribe((cmd) => {
      // const mesh = this.xrs.services.engine.scene.getMeshByName(cmd.eid);
      // if (mesh) {
      //   mesh.position.fromArray(cmd.set?.avatar_pose.head.pos);
      //   mesh.rotationQuaternion = BABYLON.Quaternion.FromArray(
      //     cmd.set?.avatar_pose.head.rot
      //   );
      // }
      if (cmd.eid !== this.xrs.config.member_id) {
        const avatar = this.avatars[cmd.eid];
        if (avatar) {
          console.log("pose", cmd.set?.avatar_pose);
          avatar.pose(cmd.set?.avatar_pose);
        }
      }
    });
  }

  my_avatar() {
    return this.avatars[this.xrs.config.member_id];
  }

  start_sending_avatar_movement() {
    const payload: {
      left: PosRot | null;
      right: PosRot | null;
      head: PosRot | null;
    } = {
      left: null,
      right: null,
      head: null,
    };

    this.bus.exiting_xr.subscribe(() => {
      payload.left = null;
      payload.right = null;
    });

    const leftMovement$ = this.bus.left_hand_moved.pipe(
      throttleTime(25),
      map((grip) => getPosRot(grip)),
      throttleByMovement()
    );

    leftMovement$.subscribe((left) => {
      payload.left = left;
    });

    const rightMovement$ = this.bus.right_hand_moved.pipe(
      throttleTime(25),
      map((grip) => getPosRot(grip)),
      throttleByMovement()
    );

    rightMovement$.subscribe((right) => {
      payload.right = right;
    });

    const camMovement$ = this.bus.head_movement.pipe(
      throttleTime(25),
      map((cam) => camPosRot(cam)),
      throttleByMovement()
    );

    camMovement$.subscribe((cam) => {
      payload.head = cam;
    });

    // merge with combines independent events into one stream, payloads are joined as a side-effect outside of pipe
    camMovement$
      .pipe(mergeWith(leftMovement$, rightMovement$), throttleTime(50))
      .subscribe(() => {
        if (!payload.head) {
          return;
        }

        this.xrs.services.broker.channel.push("imoved", payload);
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
    this.setHandRaisedPosition("left");

    this.createHandIfNotExist("right");
    this.setHandRaisedPosition("right");
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
      this.headTransform.position.y = 1.6; // just a default pos, when we don't have anything else to match our default camera position too

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

  async createHandIfNotExist(hand: string) {
    const transformName = `${this.member_id}_avatar_${hand}_transform`;
    const meshName = `${this.member_id}_avatar_${hand}`;
    let transform = this.scene.getTransformNodeByName(transformName);
    if (!transform) {
      transform = new BABYLON.TransformNode(transformName, this.scene);
      transform.rotationQuaternion = new BABYLON.Quaternion();
      this[`${hand}Transform`] = transform;

      // load hand tracking model
      let mesh_url;
      let mesh_name;
      if (hand === "left") {
        mesh_url = "r_hand_rhs.glb";
        mesh_name = "handMeshRigged_R";
      } else {
        mesh_url = "l_hand_rhs.glb";
        mesh_name = "handMeshRigged_L";
      }

      await BABYLON.SceneLoader.AppendAsync(
        "https://assets.babylonjs.com/meshes/HandMeshes/",
        mesh_url,
        this.scene
      );

      const mesh = this.scene.getMeshByName(mesh_name) as BABYLON.AbstractMesh;

      // const mesh = BABYLON.MeshBuilder.CreateBox(
      //   meshName,
      //   { width: 0.053, height: 0.08, depth: 0.1 },
      //   this.scene
      // );
      mesh.rotation.x = BABYLON.Angle.FromDegrees(90).radians();
      mesh.isPickable = false;
      mesh.visibility = 0.5;
      this[`${hand}HandMesh`] = mesh;
      mesh.parent = transform;
    }
  }

  setHandRaisedPosition(hand: string) {
    const handTransform = this[`${hand}Transform`];
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
    // snap head to this new position and rotation
    setPos(this.headTransform, p.head.pos);
    setRot(this.headTransform, p.head.rot);
    if (p.left) {
      setPos(this.leftTransform, p.left.pos);
      setRot(this.leftTransform, p.left.rot);
    }

    if (p.right) {
      setPos(this.rightTransform, p.right.pos);
      setRot(this.rightTransform, p.right.rot);
    }

    // this.stopPreviousAnimations();
    // this.poseMeshUsingPosRot(this.head, avatarComponent.head);
    // this.bus.animate_translate.next({
    //   target: this.headTransform,
    //   from: this.headTransform.position,
    //   to: BABYLON.Vector3.FromArray(p.head.pos),
    //   duration: 100,
    // });

    // this.signalHub.service.emit("animate_translate", {
    //   target: this.headTransform,
    //   from: this.headTransform.position,
    //   to: this.data.head.pos,
    //   duration: 100,
    // });

    // this.bus.animate_rotation.next({
    //   target: this.headTransform,
    //   from: this.headTransform.rotationQuaternion as BABYLON.Quaternion,
    //   to: BABYLON.Quaternion.FromArray(p.head.rot),
    //   duration: 100,
    // });

    // this.signalHub.service.emit("animate_rotation", {
    //   target: this.headTransform,
    //   from: this.headTransform.rotationQuaternion,
    //   to: this.data.head.rot,
    //   duration: 100,
    // });

    if (p.left) {
      this.poseMeshUsingPosRot(this.leftTransform, p.left);
    } else {
      this.setHandRaisedPosition("left");
    }
    if (p.right) {
      this.poseMeshUsingPosRot(this.rightTransform, p.right);
    } else {
      this.setHandRaisedPosition("right");
    }
  }
}
