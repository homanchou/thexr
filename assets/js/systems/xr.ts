import { filter, takeUntil, map, distinctUntilChanged, Subject } from "rxjs";
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

  public left_controller_added$ = new Subject<BABYLON.WebXRInputSource>();
  public right_controller_added$ = new Subject<BABYLON.WebXRInputSource>();
  public left_controller_removed$ = new Subject<BABYLON.WebXRInputSource>();
  public right_controller_removed$ = new Subject<BABYLON.WebXRInputSource>();

  public bus: ServiceBus;

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

  getInputSource(hand: "left" | "right") {
    return this[`${hand}InputSource`];
  }

  getHandVelocity(hand: "left" | "right") {
    const inputSource = this.getInputSource(hand);
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
      console.log("onController added", inputSource.inputSource.handedness);
      inputSource.onMotionControllerInitObservable.add(() => {
        if (inputSource.inputSource.handedness[0] === "l") {
          this.left_controller_added$.next(inputSource);
        } else {
          this.right_controller_added$.next(inputSource);
        }
      });
    });

    xrInput.onControllerRemovedObservable.add((inputSource) => {
      if (inputSource.inputSource.handedness[0] === "l") {
        this.left_controller_removed$.next(inputSource);
      } else {
        this.right_controller_removed$.next(inputSource);
      }
    });

    // subscribe and unsubscribe to buttons, axis, movement when controllers are added
    // and unsubscribe when controllers disappear
    this.watchController("left");
    this.watchController("right");
  }

  watchController(hand: "left" | "right") {
    const subscriptions = [];
    this[`${hand}_controller_added$`].subscribe((inputSource) => {
      // subscribe all the things,
      // which will themselves deregister when the controller is removed
      this.setupComponentData(hand, inputSource);
      this.setupVibration(hand, inputSource);
      this.setupHandMotionData(hand, inputSource);
      this.setupCleanPressAndRelease(hand, inputSource);
    });
  }

  setupHandMotionData(
    hand: "left" | "right",
    inputSource: BABYLON.WebXRInputSource
  ) {
    const motionController = inputSource.motionController;
    fromBabylonObservable(motionController!.onModelLoadedObservable)
      .pipe(takeUntil(this[`${hand}_controller_removed$`]))
      .subscribe(() => {
        if (inputSource.grip) {
          fromBabylonObservable(
            inputSource.grip.onAfterWorldMatrixUpdateObservable
          )
            .pipe(takeUntil(this[`${hand}_controller_removed$`]))
            .subscribe(() => {
              const payload: any = getPosRot(inputSource.grip);
              // payload.lv = imposter.getLinearVelocity().asArray();
              // payload.av = imposter.getAngularVelocity().asArray();

              this.bus[`${hand}_hand_moved`].next(payload);
            });
        }
        this.bus.controller_ready.next({
          hand,
          grip: inputSource.grip as BABYLON.AbstractMesh,
        });
      });
  }

  setupEmitCameraMovement() {
    fromBabylonObservable(
      this.xrHelper.baseExperience.camera.onViewMatrixChangedObservable
    ).subscribe((cam) => {
      this.bus.head_movement.next(camPosRot(cam));
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
        takeUntil(this[`${hand}_controller_removed$`]),
        filter((val) => val.hand === motionController?.handedness)
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
  // for every value 0-100
  setupComponentData(
    hand: "left" | "right",
    inputSource: BABYLON.WebXRInputSource
  ) {
    const componentIds = inputSource?.motionController?.getComponentIds() || [];
    componentIds.forEach((componentId) => {
      const webXRComponent =
        inputSource?.motionController?.getComponent(componentId);
      if (webXRComponent) {
        this.publishChanges(hand, inputSource, webXRComponent);
      }
    });
  }

  publishChanges(
    hand: "left" | "right",
    inputSource: BABYLON.WebXRInputSource,
    component: BABYLON.WebXRControllerComponent
  ) {
    //wrap babylon observable in rxjs observable
    fromBabylonObservable(component.onButtonStateChangedObservable)
      .pipe(takeUntil(this[`${hand}_controller_removed$`]))
      .subscribe((xr_button_change_evt) => {
        this.bus[`${hand}_${component.type}`].next({
          inputSource,
          controllerComponent: xr_button_change_evt,
        });
      });

    fromBabylonObservable(component.onAxisValueChangedObservable)
      .pipe(takeUntil(this[`${hand}_controller_removed$`]))
      .subscribe((axisChange) => {
        this.bus[`${hand}_axes`].next(axisChange);
      });
  }

  setupCleanPressAndRelease(
    hand: "left" | "right",
    inputSource: BABYLON.WebXRInputSource
  ) {
    // listen for clean grip and release
    this.bus[`${hand}_squeeze`]
      .pipe(
        takeUntil(this[`${hand}_controller_removed$`]),
        map((val) => val.controllerComponent.pressed),
        distinctUntilChanged()
      )
      .subscribe((squeezed) => {
        if (squeezed) {
          this.bus[`${hand}_grip_squeezed`].next(inputSource);
        } else {
          this.bus[`${hand}_grip_released`].next(inputSource);
        }
      });

    this.bus[`${hand}_trigger`]
      .pipe(
        takeUntil(this[`${hand}_controller_removed$`]),
        map((val) => val.controllerComponent.pressed),
        distinctUntilChanged()
      )
      .subscribe((squeezed) => {
        if (squeezed) {
          this.bus[`${hand}_trigger_squeezed`].next(inputSource);
        } else {
          this.bus[`${hand}_trigger_released`].next(inputSource);
        }
      });

    this.bus[`${hand}_button`]
      .pipe(
        takeUntil(this[`${hand}_controller_removed$`]),
        distinctUntilChanged(
          (a, b) =>
            a.controllerComponent.pressed === b.controllerComponent.pressed
        )
      )
      .subscribe((val) => {
        if (val.controllerComponent.pressed) {
          this.bus[`${hand}_button_down`].next(val.controllerComponent.id);
        } else {
          this.bus[`${hand}_button_up`].next(val.controllerComponent.id);
        }
      });
  }
}
