import { DensityFeature } from "./feature.js";

export class Vias extends DensityFeature {
  copy() {
    return new Vias(this._geometry.copy(), this._density, this._material);
  }

  copyWithThk(thk) {
    return new Vias(
      this._geometry.copyWithThk(thk),
      this._density,
      this._material,
    );
  }
}
