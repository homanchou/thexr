import { filter } from "rxjs/internal/operators/filter";
import { map } from "rxjs/internal/operators/map";
import { Subject } from "rxjs/internal/Subject";
import { BehaviorSubject } from "rxjs/internal/BehaviorSubject";
import { Command, XRS } from "../xrs";
import * as BABYLON from "babylonjs";

export type PosRot = {
  pos: number[];
  rot: number[];
};

export type xrComponentChange = {
  inputSource: BABYLON.WebXRInputSource;
  controllerComponent: BABYLON.WebXRControllerComponent;
};

export class ServiceBus {
  public xrs: XRS;
  public animate_translate = new Subject<{
    target: BABYLON.TransformNode;
    from: BABYLON.Vector3;
    to: BABYLON.Vector3;
    duration: number;
    callback?: () => void;
  }>();
  public animate_rotation = new Subject<{
    target: BABYLON.TransformNode;
    from: BABYLON.Quaternion;
    to: BABYLON.Quaternion;
    duration: number;
    callback?: () => void;
  }>();
  public incoming_commands = new Subject<Command>();
  public mic_toggled = new Subject<"muted" | "unmuted">();
  public menu_contents_updated = new Subject<any>();
  public head_movement = new Subject<PosRot>();
  // left movement, right movement
  public entered_space = new Subject<boolean>();
  // a place to push env variables
  public channel_connected = new Subject<{ agora_app_id: string }>();
  public xr_state = new Subject<BABYLON.WebXRState>();
  public entering_xr = this.xr_state.pipe(
    filter((msg) => msg === BABYLON.WebXRState.ENTERING_XR)
  );
  public exiting_xr = this.xr_state.pipe(
    filter((msg) => msg === BABYLON.WebXRState.EXITING_XR)
  );
  public controller_ready = new Subject<{
    hand: string;
    grip: BABYLON.AbstractMesh;
  }>();
  public controller_removed = new Subject<{ hand: any }>();

  public pulse = new Subject<{
    hand: "left" | "right";
    intensity: number;
    duration: number;
  }>();

  // continuous movements
  public left_hand_moved = new Subject<PosRot>();
  public right_hand_moved = new Subject<PosRot>();

  public left_trigger = new Subject<xrComponentChange>();
  public left_squeeze = new Subject<xrComponentChange>();
  public left_button = new Subject<xrComponentChange>();
  public left_thumbstick = new Subject<xrComponentChange>();
  public left_touchpad = new Subject<xrComponentChange>();
  public right_trigger = new Subject<xrComponentChange>();
  public right_squeeze = new Subject<xrComponentChange>();
  public right_button = new Subject<xrComponentChange>();
  public right_thumbstick = new Subject<xrComponentChange>();
  public right_touchpad = new Subject<xrComponentChange>();
  public left_axes = new Subject<{ x: number; y: number }>();
  public right_axes = new Subject<{ x: number; y: number }>();

  public; // clean grip and release (alternating values)
  public left_grip_squeezed = new Subject<BABYLON.WebXRInputSource>();
  public left_grip_released = new Subject<BABYLON.WebXRInputSource>();
  public left_trigger_squeezed = new Subject<BABYLON.WebXRInputSource>();
  public left_trigger_released = new Subject<BABYLON.WebXRInputSource>();
  public right_grip_squeezed = new Subject<BABYLON.WebXRInputSource>();
  public right_grip_released = new Subject<BABYLON.WebXRInputSource>();
  public right_trigger_squeezed = new Subject<BABYLON.WebXRInputSource>();
  public right_trigger_released = new Subject<BABYLON.WebXRInputSource>();

  public left_button_down = new Subject<string>(); // id of button
  public left_button_up = new Subject<string>();
  public right_button_down = new Subject<string>();
  public right_button_up = new Subject<string>();

  public left_grip_mesh = new Subject<{
    mesh: BABYLON.AbstractMesh;
  }>();
  public left_lost_mesh = new Subject<{
    reason: string;
    mesh: BABYLON.AbstractMesh;
  }>();
  public right_grip_mesh = new Subject<{
    mesh: BABYLON.AbstractMesh;
  }>();
  public right_lost_mesh = new Subject<{
    reason: string;
    mesh: BABYLON.AbstractMesh;
  }>();

  public trigger_holding_mesh = new Subject<{
    hand: "left" | "right";
    mesh: BABYLON.AbstractMesh;
  }>();

  public init(xrs: XRS) {
    this.xrs = xrs;
  }

  on_set(set_components: string[], and_has_components: string[] = []) {
    if (set_components.length === 0) {
      throw new Error("at least one component name is required");
    }
    let component_matcher = this.incoming_commands.pipe(
      filter((cmd) => cmd.set !== undefined),
      filter((cmd) =>
        set_components.every(
          (component_name) => cmd.set![component_name] !== undefined
        )
      )
    );

    if (and_has_components.length > 0) {
      return component_matcher.pipe(
        map((cmd) => ({
          stored_components: this.xrs.services.store.component_names(cmd.eid),
          cmd,
        })),
        filter(({ stored_components, cmd }) =>
          and_has_components.every((el) => stored_components.includes(el))
        ),
        map(({ stored_components, cmd }) => cmd)
      );
    } else {
      return component_matcher;
    }
  }

  on_del(del_components: string[], and_has_components: string[] = []) {
    if (del_components.length === 0) {
      throw new Error("at least one component name is required");
    }
    let component_matcher = this.incoming_commands.pipe(
      filter((cmd) => cmd.del !== undefined),
      filter((cmd) =>
        del_components.every((component_name) =>
          cmd.del?.includes(component_name)
        )
      )
    );

    if (and_has_components.length > 0) {
      return component_matcher.pipe(
        map((cmd) => ({
          stored_components: this.xrs.services.store.component_names(cmd.eid),
          cmd,
        })),
        filter(({ stored_components, cmd }) =>
          and_has_components.every((el) => stored_components.includes(el))
        ),
        map(({ stored_components, cmd }) => cmd)
      );
    } else {
      return component_matcher;
    }
  }
}
