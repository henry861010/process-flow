import { DensityFeature } from "./feature.js";

export class Circuit extends DensityFeature {
  copy() {
    return new Circuit(this._geometry.copy(), this._density, this._material);
  }

  copyWithThk(thk) {
    return new Circuit(
      this._geometry.copyWithThk(thk),
      this._density,
      this._material,
    );
  }
}
