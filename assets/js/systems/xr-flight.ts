import { filter, type Subscription } from "rxjs";
import type { XRS } from "../xrs";
import * as BABYLON from "babylonjs";
import type { SystemXR } from "./xr";
import { ServiceBus } from "../services/bus";
import { fromBabylonObservable } from "../utils/misc";
const NORMAL_DAMPENING_FACTOR = 0.1;
const GO_FASTER_DAMPENING = 0.2;

export class SystemXRFlight {
  public xrs: XRS;
  public name = "xr-flight";
  public order = 20;
  public forwardVelocity = 0;
  public sideVelocity = 0;
  public dampeningFactor = NORMAL_DAMPENING_FACTOR; // slows down the speed to prevent nausea
  public subscriptions: Subscription[] = [];
  public bus: ServiceBus;
  public scene: BABYLON.Scene;
  init(xrs: XRS): void {
    this.xrs = xrs;
    this.bus = this.xrs.services.bus;
    this.scene = this.xrs.services.engine.scene;
    this.bus.entering_xr.subscribe(() => {
      this.setupFlight();
    });

    this.bus.exiting_xr.subscribe(() => {
      this.tearDownFlight();
    });
  }

  setupFlight() {
    const sub1 = this.bus.left_trigger_squeezed.subscribe(() => {
      this.dampeningFactor = GO_FASTER_DAMPENING;
    });
    const sub2 = this.bus.left_trigger_released.subscribe(() => {
      this.dampeningFactor = NORMAL_DAMPENING_FACTOR;
    });

    const sub3 = this.bus.left_axes.subscribe((axes) => {
      this.forwardVelocity = -axes.y;
      this.sideVelocity = axes.x;
    });
    // let localDirection = BABYLON.Vector3.Zero();
    const systemXR = this.xrs.systems.find((s) => s.name === "xr") as SystemXR;
    const frame$ = fromBabylonObservable(
      systemXR.xrHelper.baseExperience.sessionManager.onXRFrameObservable
    );

    // makeXRFrameSignal(systemXR.xrHelper);
    const sub4 = frame$.subscribe(() => {
      const camera = this.scene.activeCamera as BABYLON.WebXRCamera;
      if (!camera._localDirection) {
        // undefined for 1 frame?
        return;
      }
      const speed = camera._computeLocalCameraSpeed() * this.dampeningFactor;
      // check input and move camera
      camera._localDirection
        .copyFromFloats(this.sideVelocity, 0, this.forwardVelocity)
        .scaleInPlace(speed);

      camera.getViewMatrix().invertToRef(camera._cameraTransformMatrix);
      BABYLON.Vector3.TransformNormalToRef(
        camera._localDirection,
        camera._cameraTransformMatrix,
        camera._transformedDirection
      );
      camera.position.addInPlace(camera._transformedDirection);
    });

    this.subscriptions.push(sub1);
    this.subscriptions.push(sub2);
    this.subscriptions.push(sub3);
    this.subscriptions.push(sub4);
  }
  tearDownFlight() {
    this.subscriptions.forEach((sub) => {
      sub.unsubscribe();
    });
    this.subscriptions.length = 0;
  }
}
