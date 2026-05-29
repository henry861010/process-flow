"use client";

import {
  AlignHorizontalJustifyCenter,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  FileJson,
  PanelRight,
  Save,
  Trash2,
  X
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Background,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  getSmoothStepPath,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type EdgeProps,
  type Node,
  type NodeChange,
  type NodeProps,
  type XYPosition
} from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { exportTemplateAndInstance } from "@/domain/export";
import { addFlowTemplateToStorage, addInstanceToStorage } from "@/domain/storage";
import type {
  FieldValue,
  ProcessCatalog,
  ProcessFlowInstance,
  ProcessFlowTemplate,
  ProcessStepTemplate,
  StepRef,
  StepValueSet
} from "@/domain/types";
import {
  createDraftFlowTemplate,
  createStepValueSet,
  findStepTemplate,
  nowIso,
  shortId,
  slugify,
  updateFieldValue,
  validateInstance
} from "@/domain/utils";
import { cn } from "@/lib/utils";
import { ParameterField } from "./ParameterField";

type FlowBuilderProps = {
  catalog: ProcessCatalog;
  onCatalogChange: (catalog: ProcessCatalog) => void;
  onDone: (instance: ProcessFlowInstance) => void;
  onCancel: () => void;
};

type FlowStepInstance = {
  nodeId: string;
  stepRef: StepRef;
  position: XYPosition;
  isDragging?: boolean;
};

type BuilderEdge = {
  id: string;
  source: string;
  target: string;
};

type TemplateCategoryGroup = {
  id: string;
  label: string;
  description: string;
  templates: ProcessStepTemplate[];
};

type InitialNodeData = Record<string, unknown> & {
  label: string;
};

type StepNodeData = Record<string, unknown> & {
  stepRef: StepRef;
  template: ProcessStepTemplate | null;
  isReachable: boolean;
  isComplete: boolean;
  isDragging: boolean;
  isSelected: boolean;
  onDelete: (nodeId: string) => void;
};

type GeometryEdgeData = Record<string, unknown> & {
  showGeometryButton: boolean;
  canViewGeometry: boolean;
  onGeometryView: () => void;
};

type CanvasNode =
  | Node<InitialNodeData, "initialNode">
  | Node<StepNodeData, "processStepNode">;

type CanvasEdge = Edge<GeometryEdgeData, "geometryEdge">;

const INITIAL_NODE_ID = "initial-step";
const INITIAL_POSITION: XYPosition = { x: 80, y: 126 };
const FLOW_ROW_Y = 108;
const ORPHAN_ROW_Y = 344;
const COLUMN_GAP = 320;
const STEP_NODE_WIDTH = 264;
const STEP_NODE_HEIGHT = 132;
const CANVAS_MIN_WIDTH = 1680;
const CANVAS_HEIGHT = 640;
const PROCESS_STEP_TEMPLATE_MIME = "application/process-step-template";

function referencedStepTemplates(
  catalog: ProcessCatalog,
  flowTemplate: ProcessFlowTemplate
): ProcessStepTemplate[] {
  const templates = flowTemplate.stepRefs
    .map((stepRef) =>
      findStepTemplate(
        catalog.processStepTemplates,
        stepRef.processStepTemplateId,
        stepRef.processStepTemplateVersion
      )
    )
    .filter(Boolean) as ProcessStepTemplate[];

  return Array.from(
    new Map(templates.map((template) => [`${template.id}@${template.version}`, template])).values()
  );
}

function edgeId(source: string, target: string) {
  return `edge_${source}_${target}`;
}

function normalizeEdgesForConnection(edges: BuilderEdge[], source: string, target: string) {
  return [
    ...edges.filter((edge) => edge.source !== source && edge.target !== target),
    {
      id: edgeId(source, target),
      source,
      target
    }
  ];
}

function hasCycle(edges: BuilderEdge[]) {
  const graph = new Map<string, string[]>();

  for (const edge of edges) {
    graph.set(edge.source, [...(graph.get(edge.source) ?? []), edge.target]);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (nodeId: string): boolean => {
    if (visiting.has(nodeId)) {
      return true;
    }

    if (visited.has(nodeId)) {
      return false;
    }

    visiting.add(nodeId);

    for (const target of graph.get(nodeId) ?? []) {
      if (visit(target)) {
        return true;
      }
    }

    visiting.delete(nodeId);
    visited.add(nodeId);
    return false;
  };

  for (const nodeId of graph.keys()) {
    if (visit(nodeId)) {
      return true;
    }
  }

  return false;
}

function reachableNodeIdsFromInitial(edges: BuilderEdge[]) {
  const reachableNodeIds: string[] = [];
  const visited = new Set<string>();
  let currentNodeId = INITIAL_NODE_ID;

  while (true) {
    const nextEdge = edges.find((edge) => edge.source === currentNodeId);

    if (!nextEdge || visited.has(nextEdge.target) || nextEdge.target === INITIAL_NODE_ID) {
      break;
    }

    visited.add(nextEdge.target);
    reachableNodeIds.push(nextEdge.target);
    currentNodeId = nextEdge.target;
  }

  return reachableNodeIds;
}

function groupTemplatesByCategory(catalog: ProcessCatalog): TemplateCategoryGroup[] {
  const categoryMap = new Map(
    (catalog.processStepTemplateCategories ?? []).map((category) => [category.id, category])
  );
  const groups = new Map<string, TemplateCategoryGroup>();

  for (const template of catalog.processStepTemplates) {
    const category = categoryMap.get(template.categoryId);
    const currentGroup = groups.get(template.categoryId) ?? {
      id: template.categoryId,
      label: category?.label ?? template.categoryId,
      description: category?.description ?? template.categoryId,
      templates: []
    };

    currentGroup.templates.push(template);
    groups.set(template.categoryId, currentGroup);
  }

  return Array.from(groups.values()).sort((left, right) =>
    left.label.localeCompare(right.label)
  );
}

function createValidationFlowTemplate(stepRefs: StepRef[]): ProcessFlowTemplate {
  return {
    id: "flow_tpl_validation",
    name: "Validation draft",
    version: "0.1.0",
    owner: "simulation-team",
    status: "draft",
    stepRefs
  };
}

function createValidationInstance(
  stepRefs: StepRef[],
  stepValueSets: StepValueSet[],
  productName: string
): ProcessFlowInstance {
  const timestamp = nowIso();

  return {
    id: "flow_inst_validation",
    productName,
    lifecycleStatus: "draft",
    processFlowTemplateId: "flow_tpl_validation",
    processFlowTemplateVersion: "0.1.0",
    stepValueSets: stepRefs
      .map((stepRef) => stepValueSets.find((valueSet) => valueSet.stepRefId === stepRef.stepRefId))
      .filter(Boolean) as StepValueSet[],
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function validateStepInstances(
  instances: FlowStepInstance[],
  stepValueSets: StepValueSet[],
  stepTemplates: ProcessStepTemplate[],
  productName = "Draft"
) {
  const stepRefs = instances.map((instance) => instance.stepRef);
  const validationTemplate = createValidationFlowTemplate(stepRefs);
  const validationInstance = createValidationInstance(stepRefs, stepValueSets, productName);

  return validateInstance(validationInstance, validationTemplate, stepTemplates);
}

function buildProcessFlowInstance(options: {
  flowTemplate: ProcessFlowTemplate;
  productName: string;
  orderedStepInstances: FlowStepInstance[];
  stepValueSets: StepValueSet[];
}): ProcessFlowInstance {
  const timestamp = nowIso();
  const productSlug = slugify(options.productName) || "instance";

  return {
    id: `flow_inst_${productSlug}_${Date.now()}`,
    productName: options.productName,
    lifecycleStatus: "draft",
    processFlowTemplateId: options.flowTemplate.id,
    processFlowTemplateVersion: options.flowTemplate.version,
    stepValueSets: options.orderedStepInstances
      .map((instance) =>
        options.stepValueSets.find((valueSet) => valueSet.stepRefId === instance.stepRef.stepRefId)
      )
      .filter(Boolean) as StepValueSet[],
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function completionLabel(isComplete: boolean) {
  return isComplete ? "Complete" : "Required fields";
}

function InitialNode({ data }: NodeProps) {
  const nodeData = data as InitialNodeData;

  return (
    <div className="initial-flow-node relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-slate-900 bg-white text-center shadow-sm">
      <div>
        <CircleDot aria-hidden="true" className="mx-auto h-5 w-5 text-slate-900" />
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
          {nodeData.label}
        </p>
      </div>
      <Handle
        className="process-flow-handle process-flow-handle-source"
        id="initial-out"
        position={Position.Right}
        type="source"
      />
    </div>
  );
}

function ProcessStepNode({ id, data, dragging }: NodeProps) {
  const nodeData = data as StepNodeData;
  const template = nodeData.template;
  const isDragging = nodeData.isDragging || dragging;
  const version = template?.version ?? nodeData.stepRef.processStepTemplateVersion;
  const statusLabel = completionLabel(nodeData.isComplete);

  return (
    <div
      className={cn(
        "group process-step-node relative w-[264px] rounded-lg border-2 bg-white text-left shadow-sm transition-[border-color,box-shadow] duration-150",
        !nodeData.isReachable && "border-rose-500",
        nodeData.isReachable && nodeData.isComplete && "border-emerald-500",
        nodeData.isReachable && !nodeData.isComplete && "border-amber-500",
        isDragging && "process-step-node--dragging",
        nodeData.isSelected && "shadow-[0_0_0_4px_rgba(15,118,110,0.18)]"
      )}
    >
      <Handle
        className="process-flow-handle process-flow-handle-target"
        id="in"
        position={Position.Left}
        type="target"
      />

      <div className="px-4 py-3">
        <h3 className="line-clamp-2 pr-8 text-lg font-semibold leading-6 text-slate-950">
          {template?.name ?? nodeData.stepRef.processStepTemplateId}
        </h3>
        <div className="mt-2 flex items-center gap-2 text-[11px] leading-none">
          <span className="shrink-0 truncate font-mono text-slate-500">v{version}</span>
          <span
            className={cn(
              "truncate rounded-full px-1.5 py-1 font-semibold",
              nodeData.isComplete
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            )}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      <Button
        aria-label="Remove process step"
        className="nodrag absolute right-2 top-2 h-7 w-7 border-slate-200 bg-white/90 text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-700 focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100"
        size="icon"
        title="Remove"
        type="button"
        variant="outline"
        onClick={(event) => {
          event.stopPropagation();
          nodeData.onDelete(id);
        }}
      >
        <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
      </Button>

      <Handle
        className="process-flow-handle process-flow-handle-source"
        id="out"
        position={Position.Right}
        type="source"
      />
    </div>
  );
}

function GeometryEdge(props: EdgeProps) {
  const edgeData = props.data as GeometryEdgeData | undefined;
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
    borderRadius: 18
  });

  return (
    <>
      <BaseEdge
        id={props.id}
        interactionWidth={18}
        markerEnd={props.markerEnd}
        path={path}
        style={props.style}
      />
      {edgeData?.showGeometryButton ? (
        <EdgeLabelRenderer>
          <button
            className={cn(
              "nodrag nopan absolute z-20 inline-flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-xs font-semibold shadow-sm transition",
              edgeData.canViewGeometry
                ? "border-teal-200 bg-white text-teal-700 hover:bg-teal-50"
                : "border-slate-200 bg-slate-100 text-slate-400"
            )}
            disabled={!edgeData.canViewGeometry}
            style={{
              left: labelX,
              pointerEvents: "all",
              top: labelY
            }}
            title="Geometry state"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              edgeData.onGeometryView();
            }}
          >
            G
          </button>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

function FlowBuilderCanvas({ catalog, onCatalogChange, onDone, onCancel }: FlowBuilderProps) {
  const [technologyName, setTechnologyName] = useState("");
  const [productName, setProductName] = useState("");
  const [stepInstances, setStepInstances] = useState<FlowStepInstance[]>([]);
  const [stepValueSets, setStepValueSets] = useState<StepValueSet[]>([]);
  const [builderEdges, setBuilderEdges] = useState<BuilderEdge[]>([]);
  const [selectedStepRefId, setSelectedStepRefId] = useState<string | null>(null);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(new Set());
  const [lastSaveErrors, setLastSaveErrors] = useState<string[]>([]);
  const whiteboardScrollRef = useRef<HTMLDivElement | null>(null);
  const { screenToFlowPosition } = useReactFlow();

  const categoryGroups = useMemo(() => groupTemplatesByCategory(catalog), [catalog]);
  const reachableNodeIds = useMemo(
    () => reachableNodeIdsFromInitial(builderEdges),
    [builderEdges]
  );
  const reachableNodeIdSet = useMemo(() => new Set(reachableNodeIds), [reachableNodeIds]);
  const orderedStepInstances = useMemo(
    () =>
      reachableNodeIds
        .map((nodeId) => stepInstances.find((instance) => instance.nodeId === nodeId))
        .filter(Boolean) as FlowStepInstance[],
    [reachableNodeIds, stepInstances]
  );
  const outsideFlowCount = stepInstances.length - orderedStepInstances.length;
  const stepCompletionByNodeId = useMemo(() => {
    const completionMap = new Map<string, boolean>();

    for (const instance of stepInstances) {
      const errors = validateStepInstances(
        [instance],
        stepValueSets,
        catalog.processStepTemplates
      );
      completionMap.set(instance.nodeId, errors.length === 0);
    }

    return completionMap;
  }, [catalog.processStepTemplates, stepInstances, stepValueSets]);
  const saveReadinessErrors = useMemo(() => {
    const nextErrors: string[] = [];

    if (!technologyName.trim()) {
      nextErrors.push("Technology name is required.");
    }

    if (orderedStepInstances.length === 0) {
      nextErrors.push("Connect at least one process step from initial.");
    }

    return [
      ...nextErrors,
      ...validateStepInstances(
        orderedStepInstances,
        stepValueSets,
        catalog.processStepTemplates,
        productName
      )
    ];
  }, [
    catalog.processStepTemplates,
    orderedStepInstances,
    productName,
    stepValueSets,
    technologyName
  ]);
  const canSave = saveReadinessErrors.length === 0;
  const firstSaveIssue = saveReadinessErrors[0] ?? null;

  const canvasWidth = useMemo(() => {
    const maxNodeX = Math.max(
      INITIAL_POSITION.x,
      ...stepInstances.map((instance) => instance.position.x)
    );

    return Math.max(
      CANVAS_MIN_WIDTH,
      maxNodeX + 740,
      (stepInstances.length + 2) * COLUMN_GAP + 360
    );
  }, [stepInstances]);

  const isValidConnection = useCallback(
    (connection: Connection | CanvasEdge) => {
      const source = connection.source;
      const target = connection.target;

      if (!source || !target || source === target || target === INITIAL_NODE_ID) {
        return false;
      }

      const nextEdges = normalizeEdgesForConnection(builderEdges, source, target);
      return !hasCycle(nextEdges);
    },
    [builderEdges]
  );

  const updateValueSet = useCallback(
    (stepRefId: string, fieldId: string, nextFieldValue: FieldValue) => {
      setStepValueSets((current) =>
        current.map((valueSet) =>
          valueSet.stepRefId === stepRefId
            ? updateFieldValue(valueSet, fieldId, nextFieldValue)
            : valueSet
        )
      );
      setLastSaveErrors([]);
    },
    []
  );

  const removeStep = useCallback(
    (nodeId: string) => {
      const nextStepInstances = stepInstances.filter((instance) => instance.nodeId !== nodeId);

      setStepInstances(nextStepInstances);
      setStepValueSets((current) => current.filter((valueSet) => valueSet.stepRefId !== nodeId));
      setBuilderEdges((current) =>
        current.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
      );
      setSelectedStepRefId((current) =>
        current === nodeId ? nextStepInstances[0]?.stepRef.stepRefId ?? null : current
      );
      setLastSaveErrors([]);
    },
    [stepInstances]
  );

  const addStep = useCallback(
    (stepTemplate: ProcessStepTemplate, position: XYPosition) => {
      const index = stepInstances.length + 1;
      const stepRefId = `new_${String(index).padStart(2, "0")}_${slugify(
        stepTemplate.name
      )}_${shortId()}`;
      const nextStepRef: StepRef = {
        stepRefId,
        processStepTemplateId: stepTemplate.id,
        processStepTemplateVersion: stepTemplate.version,
        enabled: true
      };
      const normalizedPosition = {
        x: Math.max(32, position.x - STEP_NODE_WIDTH / 2),
        y: Math.max(24, Math.min(CANVAS_HEIGHT - STEP_NODE_HEIGHT - 24, position.y - 56))
      };

      setStepInstances((current) => [
        ...current,
        {
          nodeId: stepRefId,
          stepRef: nextStepRef,
          position: normalizedPosition
        }
      ]);
      setStepValueSets((current) => [...current, createStepValueSet(stepRefId, stepTemplate)]);
      setSelectedStepRefId(stepRefId);
      setLastSaveErrors([]);
    },
    [stepInstances.length]
  );

  const addStepNearPalette = (stepTemplate: ProcessStepTemplate) => {
    const offset = stepInstances.length * 36;

    addStep(stepTemplate, {
      x: INITIAL_POSITION.x + 220 + offset,
      y: ORPHAN_ROW_Y + 64
    });
  };

  const handleConnect = useCallback(
    (connection: Connection) => {
      const source = connection.source;
      const target = connection.target;

      if (!source || !target || !isValidConnection(connection)) {
        return;
      }

      setBuilderEdges((current) => normalizeEdgesForConnection(current, source, target));
      setLastSaveErrors([]);
    },
    [isValidConnection]
  );

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    const nextNodeUpdates = new Map<
      string,
      {
        isDragging?: boolean;
        position?: XYPosition;
      }
    >();

    for (const change of changes) {
      if (change.type === "position" && change.id !== INITIAL_NODE_ID) {
        const currentUpdate = nextNodeUpdates.get(change.id) ?? {};

        if (change.position) {
          currentUpdate.position = change.position;
        }

        if (typeof change.dragging === "boolean") {
          currentUpdate.isDragging = change.dragging;
        }

        nextNodeUpdates.set(change.id, currentUpdate);
      }
    }

    if (nextNodeUpdates.size === 0) {
      return;
    }

    setStepInstances((current) =>
      current.map((instance) => {
        const nextUpdate = nextNodeUpdates.get(instance.nodeId);

        return nextUpdate
          ? {
              ...instance,
              isDragging: nextUpdate.isDragging ?? instance.isDragging,
              position: nextUpdate.position ?? instance.position
            }
          : instance;
      })
    );
  }, []);

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    const removedEdgeIds = new Set<string>();

    for (const change of changes) {
      if (change.type === "remove") {
        removedEdgeIds.add(change.id);
      }
    }

    if (removedEdgeIds.size > 0) {
      setBuilderEdges((current) => current.filter((edge) => !removedEdgeIds.has(edge.id)));
      setLastSaveErrors([]);
    }
  }, []);

  const handlePaletteDragStart = (
    event: React.DragEvent<HTMLButtonElement>,
    template: ProcessStepTemplate
  ) => {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(
      PROCESS_STEP_TEMPLATE_MIME,
      `${template.id}@${template.version}`
    );
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    const templateKey = event.dataTransfer.getData(PROCESS_STEP_TEMPLATE_MIME);

    if (!templateKey) {
      return;
    }

    const [templateId, templateVersion] = templateKey.split("@");
    const template = findStepTemplate(
      catalog.processStepTemplates,
      templateId,
      templateVersion
    );

    if (!template) {
      return;
    }

    addStep(
      template,
      screenToFlowPosition({
        x: event.clientX,
        y: event.clientY
      })
    );
  };

  const handleAlign = () => {
    const reachableIds = reachableNodeIdsFromInitial(builderEdges);
    const reachableIdSet = new Set(reachableIds);
    const reachablePositions = new Map(
      reachableIds.map((nodeId, index) => [
        nodeId,
        {
          x: INITIAL_POSITION.x + 210 + index * COLUMN_GAP,
          y: FLOW_ROW_Y
        }
      ])
    );
    const outsideFlowInstances = stepInstances
      .filter((instance) => !reachableIdSet.has(instance.nodeId))
      .sort((left, right) => left.position.x - right.position.x);
    const outsidePositions = new Map(
      outsideFlowInstances.map((instance, index) => [
        instance.nodeId,
        {
          x: INITIAL_POSITION.x + 210 + index * COLUMN_GAP,
          y: ORPHAN_ROW_Y
        }
      ])
    );

    setStepInstances((current) =>
      current.map((instance) => ({
        ...instance,
        position:
          reachablePositions.get(instance.nodeId) ??
          outsidePositions.get(instance.nodeId) ??
          instance.position
      }))
    );
    whiteboardScrollRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  };

  const handleSave = () => {
    setLastSaveErrors(saveReadinessErrors);

    if (saveReadinessErrors.length > 0) {
      return;
    }

    const orderedStepRefs = orderedStepInstances.map((instance) => instance.stepRef);
    const flowTemplate = createDraftFlowTemplate(technologyName.trim(), orderedStepRefs);
    const instance = buildProcessFlowInstance({
      flowTemplate,
      orderedStepInstances,
      productName: productName.trim(),
      stepValueSets
    });
    const nextCatalog = addFlowTemplateToStorage(flowTemplate);
    const savedStore = addInstanceToStorage(instance);
    const savedInstance = savedStore.processFlowInstances[savedStore.processFlowInstances.length - 1];

    exportTemplateAndInstance({
      flowTemplate,
      instance: savedInstance,
      processStepTemplateCategories: catalog.processStepTemplateCategories,
      referencedStepTemplates: referencedStepTemplates(catalog, flowTemplate)
    });
    onCatalogChange(nextCatalog);
    onDone(savedInstance);
  };

  const nodes: CanvasNode[] = useMemo(
    () => [
      {
        id: INITIAL_NODE_ID,
        type: "initialNode",
        position: INITIAL_POSITION,
        draggable: false,
        selectable: false,
        data: {
          label: "initial"
        }
      },
      ...stepInstances.map((instance) => {
        const template =
          findStepTemplate(
            catalog.processStepTemplates,
            instance.stepRef.processStepTemplateId,
            instance.stepRef.processStepTemplateVersion
          ) ?? null;
        return {
          id: instance.nodeId,
          type: "processStepNode" as const,
          position: instance.position,
          selected: selectedStepRefId === instance.stepRef.stepRefId,
          dragging: instance.isDragging ?? false,
          data: {
            isComplete: stepCompletionByNodeId.get(instance.nodeId) ?? false,
            isDragging: instance.isDragging ?? false,
            isReachable: reachableNodeIdSet.has(instance.nodeId),
            isSelected: selectedStepRefId === instance.stepRef.stepRefId,
            onDelete: removeStep,
            stepRef: instance.stepRef,
            template
          }
        };
      })
    ],
    [
      catalog,
      reachableNodeIdSet,
      removeStep,
      selectedStepRefId,
      stepCompletionByNodeId,
      stepInstances
    ]
  );

  const edges: CanvasEdge[] = useMemo(
    () =>
      builderEdges.map((edge) => {
        const sourceIndex = orderedStepInstances.findIndex(
          (instance) => instance.nodeId === edge.source
        );
        const sourceIsInFlow = sourceIndex >= 0;
        const targetIsInFlow = reachableNodeIdSet.has(edge.target);
        const edgeIsInFlow =
          (edge.source === INITIAL_NODE_ID && targetIsInFlow) ||
          (sourceIsInFlow && targetIsInFlow);
        const showGeometryButton = edge.source !== INITIAL_NODE_ID && sourceIsInFlow && targetIsInFlow;
        const prefixInstances = sourceIsInFlow
          ? orderedStepInstances.slice(0, sourceIndex + 1)
          : [];
        const canViewGeometry =
          showGeometryButton &&
          validateStepInstances(prefixInstances, stepValueSets, catalog.processStepTemplates).length === 0;

        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: "geometryEdge",
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 18,
            height: 18
          },
          style: {
            stroke: edgeIsInFlow ? "#10b981" : "#fb7185",
            strokeWidth: 2.5
          },
          data: {
            canViewGeometry,
            showGeometryButton,
            onGeometryView: () => window.alert("geometry view feature not supported now")
          }
        };
      }),
    [builderEdges, catalog.processStepTemplates, orderedStepInstances, reachableNodeIdSet, stepValueSets]
  );

  const nodeTypes = useMemo(
    () => ({
      initialNode: InitialNode,
      processStepNode: ProcessStepNode
    }),
    []
  );
  const edgeTypes = useMemo(
    () => ({
      geometryEdge: GeometryEdge
    }),
    []
  );

  const toggleCategory = (categoryId: string) => {
    setExpandedCategoryIds((current) => {
      const next = new Set(current);

      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }

      return next;
    });
  };

  const selectedStepInstance =
    stepInstances.find((instance) => instance.stepRef.stepRefId === selectedStepRefId) ?? null;
  const selectedStepTemplate = selectedStepInstance
    ? findStepTemplate(
        catalog.processStepTemplates,
        selectedStepInstance.stepRef.processStepTemplateId,
        selectedStepInstance.stepRef.processStepTemplateVersion
      ) ?? null
    : null;
  const selectedValueSet = selectedStepInstance
    ? stepValueSets.find((valueSet) => valueSet.stepRefId === selectedStepInstance.stepRef.stepRefId) ??
      null
    : null;
  const selectedStepIsReachable = selectedStepInstance
    ? reachableNodeIdSet.has(selectedStepInstance.nodeId)
    : false;
  const selectedStepIsComplete = selectedStepInstance
    ? stepCompletionByNodeId.get(selectedStepInstance.nodeId) ?? false
    : false;

  return (
    <>
    <Card className="gap-0 overflow-hidden rounded-lg py-0 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
            Create new technology
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">
            Process flow editor
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Build a linear process flow instance from reusable step templates.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            className="h-10 px-4 font-semibold"
            type="button"
            variant="outline"
            onClick={handleAlign}
          >
            <AlignHorizontalJustifyCenter aria-hidden="true" className="h-4 w-4" />
            Align
          </Button>
          <Button
            aria-label="Close builder"
            className="border-slate-200 text-slate-600 hover:bg-slate-50"
            size="icon-lg"
            title="Close"
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid min-h-[760px] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0 border-b border-slate-200 lg:border-b-0 lg:border-r">
          <div className="grid gap-4 border-b border-slate-200 bg-white px-5 py-4 md:grid-cols-2">
            <Label className="block text-sm font-semibold text-slate-800" htmlFor="technology-name">
              Technology name
              <Input
                className="mt-2 h-10 font-normal"
                id="technology-name"
                placeholder="Example: XXX-Tech"
                value={technologyName}
                onChange={(event) => {
                  setTechnologyName(event.target.value);
                  setLastSaveErrors([]);
                }}
              />
            </Label>

            <Label className="block text-sm font-semibold text-slate-800" htmlFor="new-product-name">
              Product / instance name
              <Input
                className="mt-2 h-10 font-normal"
                id="new-product-name"
                placeholder="Example: YYY-TV"
                value={productName}
                onChange={(event) => {
                  setProductName(event.target.value);
                  setLastSaveErrors([]);
                }}
              />
            </Label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge className="bg-white text-slate-700" variant="secondary">
                {orderedStepInstances.length} flow steps
              </Badge>
              <Badge
                className={cn(
                  outsideFlowCount > 0
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-slate-200 bg-white text-slate-500"
                )}
                variant="outline"
              >
                {outsideFlowCount} outside flow
              </Badge>
              {canSave ? (
                <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
                  <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                  Ready to save
                </span>
              ) : firstSaveIssue ? (
                <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-700">
                  <AlertCircle aria-hidden="true" className="h-4 w-4" />
                  {firstSaveIssue}
                </span>
              ) : null}
            </div>

            <Button
              className="h-10 px-4 font-semibold"
              disabled={!canSave}
              title={firstSaveIssue ?? "Save process JSON"}
              type="button"
              onClick={handleSave}
            >
              <Save aria-hidden="true" className="h-4 w-4" />
              Save
            </Button>
          </div>

          {lastSaveErrors.length > 0 ? (
            <div className="border-b border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-800">
              <p className="font-semibold">Please fix these fields before Save:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {lastSaveErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div
            className="w-full overflow-x-auto overflow-y-hidden bg-slate-100"
            ref={whiteboardScrollRef}
          >
            <div
              className="process-flow-whiteboard h-[640px]"
              style={{ width: canvasWidth }}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <ReactFlow
                colorMode="light"
                connectionLineStyle={{ stroke: "#0f766e", strokeWidth: 2.5 }}
                deleteKeyCode={["Delete", "Backspace"]}
                edgeTypes={edgeTypes}
                edges={edges}
                fitView={false}
                maxZoom={1.3}
                minZoom={0.65}
                nodeExtent={[
                  [0, 0],
                  [canvasWidth - STEP_NODE_WIDTH - 40, CANVAS_HEIGHT - STEP_NODE_HEIGHT - 24]
                ]}
                nodeTypes={nodeTypes}
                nodes={nodes}
                panOnScroll={false}
                preventScrolling={false}
                proOptions={{ hideAttribution: true }}
                translateExtent={[
                  [0, 0],
                  [canvasWidth, CANVAS_HEIGHT]
                ]}
                zoomOnDoubleClick={false}
                zoomOnScroll={false}
                onConnect={handleConnect}
                onEdgesChange={handleEdgesChange}
                onNodeClick={(_, node) => {
                  if (node.type === "processStepNode") {
                    setSelectedStepRefId(node.id);
                  }
                }}
                onNodesChange={handleNodesChange}
                onPaneClick={() => setSelectedStepRefId(null)}
                isValidConnection={isValidConnection}
              >
                <Background color="#cbd5e1" gap={24} size={1.2} />
                <Controls position="bottom-left" showInteractive={false} />
              </ReactFlow>
            </div>
          </div>
        </section>

        <aside className="flex min-h-0 flex-col bg-white">
          <div className="border-b border-slate-200 px-4 py-4">
            <div className="flex items-center gap-2">
              <PanelRight aria-hidden="true" className="h-5 w-5 text-teal-700" />
              <h3 className="text-sm font-semibold text-slate-950">Step template palette</h3>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {catalog.processStepTemplates.length} reusable templates
            </p>
          </div>

          <ScrollArea className="h-[680px]">
            <div className="divide-y divide-slate-200">
              {categoryGroups.map((group) => {
                const collapsed = !expandedCategoryIds.has(group.id);

                return (
                  <section key={group.id}>
                    <button
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
                      type="button"
                      onClick={() => toggleCategory(group.id)}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-950">
                          {group.label}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500">
                          {group.templates.length} templates
                        </span>
                      </span>
                      {collapsed ? (
                        <ChevronRight aria-hidden="true" className="h-4 w-4 text-slate-500" />
                      ) : (
                        <ChevronDown aria-hidden="true" className="h-4 w-4 text-slate-500" />
                      )}
                    </button>

                    {!collapsed ? (
                      <div className="grid gap-2 px-3 pb-3">
                        {group.templates.map((template) => {
                          const hasRepeater = template.fieldDefinitions.some(
                            (field) => field.controlType === "repeater"
                          );

                          return (
                            <button
                              className="group rounded-md border border-slate-200 bg-white p-3 text-left transition hover:border-teal-500 hover:bg-teal-50"
                              draggable
                              key={`${template.id}@${template.version}`}
                              type="button"
                              onClick={() => addStepNearPalette(template)}
                              onDragStart={(event) => handlePaletteDragStart(event, template)}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <h4 className="line-clamp-2 text-sm font-semibold leading-5 text-slate-950">
                                    {template.name}
                                  </h4>
                                  <p className="mt-1 truncate font-mono text-[11px] text-slate-500">
                                    v{template.version}
                                  </p>
                                </div>
                                <FileJson
                                  aria-hidden="true"
                                  className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-teal-700"
                                />
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Badge className="bg-slate-100 text-slate-600" variant="secondary">
                                  {template.fieldDefinitions.length} fields
                                </Badge>
                                {hasRepeater ? (
                                  <Badge className="bg-cyan-50 text-cyan-700" variant="secondary">
                                    repeater
                                  </Badge>
                                ) : null}
                              </div>
                              <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-600">
                                {template.purpose}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>
          </ScrollArea>
        </aside>
      </div>
    </Card>
    <Dialog
      open={selectedStepInstance !== null}
      onOpenChange={(open) => {
        if (!open) {
          setSelectedStepRefId(null);
        }
      }}
    >
      <DialogContent
        className="grid h-[min(78vh,760px)] w-[min(76vw,1120px)] max-w-[calc(100vw-2rem)] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-lg p-0 sm:max-w-none"
        overlayClassName="bg-slate-950/55 supports-backdrop-filter:backdrop-blur-sm"
      >
        <DialogHeader className="border-b border-slate-200 px-6 py-5 pr-14">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Step instance editor
              </p>
              <DialogTitle className="mt-1 truncate text-xl font-semibold text-slate-950">
                {selectedStepTemplate?.name ??
                  selectedStepInstance?.stepRef.processStepTemplateId ??
                  "Process step"}
              </DialogTitle>
              <DialogDescription className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Fill the instance values for this process step. Closing this dialog returns to the
                whiteboard.
              </DialogDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge
                className={cn(
                  selectedStepIsReachable
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                )}
                variant="outline"
              >
                {selectedStepIsReachable ? "In flow" : "Outside flow"}
              </Badge>
              <Badge
                className={cn(
                  selectedStepIsComplete
                    ? "bg-cyan-50 text-cyan-700"
                    : "bg-amber-50 text-amber-700"
                )}
                variant="secondary"
              >
                {completionLabel(selectedStepIsComplete)}
              </Badge>
            </div>
          </div>

          {selectedStepInstance ? (
            <p className="mt-3 truncate font-mono text-xs text-slate-400">
              {selectedStepInstance.stepRef.stepRefId}
            </p>
          ) : null}
        </DialogHeader>

        <ScrollArea className="min-h-0">
          <div className="grid gap-3 p-6">
            {!selectedStepTemplate || !selectedValueSet ? (
              <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                Missing template definition.
              </p>
            ) : selectedStepTemplate.fieldDefinitions.length === 0 ? (
              <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                No parameters for this step.
              </p>
            ) : (
              selectedStepTemplate.fieldDefinitions.map((field) => {
                const fieldValue = selectedValueSet.fieldValues.find(
                  (item) => item.fieldId === field.id
                );

                if (!fieldValue) {
                  return null;
                }

                return (
                  <ParameterField
                    field={field}
                    key={field.id}
                    value={fieldValue}
                    onChange={(nextFieldValue) =>
                      updateValueSet(selectedValueSet.stepRefId, field.id, nextFieldValue)
                    }
                  />
                );
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
    </>
  );
}

export function FlowBuilder(props: FlowBuilderProps) {
  return (
    <ReactFlowProvider>
      <FlowBuilderCanvas {...props} />
    </ReactFlowProvider>
  );
}
