import { DensityFeature } from "./feature.js";

export class Bump extends DensityFeature {
  copy() {
    return new Bump(this._geometry.copy(), this._density, this._material);
  }

  copyWithThk(thk) {
    return new Bump(
      this._geometry.copyWithThk(thk),
      this._density,
      this._material,
    );
  }
}
