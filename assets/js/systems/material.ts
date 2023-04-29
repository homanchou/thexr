import type { XRS } from "../xrs";
import * as BABYLON from "babylonjs";
import * as MAT from "babylonjs-materials";
import { ServiceBus } from "../services/bus";

export class SystemMaterial {
  name = "material";
  public materials: { [material_name: string]: BABYLON.Material } = {};
  // keep track of entities using material name so that
  // if no one is using the material it can be pruned
  public entitiesToMaterials: Record<string, string> = {};
  public xrs: XRS;
  public bus: ServiceBus;
  public scene: BABYLON.Scene;
  init(xrs: XRS) {
    this.xrs = xrs;
    this.bus = this.xrs.services.bus;
    this.scene = this.xrs.services.engine.scene;
    this.bus.on_set(["color"]).subscribe((cmd) => {
      const oldMaterialName = this.entitiesToMaterials[cmd.eid];
      const mesh = this.scene.getMeshByName(cmd.eid);
      if (mesh) {
        const mat = this.findOrCreateColor(cmd!.set!.color);
        this.assignMaterial(mat, mesh);
      }
      if (oldMaterialName) {
        this.pruneMaterial(oldMaterialName);
      }
    });
    this.bus.on_del(["color"]).subscribe((cmd) => {
      const mesh = this.scene.getMeshByName(cmd.eid);
      this.pruneMaterial(this.entitiesToMaterials[cmd.eid]);
    });
    this.bus.on_del(["mat"]).subscribe((cmd) => {
      const mesh = this.scene.getMeshByName(cmd.eid);
      this.pruneMaterial(this.entitiesToMaterials[cmd.eid]);
    });
    this.bus.on_set(["mat"]).subscribe((cmd) => {
      const mesh = this.scene.getMeshByName(cmd.eid);
      if (mesh) {
        const mat = this.findOrCreateGrid();
        this.assignMaterial(mat, mesh);
      }
    });
  }
  assignMaterial(mat: BABYLON.Material, mesh: BABYLON.AbstractMesh) {
    mesh.material = mat;
    this.materials[mat.name] = mat;
    this.entitiesToMaterials[mesh.name] = mat.name;
  }
  findOrCreateColor(colorString: string): BABYLON.Material {
    const matName = `mat_${colorString}`;
    if (this.materials[matName]) {
      return this.materials[matName];
    }
    const myMaterial = new BABYLON.StandardMaterial(matName, this.scene);
    const color = BABYLON.Color3.FromHexString(colorString);
    myMaterial.diffuseColor = color;
    return myMaterial;
  }

  findOrCreateGrid() {
    const matName = "mat_grid";
    if (this.materials[matName]) {
      return this.materials[matName];
    }
    const myMaterial = new MAT.GridMaterial(matName, this.scene);
    myMaterial.backFaceCulling = false;
    return myMaterial;
  }

  pruneMaterial(materialName: string) {
    if (!Object.values(this.entitiesToMaterials).includes(materialName)) {
      // no one else is using this material, so remove the material too
      this.materials[materialName].dispose();
      delete this.materials[materialName];
    }
  }
}
