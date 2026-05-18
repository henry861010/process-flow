import type {
  ProcessCatalog,
  ProcessFlowExport,
  ProcessFlowInstance,
  ProcessFlowTemplate,
  ProcessStepTemplate
} from "./types";

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}

export function exportInstance(instance: ProcessFlowInstance) {
  const payload: ProcessFlowExport = {
    schemaVersion: "process-flow-v1",
    processFlowInstances: [instance]
  };

  downloadJson(`${instance.id}.json`, payload);
}

export function exportTemplateAndInstance(options: {
  flowTemplate: ProcessFlowTemplate;
  instance: ProcessFlowInstance;
  referencedStepTemplates: ProcessStepTemplate[];
  processStepTemplateCategories?: ProcessCatalog["processStepTemplateCategories"];
}) {
  const payload: ProcessFlowExport = {
    schemaVersion: "process-flow-v1",
    processStepTemplateCategories: options.processStepTemplateCategories,
    processStepTemplates: options.referencedStepTemplates,
    processFlowTemplates: [options.flowTemplate],
    processFlowInstances: [options.instance]
  };

  downloadJson(`${options.flowTemplate.id}_with_${options.instance.id}.json`, payload);
}

export function exportCatalog(catalog: ProcessCatalog) {
  const payload: ProcessFlowExport = {
    schemaVersion: "process-flow-v1",
    processStepTemplateCategories: catalog.processStepTemplateCategories,
    processStepTemplates: catalog.processStepTemplates,
    processFlowTemplates: catalog.processFlowTemplates
  };

  downloadJson("process-flow-catalog-v1.json", payload);
}
