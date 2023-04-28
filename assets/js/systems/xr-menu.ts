import { filter, takeUntil } from "rxjs";
import type { XRS } from "../xrs";
import * as BABYLON from "babylonjs";
import { ServiceBus } from "../services/bus";
import * as GUI from "babylonjs-gui";
import { fromBabylonObservable } from "../utils/misc";

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

    const button = this.makeButton(0, "Menu");
    this.wrist_gui.addControl(button);
    const micLabel = this.xrs.services.webrtc.my_mic_pref;

    const button2 = this.makeButton(BAR_HEIGHT / 2, micLabel);
    fromBabylonObservable(button2.onPointerClickObservable)
      .pipe(takeUntil(this.bus.exiting_xr))
      .subscribe(() => {
        this.xrs.toggle_mic();
      });

    this.wrist_gui.addControl(button2);

    this.bus.mic_toggled.subscribe((new_pref) => {
      button2.textBlock!.text = new_pref;
    });
  }

  makeButton(top: number, text: string) {
    const button = GUI.Button.CreateSimpleButton(text, text);
    button.width = 1;
    button.height = 0.5;
    button.color = "white";
    button.background = "purple";
    button.fontSize = 48;
    button.top = top;
    button.verticalAlignment = 0;
    return button;
  }

  remove_immersive_menu() {}
}
