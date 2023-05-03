import {
  filter,
  takeUntil,
  map,
  distinctUntilChanged,
  Subject,
  take,
  tap,
  scan,
} from "rxjs";
import type { XRS } from "../xrs";
import * as BABYLON from "babylonjs";
import {
  camPosRot,
  fromBabylonObservable,
  getPosRot,
  truncate,
} from "../utils/misc";
import { isMobileVR } from "../utils/browser";
import { ServiceBus } from "../services/bus";
import { SystemAvatar } from "./avatar";

/**
 * Sends all head and controller events into signal hub
 * automatically unsubscribes to observables when leaving XR
 * and recreates observables when controllers are ready again
 */

export class SystemXR {
  public xrs: XRS;
  name = "xr";
  public scene: BABYLON.Scene;
  public xrHelper: BABYLON.WebXRDefaultExperience;
  public controllerPhysicsFeature: BABYLON.WebXRControllerPhysics;
  public teleportation: BABYLON.WebXRMotionControllerTeleportation;

  // public left_controller_added$ = new Subject<BABYLON.WebXRInputSource>();
  // public right_controller_added$ = new Subject<BABYLON.WebXRInputSource>();
  // public left_controller_removed$ = new Subject<BABYLON.WebXRInputSource>();
  // public right_controller_removed$ = new Subject<BABYLON.WebXRInputSource>();

  public _left_input_source: BABYLON.WebXRInputSource;
  public _right_input_source: BABYLON.WebXRInputSource;

  public bus: ServiceBus;

  get_grip(hand: "left" | "right"): BABYLON.AbstractMesh {
    return this[`_${hand}_input_source`].grip as BABYLON.AbstractMesh;
  }

  init(xrs: XRS) {
    this.xrs = xrs;
    this.bus = xrs.services.bus;
    this.scene = xrs.services.engine.scene;

    this.bus.entered_space.subscribe(async () => {
      this.start();
    });
  }

  async start() {
    // this displays the glasses icon, which we don't want until after the initial modal is dismissed
    await this.enableWebXRExperience();

    // automatically enter XR mode
    // this doesn't work without a one time user interaction
    // that's another reason why start modal is necessary
    if (isMobileVR()) {
      this.enterXR();
    }
  }

  get_input_source(hand: "left" | "right") {
    return this[`_${hand}_input_source`];
  }

  getHandVelocity(hand: "left" | "right") {
    const inputSource = this.get_input_source(hand);
    if (inputSource && this.controllerPhysicsFeature) {
      const imposter =
        this.controllerPhysicsFeature.getImpostorForController(inputSource);
      return {
        av: imposter!
          .getAngularVelocity()!
          .asArray()
          .map((v) => truncate(v)),
        lv: imposter!
          .getLinearVelocity()!
          .asArray()
          .map((v) => truncate(v)),
      };
    }
    // this system is not ready to return a hand velocity for the requester
    return { av: [0, 0, 0], lv: [0, 0, 0] };
  }

  enterXR() {
    return this.xrHelper.baseExperience.enterXRAsync(
      "immersive-vr",
      "local-floor" /*, optionalRenderTarget */
    );
  }

  exitXR() {
    return this.xrHelper.baseExperience.exitXRAsync();
  }

  async enableWebXRExperience() {
    if (!navigator["xr"]) {
      return;
    }
    this.xrHelper = await this.scene.createDefaultXRExperienceAsync({});

    this.controllerPhysicsFeature = <BABYLON.WebXRControllerPhysics>(
      this.xrHelper.baseExperience.featuresManager.enableFeature(
        BABYLON.WebXRFeatureName.PHYSICS_CONTROLLERS,
        "latest",
        {
          xrInput: this.xrHelper.input,
          physicsProperties: {
            restitution: 0.5,
            impostorSize: 0.1,
            impostorType: BABYLON.PhysicsImpostor.BoxImpostor,
          },
          enableHeadsetImpostor: false,
        }
      )
    );

    this.teleportation =
      this.xrHelper.baseExperience.featuresManager.enableFeature(
        BABYLON.WebXRFeatureName.TELEPORTATION,
        "latest" /* or latest */,
        {
          xrInput: this.xrHelper.input,
          floorMeshes: [],
          defaultTargetMeshOptions: {
            teleportationFillColor: "yellow",
            teleportationBorderColor: "green",
            timeToTeleport: 0,
            disableAnimation: true,
            disableLighting: true,
          },
          forceHandedness: "right",
        }
      ) as BABYLON.WebXRMotionControllerTeleportation;
    this.teleportation.rotationEnabled = false;
    this.teleportation.straightRayEnabled = false;
    this.teleportation.parabolicCheckRadius = 0.5;

    // function added here does not build up when entered and exiting VR
    // multiple times - tested with console.log
    this.xrHelper.baseExperience.onStateChangedObservable.add((state) => {
      // tell menu manager about what kind of menu to load
      this.bus.xr_state.next(state);

      // ENTERING_XR = 0,
      // /**
      //  * Transitioning to non XR mode
      //  */
      // EXITING_XR = 1,
      // /**
      //  * In XR mode and presenting
      //  */
      // IN_XR = 2,
      // /**
      //  * Not entered XR mode
      //  */
      // NOT_IN_XR = 3
    });

    this.setupEmitCameraMovement();

    this.setupHandControllers();
  }

  setupHandControllers() {
    const xrInput = this.xrHelper.input;

    // trap some signals to help us set and tear down
    xrInput.onControllerAddedObservable.add((inputSource) => {
      const hand = inputSource.inputSource.handedness;
      console.log("onController added", hand);

      inputSource.onMotionControllerInitObservable.add((motionController) => {
        motionController.onModelLoadedObservable.add(() => {
          // cache the input source
          this[`_${hand}_input_source`] = inputSource;
          this.bus[`${hand}_controller_added`].next(true);
        });
      });
    });

    xrInput.onControllerRemovedObservable.add((inputSource) => {
      const hand = inputSource.inputSource.handedness;
      console.log("onController removed", hand);
      this.bus[`${hand}_controller_removed`].next(true);
      this[`_${hand}_input_source`] = null;
    });

    // subscribe and unsubscribe to buttons, axis, movement when controllers are added
    // and unsubscribe when controllers disappear
    this.watchController("left");
    this.watchController("right");
  }

  watchController(hand: "left" | "right") {
    this.bus[`${hand}_controller_added`].subscribe(() => {
      const inputSource = this[`_${hand}_input_source`];

      // subscribe all the things,
      // which will themselves deregister when the controller is removed
      this.setupComponentData(hand, inputSource);
      this.setupVibration(hand, inputSource);
      this.setupHandMotionData(hand, inputSource);
      this.setupCleanPressAndRelease(hand);
    });
  }

  setupHandMotionData(
    hand: "left" | "right",
    inputSource: BABYLON.WebXRInputSource
  ) {
    const motionController = inputSource.motionController;
    fromBabylonObservable(motionController!.onModelLoadedObservable)
      .pipe(takeUntil(this.bus[`${hand}_controller_removed`]))
      .subscribe(() => {
        if (inputSource.grip) {
          //put hand back to the face when this controller leaves XR
          this.bus[`${hand}_controller_removed`].pipe(take(1)).subscribe(() => {
            const systemAvatar = this.xrs.systems.find(
              (s) => s.name === "avatar"
            ) as SystemAvatar;
            systemAvatar.my_avatar().setHandRaisedPosition(hand);
          });

          fromBabylonObservable(
            inputSource.grip.onAfterWorldMatrixUpdateObservable
          )
            .pipe(takeUntil(this.bus[`${hand}_controller_removed`]))
            .subscribe((grip) => {
              // const payload: any = getPosRot(inputSource.grip);
              // payload.lv = imposter.getLinearVelocity().asArray();
              // payload.av = imposter.getAngularVelocity().asArray();

              this.bus[`${hand}_hand_moved`].next(grip);
            });
        }
      });
  }

  setupEmitCameraMovement() {
    fromBabylonObservable(
      this.xrHelper.baseExperience.camera.onViewMatrixChangedObservable
    ).subscribe((cam) => {
      this.bus.head_movement.next(cam);
    });
  }

  setupVibration(
    hand: "left" | "right",
    inputSource: BABYLON.WebXRInputSource
  ) {
    const motionController = inputSource.motionController;
    let inPulse = false;
    this.bus.pulse
      .pipe(
        takeUntil(this.bus[`${hand}_controller_removed`]),
        filter((val) => val.hand === hand)
      )
      .subscribe(async (val) => {
        if (inPulse) {
          return;
        }
        inPulse = true;
        await motionController?.pulse(val.intensity, val.duration);
        inPulse = false;
      });
  }

  // produces a noisy stream of every button on the controller
  // which sensitive to light touches of varying value and touch: true/false, press: true/false
  setupComponentData(
    hand: "left" | "right",
    inputSource: BABYLON.WebXRInputSource
  ) {
    const componentIds = inputSource?.motionController?.getComponentIds() || [];
    // for every button type (component), stream to bus subject
    componentIds.forEach((componentId) => {
      const webXRComponent =
        inputSource?.motionController?.getComponent(componentId);
      if (webXRComponent) {
        fromBabylonObservable(webXRComponent.onButtonStateChangedObservable)
          .pipe(
            takeUntil(this.bus[`${hand}_controller_removed`]),
            // filter((component) => !component.isAxes()),
            map((evt) => {
              return {
                id: webXRComponent.id,
                type: webXRComponent.type,
                changes: evt.changes,
              };
            })
          )
          .subscribe((payload) => {
            if (payload.type === "button") {
              this.bus[`${hand}_buttons`].next({
                id: payload.id,
                changes: payload.changes,
              });
            } else {
              this.bus[`${hand}_${payload.type}`].next(payload.changes);
            }
          });

        fromBabylonObservable(webXRComponent.onAxisValueChangedObservable)
          .pipe(takeUntil(this.bus[`${hand}_controller_removed`]))
          .subscribe((axisChange) => {
            this.bus[`${hand}_axes`].next(axisChange);
          });
      }
    });
  }

  setupCleanPressAndRelease(hand: "left" | "right") {
    // a release must be followed by a press first, so we need a flag
    // to disgard events that have pressed-false unless we pressed true at least once
    const buttons_pressed = {};

    this.bus[`${hand}_squeeze`]
      .pipe(takeUntil(this.bus[`${hand}_controller_removed`]))
      .subscribe((changes) => {
        if (!changes.pressed?.previous && changes.pressed?.current) {
          this.bus[`${hand}_grip_squeezed`].next(true);
        } else if (changes.pressed?.previous && !changes.pressed?.current) {
          this.bus[`${hand}_grip_released`].next(true);
        }
      });

    // listen for clean grip and release
    this.bus[`${hand}_trigger`]
      .pipe(takeUntil(this.bus[`${hand}_controller_removed`]))
      .subscribe((changes) => {
        if (!changes.pressed?.previous && changes.pressed?.current) {
          this.bus[`${hand}_trigger_squeezed`].next(true);
        } else if (changes.pressed?.previous && !changes.pressed?.current) {
          this.bus[`${hand}_trigger_released`].next(true);
        }
      });
  }
}
