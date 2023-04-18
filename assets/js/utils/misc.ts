import * as BABYLON from "babylonjs";

import { Observable } from "rxjs/internal/Observable";
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

export function truncate(number, places = 5) {
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
