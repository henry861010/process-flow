import assert from "node:assert/strict";
import test from "node:test";

import { Container } from "../data/container.js";
import { PolygonGeometry } from "../data/geometry.js";
import { classifyPolygonLoops } from "../utils/polygon.js";
import { Body } from "../data/body.js";
import { BoxGeometry } from "../data/geometry.js";
import { processMolding } from "../process/process-molding.js";
import { processPanel } from "../process/process-panel.js";
import { processRdl } from "../process/process-rdl.js";
import { Status } from "../process/status.js";
import {
  CadExportError,
  OpenCascadeConverter,
  convertCad,
} from "../exporters/cad.js";
import { parseExampleArgs } from "../examples/generate-json.js";

test("container json has schema unit and stable ids", () => {
  const root = new Container({ key: "package-root" });
  root.addBodyBox("mold", [0, 0, 0], [10, 10, 0], 1);

  const child = new Container({ key: "die" });
  child.addBodyBox("silicon", [2, 2, 0.2], [8, 8, 0.2], 0.2);
  root.addChild(child);

  const first = root.json();
  const second = root.json();

  assert.equal(first.schemaVersion, "1.0.0");
  assert.equal(first.unitSystem, "um");
  assert.deepEqual(first, second);
  assert.ok(first.root.id);
  assert.ok(first.root.bodies[0].id);
  assert.ok(first.root.children[0].bodies[0].id);
});

test("polygon geometry rejects self intersection", () => {
  assert.throws(
    () =>
      new PolygonGeometry(
        [[[0, 0, 0], [2, 2, 0], [0, 2, 0], [2, 0, 0]]],
        1,
      ),
    /self-intersects/,
  );
});

test("polygon loop odd even classification", () => {
  const regions = classifyPolygonLoops([
    [[0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0]],
    [[2, 2, 0], [8, 2, 0], [8, 8, 0], [2, 8, 0]],
    [[3, 3, 0], [4, 3, 0], [4, 4, 0], [3, 4, 0]],
  ]);

  assert.equal(regions.length, 2);
  assert.deepEqual(regions.map((region) => region.holes.length), [1, 0]);
});

test("status fill and add containers track process z", () => {
  const status = new Status();
  status.initialBody(
    new Body(new BoxGeometry([0, 0, 2], [10, 10, 2], 3), "template"),
  );

  status.fillThk("base", 5);
  const die = new Container({ key: "die" });
  die.addBodyBox("silicon", [2, 2, 1], [8, 8, 1], 2);
  status.addContainers([die]);

  assert.equal(status.zNow(), 5);
  assert.equal(status.container().zMin(), 0);
  assert.equal(status.container().zMax(), 7);
  assert.equal(status.container().children()[0].zMin(), 5);
});

test("process step modules compose status independently", () => {
  const status = processPanel(new Status(), "panel", 10, 100);
  processMolding(status, "dielectric", 5);
  processRdl(status, [
    {
      pm_material: "PI",
      metal_material: "Cu",
      density: 0.2,
      thk: 3,
    },
  ]);

  assert.equal(status.zNow(), 18);
  assert.equal(status.container().bodies().length, 3);
  assert.equal(status.container().vias().length, 1);
});

test("CAD converter reports missing OpenCascade instance clearly", () => {
  assert.throws(
    () => new OpenCascadeConverter(null),
    CadExportError,
  );
});

test("CAD converter exports a box with OpenCascade.js", async () => {
  const result = await convertCad(
    {
      key: "root",
      bodies: [
        {
          geometry: {
            bottom_left: [0, 0, 0],
            top_right: [1, 1, 0],
            thk: 1,
          },
          material: "test",
        },
      ],
      children: [],
    },
    { formats: ["glb"] },
  );

  assert.ok(result.files.glb.byteLength > 0);
  assert.equal(result.manifest.bodies.length, 1);
});

test("example CLI parses output format options", () => {
  assert.deepEqual(
    parseExampleArgs(["--format", "stp", "--output", "/tmp/example"]),
    {
      format: "step",
      output: "/tmp/example",
      help: false,
    },
  );
  assert.deepEqual(parseExampleArgs(["all"]), {
    format: "all",
    output: null,
    help: false,
  });
  assert.throws(() => parseExampleArgs(["--format", "iges"]), /Unsupported/);
});
