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
  // used to determine when to attach keyboard
  public inputs: Record<string, GUI.InputText> = {};
  public guiControls: Record<string, GUI.Control> = {};

  init(xrs: XRS): void {
    this.xrs = xrs;
    this.bus = this.xrs.services.bus;
    this.scene = this.xrs.services.engine.scene;

    // this.bus.left_button.subscribe((data) => {
    //   console.log(
    //     "left button",
    //     data.controllerComponent.id,
    //     data.controllerComponent.value,
    //     data.controllerComponent.pressed
    //   );
    // });
    this.bus.left_buttons.subscribe((event) => {
      console.log(event);
    });

    this.bus.left_controller_added.subscribe((data) => {
      const grip = this.xrs.get_grip("left");
      this.affix_wrist_menu(grip);
    });
    this.bus.left_controller_removed.subscribe(() => {
      this.remove_immersive_menu();
    });
    this.bus.on_set(["menu_wall"]).subscribe((cmd) => {
      this.create_menu_wall();
      this.refresh_menu_wall();
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
    this.bus.menu_contents_updated.subscribe(() => {
      this.refresh_menu_wall();
    });
  }

  refresh_menu_wall() {
    const html = document.getElementById("menu_left_right");
    console.log(html);
    if (this.menu_gui && html) {
      console.log("menu gui exists, so let's populate the wall");
      const gui = this.htmlToGui(html);
      this.menu_gui.addControl(gui);
    }
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
    if (!this.wrist_plane) {
      this.wrist_plane = BABYLON.MeshBuilder.CreatePlane(
        "wrist_plane",
        { height: BAR_HEIGHT * BAR_SCALING, width: BAR_WIDTH * BAR_SCALING },
        this.scene
      );
    }
    this.wrist_plane.showBoundingBox = true;
    this.wrist_plane.position.y = 0.05;
    this.wrist_plane.rotation.x = BABYLON.Angle.FromDegrees(60).radians();

    this.wrist_plane.parent = grip;
    if (!this.wrist_gui) {
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

  htmlToGui(el: HTMLElement, parent: HTMLElement | null = null) {
    let gui: GUI.Container;
    const style = getComputedStyle(el);
    switch (el.nodeName) {
      case "H1":
      case "PRE":
      case "DIV":
        gui = this.rectFromEl(el as HTMLDivElement, style) as GUI.Container;
        // gui.color = "#ff0000";
        // gui.background = "#aa00ee";
        break;
      case "BUTTON":
        gui = this.buttonFromEl(el as HTMLButtonElement, style);
        break;
      case "INPUT":
        gui = this.inputFromEl(
          el as HTMLInputElement,
          style
        ) as unknown as GUI.Container;
        break;
      default:
        gui = new GUI.Container(el.id);
    }
    if (el.id) {
      this.guiControls[el.id] = gui;
    }

    Object.keys(el.dataset).forEach((key) => {
      gui[key] = el.dataset[key];
    });

    for (let i = 0; i < el.children.length; i++) {
      const childControl = this.htmlToGui(
        el.children.item(i) as HTMLElement,
        el
      );
      gui.addControl(childControl);
    }

    // set height and width at the end as the last thing you do
    //because adding children into a container seems to
    // set them to % instead of px dimensions
    gui.height = `${el.clientHeight}px`;
    gui.width = `${el.clientWidth}px`;

    gui.hoverCursor = "pointer";
    gui.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    gui.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;

    gui.isPointerBlocker = true;
    if (!parent) {
      gui.leftInPixels = el.offsetLeft;
      gui.topInPixels = el.offsetTop;
    } else {
      gui.leftInPixels = el.offsetLeft - parent.offsetLeft;
      gui.topInPixels = el.offsetTop - parent.offsetTop;
      // console.log("left", gui.leftInPixels)
    }

    return gui;
  }

  rectFromEl(el: HTMLDivElement, style: CSSStyleDeclaration) {
    let gui;
    if (el.id === "colorpicker") {
      gui = new GUI.ColorPicker();
      gui.value = BABYLON.Color3.FromHexString(el.dataset.meshcolor as string);

      // gui.height = "150px";
      // gui.width = "150px";
      // picker.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;

      gui.onValueChangedObservable.add((value) => {
        console.log("color picked");
        // this.context.signalHub.local.emit("color_picked", value);
      });
      return gui;
    }
    if (style.overflow === "scroll") {
      gui = new GUI.ScrollViewer(el.id);
    } else {
      gui = new GUI.Rectangle(el.id);
    }
    gui.thickness = Number(style.borderWidth.replace("px", ""));

    gui.color = style.borderColor;
    gui.background = style.backgroundColor;
    if (el.children.length === 0 && el.innerText.length > 0) {
      const label = new GUI.TextBlock(`${el.id}_inner_txt`);
      label.text = el.innerText;
      label.fontSize = 14;
      label.color = style.color;
      label.paddingLeft = style.paddingLeft;
      label.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
      gui.addControl(label);
    }
    return gui;
  }

  buttonFromEl(el: HTMLButtonElement, style: CSSStyleDeclaration) {
    const gui = new GUI.Button(el.id);
    gui.thickness = 0;
    gui.onPointerUpObservable.add(() => {
      el.click();
    });
    const rect = new GUI.Rectangle(`${el.id}_btn_rect`);
    rect.cornerRadius = 5;
    rect.background = style.backgroundColor;
    rect.color = style.backgroundColor;
    const label = new GUI.TextBlock(`${el.id}_btn_txt`);
    label.text = el.innerText;
    label.fontSize = style.fontSize;
    label.fontWeight = "bold";
    label.color = style.color;
    label.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;

    if (el.disabled) {
      gui.isEnabled = false;
      rect.background = "#888888";
    }
    // setInterval(() => {
    //
    //   document.getElementById(el.id);
    //   if (el.disabled) {
    //     gui.isEnabled = false;
    //     rect.background = "#888888";
    //   } else {
    //     gui.isEnabled = true;
    //     rect.background = "#FF00FF";
    //   }
    // }, 1000);

    rect.addControl(label);
    gui.addControl(rect);
    return gui;
  }

  inputFromEl(el: HTMLInputElement, style: CSSStyleDeclaration) {
    const input = new GUI.InputText(el.id);
    // input.width = 0.2;
    // input.maxWidth = 0.2;
    // input.height = "40px";
    input.text = el.value;
    input.color = "white";
    input.onTextChangedObservable.add((data, state) => {
      el.value = data.text;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });

    this.inputs[el.id] = input;
    // input.background = "green";
    return input;
  }
}
