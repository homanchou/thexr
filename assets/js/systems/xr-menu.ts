import { filter } from "rxjs";
import type { XRS } from "../xrs";
import * as BABYLON from "babylonjs";
import { ServiceBus } from "../services/bus";
import * as GUI from "babylonjs-gui";

export const BAR_WIDTH = 256;
export const BAR_HEIGHT = 256;
export const HOME_WIDTH = 640;
export const HOME_HEIGHT = 384;
export const BAR_SCALING = 0.1 / 256;
export const HOME_SCALING = 1.0 / 384;

export class SystemXRMenu {
  public xrs: XRS;
  public name = "xr-menu";
  public wrist_plane: BABYLON.AbstractMesh;
  public wrist_gui: GUI.AdvancedDynamicTexture;
  public bus: ServiceBus;
  public scene: BABYLON.Scene;
  //   public left_ready$: Observable<{hand: string, grip: BABYLON.AbstractMesh}>
  //   public left_removed$: Observable<{hand: string}>
  init(xrs: XRS): void {
    this.xrs = xrs;
    this.bus = this.xrs.services.bus;
    this.scene = this.xrs.services.engine.scene;
    this.bus.controller_ready
      .pipe(filter((x) => x.hand === "left"))
      .subscribe((data) => {
        this.create_immersive_menu(data.grip);
      });
    this.bus.controller_removed
      .pipe(filter((x) => x.hand === "left"))
      .subscribe(() => {
        this.remove_immersive_menu();
      });
  }

  create_immersive_menu(grip: BABYLON.AbstractMesh) {
    this.wrist_plane = BABYLON.MeshBuilder.CreatePlane(
      "wrist_plane",
      { height: BAR_HEIGHT * BAR_SCALING, width: BAR_WIDTH * BAR_SCALING },
      this.scene
    );
    this.wrist_plane.showBoundingBox = true;
    this.wrist_plane.position.y = 0.05;
    this.wrist_plane.rotation.x = BABYLON.Angle.FromDegrees(60).radians();

    this.wrist_plane.parent = grip;
    this.wrist_gui = GUI.AdvancedDynamicTexture.CreateForMesh(
      this.wrist_plane,
      BAR_WIDTH,
      BAR_HEIGHT
    );
  }

  remove_immersive_menu() {}
}
