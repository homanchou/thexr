import { filter, map, race, take } from "rxjs";
import * as BABYLON from "babylonjs";
import type { SystemXR } from "./xr";
import type { XRS } from "../xrs";
import { ServiceBus } from "../services/bus";
import { getSetParentValues, truncate } from "../utils/misc";

/**
 * receives the lower level messages coming from system xr and determines if
 * a mesh was gripped, emitting higher level messages
 */
export class SystemHoldable {
  public name = "holdable";
  // some caching
  public leftHandNode: BABYLON.Node;
  public rightHandNode: BABYLON.Node;
  public left_hand_mesh: BABYLON.AbstractMesh;
  public right_hand_mesh: BABYLON.AbstractMesh;
  // retain some memory of what we're holding here in case controller blip off we can reattach to our grip
  public leftHeldObject: BABYLON.Node;
  public rightHeldObject: BABYLON.Node;
  public systemXR: SystemXR;
  public xrs: XRS;
  public bus: ServiceBus;
  public scene: BABYLON.Scene;

  init(xrs: XRS) {
    this.xrs = xrs;
    this.scene = this.xrs.services.engine.scene;
    this.bus = this.xrs.services.bus;
    this.systemXR = this.xrs.systems.find((s) => s.name === "xr") as SystemXR;

    // avatars always have hands, so when entering XR, have them track with the controllers
    this.parentAvatarHandsToGripWheneverControllersAreOnline("left");
    this.parentAvatarHandsToGripWheneverControllersAreOnline("right");

    // converts continuous squeezes to mesh gripgs if there is a ray intersection with a holdable
    this.detectMeshGrab("left");
    this.detectMeshGrab("right");

    // receives a mesh grip message and parents the mesh, publishes a message and
    // subscribes to a release
    this.parentGrabbedMesh("left");
    this.parentGrabbedMesh("right");

    this.bus.on_set(["holdable"]).subscribe((cmd) => {
      const node =
        this.scene.getMeshByName(cmd.eid) ||
        this.scene.getTransformNodeByName(cmd.eid);
      if (node) {
        BABYLON.Tags.AddTagsTo(node, "holdable");
      }
    });
    this.bus.on_del(["holdable"]).subscribe((cmd) => {
      const node =
        this.scene.getMeshByName(cmd.eid) ||
        this.scene.getTransformNodeByName(cmd.eid);
      if (node) {
        BABYLON.Tags.RemoveTagsFrom(node, "holdable");
      }
    });
  }

  // side effect of receiving a mesh grabbed messaged
  parentGrabbedMeshIntoHand(
    mesh: BABYLON.AbstractMesh,
    hand: "left" | "right"
  ) {
    const handNode = this[`${hand}HandNode`];
    const offset = this.xrs.services.store.get_component(mesh.name, "offset");
    let payload = {};
    if (offset && offset.pos && offset.rot) {
      payload = {
        pos: offset.pos,
        rot: offset.rot,
        parent: handNode.name,
      };
    } else {
      const { pos, rot } = getSetParentValues(mesh, handNode);
      payload = {
        pos: pos.map((v) => truncate(v)),
        rot: rot?.map((v) => truncate(v)),
        parent: handNode.name,
      };
    }

    // tell everyone (and ourselves) you grabbed it
    this.xrs.send_command({ eid: mesh.name, set: payload });

    // this.context.signalHub.outgoing.emit("components_upserted", {
    //   id: this.grabbedMesh.name,
    //   components: {
    //     transform: transform,
    //   },
    // });
  }

  releaseEvents(hand: "left" | "right", grabbedMesh: BABYLON.AbstractMesh) {
    const otherHand = hand[0] === "l" ? "right" : "left";
    return race(
      // if other hand grabbed the same mesh away from the first hand
      this.bus[`${otherHand}_grip_mesh`].pipe(
        filter((data) => data.mesh.name === grabbedMesh.name),
        map(() => "transferred")
      ),
      // OR another player stole our object
      this.bus.on_set(["parent"]).pipe(
        filter((cmd) => cmd.eid === grabbedMesh.name),
        // filter((cmd) => cmd.set?.parent !== null),
        filter((cmd) => cmd.set?.parent.includes(this.xrs.config.member_id)),
        map(() => "taken")
      ),
      //   this.context.signalHub.incoming.on("components_upserted").pipe(
      //     filter(
      //       (msg) =>
      //         msg.id === grabbedMesh.name &&
      //         msg.components?.transform?.parent !== null &&
      //         !msg.components?.transform?.parent.includes(
      //           this.context.my_member_id
      //         )
      //     ),
      //     map(() => "taken")
      // OR the hand released the mesh
      this.bus[`${hand}_grip_released`].pipe(map(() => "released"))
    );
  }
  releaseMesh(mesh: BABYLON.AbstractMesh) {
    // this.grabbedMesh.setParent(null);
    const cmd = {
      eid: mesh.name,
      set: {
        pos: mesh.absolutePosition.asArray().map((v) => truncate(v)),
        rot: mesh.absoluteRotationQuaternion.asArray().map((v) => truncate(v)),
      },
      del: ["parent"],
    };
    this.xrs.send_command(cmd);

    // const payload = {
    //   id: this.entity.name,
    //   components: {
    //     transform: {
    //       position: arrayReduceSigFigs(
    //         this.grabbedMesh.absolutePosition.asArray()
    //       ),
    //       rotation: arrayReduceSigFigs(
    //         this.grabbedMesh.absoluteRotationQuaternion.asArray()
    //       ),
    //       parent: null,
    //     },
    //   },
    // };
    // this.signalHub.outgoing.emit("msg", {
    //   system: "hud",
    //   data: { msg: JSON.stringify(payload) },
    // });
    // this.signalHub.outgoing.emit("components_upserted", payload);
    // this.grabbedMesh = null;
  }

  parentGrabbedMesh(hand: "left" | "right") {
    this.bus[`${hand}_grip_mesh`].subscribe((event) => {
      this.parentGrabbedMeshIntoHand(event.mesh, hand);
      this.releaseEvents(hand, event.mesh)
        .pipe(take(1))
        .subscribe((reason) => {
          this.bus[`${hand}_lost_mesh`].next({
            reason,
            mesh: event.mesh,
          });
          if (reason === "released") {
            this.releaseMesh(event.mesh);
          }
        });
    });
  }

  parentAvatarHandsToGripWheneverControllersAreOnline(hand: "left" | "right") {
    this.bus[`${hand}_controller_added`].subscribe(() => {
      const nodeName = `${this.xrs.config.member_id}_avatar_${hand}_transform`;
      const node = this.scene.getTransformNodeByName(
        nodeName
      ) as BABYLON.TransformNode;
      if (!node) {
        console.error(`no transform node for ${hand}`);
        return;
      }

      // return everything the way it was after we're done
      const prevParent = node.parent;
      const prevPosition = node.position.clone();
      const prevRotation = node.rotationQuaternion!.clone();

      this.bus.exiting_xr.subscribe(() => {
        node.parent = null;
        node.position = prevPosition;
        node.rotationQuaternion = prevRotation;
        node.parent = prevParent;
      });
      node.position = BABYLON.Vector3.Zero();
      node.rotationQuaternion = new BABYLON.Quaternion();

      node.parent = this.xrs.get_grip(hand);
      this[`${hand}HandNode`] = node;
      this[`${hand}_hand_mesh`] = node.getChildMeshes()[0];
      // on a blip, if we were grabbing something, put it in the hand
      const grabbedObject = this[`${hand}HeldObject`];
      if (grabbedObject) {
        grabbedObject.parent = node;
      }
    });
  }

  detectMeshGrab(hand: "left" | "right") {
    this.bus[`${hand}_grip_squeezed`]
      .pipe(
        map(() => {
          return this.findGrabbableMesh(hand);
        }),
        filter((result) => result !== null)
      )
      .subscribe((foundMesh) => {
        // emit that we grabbed a mesh
        this.bus[`${hand}_grip_mesh`].next({
          mesh: foundMesh as BABYLON.AbstractMesh,
        });
      });
  }

  findGrabbableMesh(hand: "left" | "right"): BABYLON.AbstractMesh | null {
    const handMesh = this[`${hand}_hand_mesh`];

    const holdableMeshes = this.scene.getMeshesByTags("holdable");
    for (let i = 0; i < holdableMeshes.length; i++) {
      if (handMesh.intersectsMesh(holdableMeshes[i])) {
        return holdableMeshes[i];
      }
    }
    return null;
  }
}

// type HoldableType = {
//   offset?: { pos: number[]; rot: number[] };
// };

// export class BehaviorHoldable implements IBehavior {
//   data: HoldableType;
//   entity: Entity;
//   subscriptions: Subscription[] = [];
//   signalHub: SignalHub;
//   context: Context;
//   grabbedMesh: BABYLON.AbstractMesh;
//   constructor(public system: SystemHoldable) {
//     this.context = this.system.context;
//     this.signalHub = this.system.context.signalHub;
//   }
//   add(entity: Entity, data: HoldableType): void {
//     this.entity = entity;
//     this.data = data;
//     // listen for a grab message matching this entity

//     this.addSubscription("left");
//     this.addSubscription("right");
//   }
//   update(data: HoldableType): void {
//     Object.assign(this.data, data);
//   }
//   remove(): void {
//     this.subscriptions.forEach((sub) => sub.unsubscribe());
//     this.subscriptions.length = 0;
//   }

//   // side effect of receiving a mesh grabbed messaged
//   parentGrabbedMeshIntoHand(hand: "left" | "right") {
//     const handNode = this.system[`${hand}HandNode`];

//     let transform = {};
//     if (this.data.offset) {
//       transform = {
//         position: this.data.offset.pos,
//         rotation: this.data.offset.rot,
//         parent: handNode.name,
//       };
//     } else {
//       const { pos, rot } = getSetParentValues(this.grabbedMesh, handNode);
//       transform = {
//         position: arrayReduceSigFigs(pos),
//         rotation: arrayReduceSigFigs(rot),
//         parent: handNode.name,
//       };
//     }

//     // tell everyone (and ourselves) you grabbed it
//     this.context.signalHub.outgoing.emit("components_upserted", {
//       id: this.grabbedMesh.name,
//       components: {
//         transform: transform,
//       },
//     });
//   }

//   addSubscription(hand: "left" | "right") {
//     this.subscriptions.push(
//       this.signalHub.movement
//         .on(`${hand}_grip_mesh`)
//         .pipe(filter((evt) => evt.mesh.name === this.entity.name))
//         .subscribe((event) => {
//           this.grabbedMesh = event.mesh;
//           this.parentGrabbedMeshIntoHand(hand);
//           this.releaseEvents(hand, event.mesh)
//             .pipe(take(1))
//             .subscribe((reason) => {
//               this.signalHub.movement.emit(`${hand}_lost_mesh`, {
//                 reason,
//                 mesh: event.mesh,
//               });
//               if (reason === "released") {
//                 this.releaseMesh();
//               }
//             });
//         })
//     );
//   }

//   releaseEvents(hand: "left" | "right", grabbedMesh: BABYLON.AbstractMesh) {
//     const otherHand = hand[0] === "l" ? "right" : "left";
//     return race(
//       // if other hand grabbed the same mesh away from the first hand
//       this.context.signalHub.movement.on(`${otherHand}_grip_mesh`).pipe(
//         filter((data) => data.mesh.name === grabbedMesh.name),
//         map(() => "transferred")
//       ),
//       // OR another player stole our object
//       this.context.signalHub.incoming.on("components_upserted").pipe(
//         filter(
//           (msg) =>
//             msg.id === grabbedMesh.name &&
//             msg.components?.transform?.parent !== null &&
//             !msg.components?.transform?.parent.includes(
//               this.context.my_member_id
//             )
//         ),
//         map(() => "taken")
//       ),

//       // OR the hand released the mesh
//       this.context.signalHub.movement
//         .on(`${hand}_grip_released`)
//         .pipe(map(() => "released"))
//     );
//   }
//   releaseMesh() {
//     // this.grabbedMesh.setParent(null);
//     const payload = {
//       id: this.entity.name,
//       components: {
//         transform: {
//           position: arrayReduceSigFigs(
//             this.grabbedMesh.absolutePosition.asArray()
//           ),
//           rotation: arrayReduceSigFigs(
//             this.grabbedMesh.absoluteRotationQuaternion.asArray()
//           ),
//           parent: null,
//         },
//       },
//     };
//     // this.signalHub.outgoing.emit("msg", {
//     //   system: "hud",
//     //   data: { msg: JSON.stringify(payload) },
//     // });
//     this.signalHub.outgoing.emit("components_upserted", payload);
//     this.grabbedMesh = null;
//   }
// }
