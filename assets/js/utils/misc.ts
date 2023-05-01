import * as BABYLON from "babylonjs";
import { pipe, scan, filter, map } from "rxjs";

import { Observable } from "rxjs/internal/Observable";
import { PosRot } from "../services/bus";
/**
 * Wraps a Babylon Observable into an rxjs Observable
 *
 * @param bjsObservable The Babylon Observable you want to observe
 * @example
 * ```
 * import { Engine, Scene, AbstractMesh } from '@babylonjs/core'
 *
 * const canvas = document.getElementById('canvas') as HTMLCanvasElement
 * const engine = new Engine(canvas)
 * const scene = new Scene(engine)
 *
 * const render$: Observable<Scene> = fromBabylonObservable(scene.onAfterRenderObservable)
 * const onMeshAdded$: Observable<AbstractMesh> = fromBabylonObservable(scene.onNewMeshAddedObservable)
 * ```
 */
export function fromBabylonObservable<T>(
  bjsObservable: BABYLON.Observable<T>
): Observable<T> {
  return new Observable<T>((subscriber) => {
    if (!(bjsObservable instanceof BABYLON.Observable)) {
      throw new TypeError("the object passed in must be a Babylon Observable");
    }

    const handler = bjsObservable.add((v) => subscriber.next(v));

    return () => bjsObservable.remove(handler);
  });
}

export function truncate(number, places = 2) {
  var shift = Math.pow(10, places);

  return ((number * shift) | 0) / shift;
}

export const getPosRot = (
  t: BABYLON.AbstractMesh | undefined,
  quaternion = true
) => {
  if (!t) {
    return {
      pos: [0, 0, 0],
      rot: quaternion ? [0, 0, 0, 1] : [0, 0, 0],
    };
  }
  return {
    pos: t.absolutePosition.asArray().map((v) => truncate(v)),
    rot: (quaternion
      ? t.absoluteRotationQuaternion.asArray()
      : t.rotation.asArray()
    ).map((v) => truncate(v)),
  };
};

export const camPosRot = (cam: BABYLON.Camera) => {
  return {
    pos: cam.position.asArray().map((v) => truncate(v)),
    rot: cam.absoluteRotation.asArray().map((v) => truncate(v)),
  };
};

// it gets the values you would have gotten after calling 'setParent' temporarily on something
export const getSetParentValues = (
  child: BABYLON.TransformNode,
  parent: BABYLON.Node
) => {
  // save the current pos, rot, scale, parent
  const currentPos = child.position.asArray();
  const currentRot = child.rotationQuaternion?.asArray() as number[];
  const currentScale = child.scaling.asArray();
  const currentParent = child.parent;
  // set a new parent temporarily, keeping child where it is relative to the new parent
  child.setParent(parent);
  // so we can easily get the child's offset relative to the temp parent
  const newPos = child.position.asArray();
  const newRot = child.rotationQuaternion?.asArray();
  const newScale = child.scaling.asArray();

  // then return the old parent and all the old values
  child.parent = currentParent;
  child.position.fromArray(currentPos);
  child.rotationQuaternion!.copyFromFloats(
    currentRot[0],
    currentRot[1],
    currentRot[2],
    currentRot[3]
  );
  child.scaling.fromArray(currentScale);

  return { pos: newPos, rot: newRot, scaling: newScale };
};

const THRESHOLD = 0.02;

export function throttleByMovement() {
  return pipe(
    scan(
      (acc: any, input: PosRot) => {
        return { prev: acc.curr, curr: input };
      },
      {
        prev: { pos: [0, 0, 0], rot: [0, 0, 0, 1] },
        curr: { pos: [0, 0, 0], rot: [0, 0, 0, 1] },
      }
    ),

    filter(
      (acc: { prev: PosRot; curr: PosRot }) =>
        Math.abs(acc.prev.pos[0] - acc.curr.pos[0]) > THRESHOLD ||
        Math.abs(acc.prev.rot[0] - acc.curr.rot[0]) > THRESHOLD ||
        Math.abs(acc.prev.pos[1] - acc.curr.pos[1]) > THRESHOLD ||
        Math.abs(acc.prev.pos[2] - acc.curr.pos[2]) > THRESHOLD ||
        Math.abs(acc.prev.rot[1] - acc.curr.rot[1]) > THRESHOLD ||
        Math.abs(acc.prev.rot[2] - acc.curr.rot[2]) > THRESHOLD ||
        Math.abs(acc.prev.rot[3] - acc.curr.rot[3]) > THRESHOLD
    ),
    map((data) => data.curr)
  );
}

export const setPos = (entity: BABYLON.TransformNode, pos: number[]) => {
  entity.position.fromArray(pos);
};
export const setRot = (entity: BABYLON.TransformNode, rot: number[]) => {
  if (rot.length === 4) {
    entity.rotationQuaternion = BABYLON.Quaternion.FromArray(rot);
  } else {
    entity.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(
      rot[0],
      rot[1],
      rot[2]
    );
  }
};
export const setScale = (entity: BABYLON.TransformNode, scale: number[]) => {
  entity.scaling.fromArray(scale);
};

export const cameraFrontPosition = (scene: BABYLON.Scene, distance = 2.5) => {
  const forwardVec = scene
    .activeCamera!.getDirection(BABYLON.Vector3.Forward())
    .normalize()
    .scaleInPlace(distance);
  const assetPosition = scene.activeCamera!.position.add(forwardVec);
  return assetPosition.asArray().map((v) => truncate(v));
};

export const cameraFrontFloorPosition = (
  scene: BABYLON.Scene,
  distance = 2.5
) => {
  const forwardVec = scene
    .activeCamera!.getDirection(BABYLON.Vector3.Forward())
    .normalize()
    .scaleInPlace(distance);

  const assetPosition = scene.activeCamera!.position.add(forwardVec);

  const ray = new BABYLON.Ray(assetPosition, BABYLON.Vector3.Down());
  ray.length = 20;

  const pickInfo = scene.pickWithRay(ray);

  if (pickInfo?.hit) {
    return pickInfo.pickedPoint?.asArray().map((v) => truncate(v));
  } else {
    assetPosition.y = 0;
    return assetPosition.asArray();
  }
};

export function random_id(length: number) {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
