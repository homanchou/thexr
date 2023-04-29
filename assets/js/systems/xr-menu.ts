import { filter, takeUntil } from "rxjs";
import type { XRS } from "../xrs";
import * as BABYLON from "babylonjs";
import { ServiceBus } from "../services/bus";
import * as GUI from "babylonjs-gui";
import { cameraFrontFloorPosition, fromBabylonObservable } from "../utils/misc";

export const BAR_WIDTH = 256;
export const BAR_HEIGHT = 256;
export const HOME_WIDTH = 640;
export const HOME_HEIGHT = 384;
export const BAR_SCALING = 0.1 / 256;
export const HOME_SCALING = 1.0 / 384;

const WALL_HEIGHT = 5;
const WALL_WIDTH = 7;

const MENU_WALL_EID = "menu_wall";

export class SystemXRMenu {
  public xrs: XRS;
  public name = "xr-menu";
  public wrist_plane: BABYLON.AbstractMesh | null;
  public wrist_gui: GUI.AdvancedDynamicTexture | null;
  public menu_plane: BABYLON.AbstractMesh | null;
  public menu_gui: GUI.AdvancedDynamicTexture | null;

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
        this.affix_wrist_menu(data.grip);
      });
    this.bus.controller_removed
      .pipe(filter((x) => x.hand === "left"))
      .subscribe(() => {
        this.remove_immersive_menu();
      });
    this.bus.on_set(["menu_wall"]).subscribe((cmd) => {
      this.create_menu_wall();
    });
    this.bus.on_del(["menu_wall"]).subscribe(() => {
      this.remove_menu_wall();
    });
    this.bus.exiting_xr.subscribe(() => {
      if (this.scene.getMeshByName(MENU_WALL_EID)) {
        this.xrs.send_command({
          eid: MENU_WALL_EID,
          ttl: 0,
          tag: "p", // private
        });
      }
    });
  }

  toggle_menu_wall() {
    if (this.scene.getMeshByName(MENU_WALL_EID)) {
      this.xrs.send_command({
        eid: MENU_WALL_EID,
        ttl: 0,
        tag: "p", // private
      });
    } else {
      this.xrs.send_command({
        eid: MENU_WALL_EID,
        set: {
          menu_wall: {},
          holdable: {},
        },
        tag: "p", // private
      });
    }
  }

  remove_menu_wall() {
    if (this.menu_plane) {
      this.menu_gui?.dispose();
      this.menu_plane?.dispose();
      this.menu_gui = null;
      this.menu_plane = null;
    }
  }

  create_menu_wall() {
    // don't create twice
    if (this.scene.getMeshByName(MENU_WALL_EID)) {
      return;
    }
    this.menu_plane = BABYLON.MeshBuilder.CreatePlane(
      MENU_WALL_EID,
      {
        height: WALL_HEIGHT,
        width: WALL_WIDTH,
        sideOrientation: BABYLON.Mesh.DOUBLESIDE,
      },
      this.scene
    );
    this.menu_plane.rotationQuaternion = new BABYLON.Quaternion();
    // this.logPlane.isPickable = false;
    this.menu_plane.showBoundingBox = true;

    const pos = cameraFrontFloorPosition(this.scene, 10);
    if (pos) {
      this.menu_plane.position.fromArray(pos);
      this.menu_plane.position.y += WALL_HEIGHT / 2;
    }

    this.menu_plane.lookAt(
      this.scene.activeCamera?.position as BABYLON.Vector3,
      BABYLON.Angle.FromDegrees(180).radians()
    );

    this.menu_gui = GUI.AdvancedDynamicTexture.CreateForMesh(
      this.menu_plane,
      WALL_WIDTH * 100,
      WALL_HEIGHT * 100
    );
    this.menu_gui.background = "#F0F0F0";
  }

  affix_wrist_menu(grip: BABYLON.AbstractMesh) {
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
    fromBabylonObservable(button.onPointerClickObservable)
      .pipe(takeUntil(this.bus.exiting_xr))
      .subscribe(() => {
        this.toggle_menu_wall();
      });

    this.wrist_gui.addControl(button);
    const micLabel = this.xrs.services.webrtc.my_mic_pref;

    const button2 = this.makeButton(BAR_HEIGHT / 2, micLabel);
    fromBabylonObservable(button2.onPointerClickObservable)
      .pipe(takeUntil(this.bus.exiting_xr))
      .subscribe(() => {
        this.xrs.toggle_mic();
      });

    this.wrist_gui.addControl(button2);

    this.bus.mic_toggled
      .pipe(takeUntil(this.bus.exiting_xr))
      .subscribe((new_pref) => {
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

  remove_immersive_menu() {
    this.wrist_gui?.dispose();
    this.wrist_plane?.dispose();
    this.wrist_gui = null;
    this.wrist_plane = null;
  }
}
