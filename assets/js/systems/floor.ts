import type { XRS } from "../xrs";
import type { SystemXR } from "./xr";
import * as BABYLON from "babylonjs";
import { filter, take } from "rxjs";

export class SystemFloor {
  name = "floor";
  public systemXR: SystemXR;
  public xrs: XRS;
  public scene: BABYLON.Scene;
  public floors = new Set<string>();
  init(xrs: XRS) {
    this.xrs = xrs;
    this.scene = this.xrs.services.engine.scene;
    this.systemXR = this.xrs.systems.find((s) => s.name === "xr") as SystemXR;
    this.xrs.services.bus.on_set(["floor"]).subscribe((cmd) => {
      this.floors.add(cmd.eid);
      this.addFloor(cmd.eid);
    });
    this.xrs.services.bus.on_del(["floor"]).subscribe((cmd) => {
      this.removeFloor(cmd.eid);
      this.floors.delete(cmd.eid);
    });
    this.xrs.services.bus.entering_xr.subscribe(() => {
      this.floors.forEach((eid) => {
        this.floors.add(eid);
      });
    });
  }

  addFloor(floorName: string) {
    const mesh = this.scene.getMeshByName(floorName);
    if (mesh && this.systemXR.teleportation) {
      this.systemXR.teleportation.addFloorMesh(mesh);
      mesh.physicsImpostor = new BABYLON.PhysicsImpostor(
        mesh,
        BABYLON.PhysicsImpostor.BoxImpostor,
        { mass: 0, friction: 0.5, restitution: 0.7 },
        this.scene
      );
      mesh.checkCollisions = true;
    }
  }
  removeFloor(floorName: string) {
    const mesh = this.scene.getMeshByName(floorName);
    if (mesh && this.systemXR.teleportation) {
      this.systemXR.teleportation.removeFloorMesh(mesh);
      mesh.physicsImpostor?.dispose();
      mesh.physicsImpostor = null;
      mesh.checkCollisions = false;
    }
  }
}
