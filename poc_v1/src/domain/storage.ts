import { seedCatalog } from "@/data/seedCatalog";
import type { ProcessCatalog, ProcessFlowInstance, ProcessInstanceStore } from "./types";

export const CATALOG_STORAGE_KEY = "process-flow.catalog.v1";
export const INSTANCE_STORAGE_KEY = "process-flow.instances.v1";

const emptyCatalog: ProcessCatalog = {
  processStepTemplates: [],
  processFlowTemplates: []
};

const emptyInstanceStore: ProcessInstanceStore = {
  processFlowInstances: []
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);

  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value, null, 2));
}

function templateKey(id: string, version: string) {
  return `${id}@${version}`;
}

function mergeCatalog(seed: ProcessCatalog, additions: ProcessCatalog): ProcessCatalog {
  const stepMap = new Map(
    seed.processStepTemplates.map((template) => [
      templateKey(template.id, template.version),
      template
    ])
  );
  const flowMap = new Map(
    seed.processFlowTemplates.map((template) => [
      templateKey(template.id, template.version),
      template
    ])
  );

  for (const template of additions.processStepTemplates) {
    stepMap.set(templateKey(template.id, template.version), template);
  }

  for (const template of additions.processFlowTemplates) {
    flowMap.set(templateKey(template.id, template.version), template);
  }

  return {
    processStepTemplates: Array.from(stepMap.values()),
    processFlowTemplates: Array.from(flowMap.values())
  };
}

export function loadCatalogAdditions(): ProcessCatalog {
  return readJson(CATALOG_STORAGE_KEY, emptyCatalog);
}

export function saveCatalogAdditions(additions: ProcessCatalog) {
  writeJson(CATALOG_STORAGE_KEY, additions);
}

export function loadCatalog(): ProcessCatalog {
  return mergeCatalog(seedCatalog, loadCatalogAdditions());
}

export function addStepTemplateToStorage(template: ProcessCatalog["processStepTemplates"][number]) {
  const additions = loadCatalogAdditions();
  const nextAdditions = {
    ...additions,
    processStepTemplates: [...additions.processStepTemplates, template]
  };

  saveCatalogAdditions(nextAdditions);
  return loadCatalog();
}

export function addFlowTemplateToStorage(template: ProcessCatalog["processFlowTemplates"][number]) {
  const additions = loadCatalogAdditions();
  const nextAdditions = {
    ...additions,
    processFlowTemplates: [...additions.processFlowTemplates, template]
  };

  saveCatalogAdditions(nextAdditions);
  return loadCatalog();
}

export function loadInstances(): ProcessInstanceStore {
  return readJson(INSTANCE_STORAGE_KEY, emptyInstanceStore);
}

export function saveInstances(store: ProcessInstanceStore) {
  writeJson(INSTANCE_STORAGE_KEY, store);
}

export function addInstanceToStorage(instance: ProcessFlowInstance) {
  const store = loadInstances();
  const nextStore = {
    processFlowInstances: [...store.processFlowInstances, instance]
  };

  saveInstances(nextStore);
  return nextStore;
}
