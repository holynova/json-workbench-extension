export type InputSource = "manual" | "clipboard" | "selection" | "file" | "history";

export type RepairStatus = "valid" | "repaired" | "warning" | "failed";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface RepairAction {
  kind: string;
  message: string;
}

export interface RepairWarning {
  kind: string;
  message: string;
}

export interface RepairDiagnostic {
  message: string;
  line?: number;
  column?: number;
  snippet?: string;
  likelyCause?: string;
  suggestedFix?: string;
}

export interface RepairReport {
  status: RepairStatus;
  sourceMode: "json" | "jsonl" | "json-block" | "multi-json-block" | "unknown";
  actions: RepairAction[];
  warnings: RepairWarning[];
  diagnostic?: RepairDiagnostic;
}

export interface RepairSuccess {
  ok: true;
  rawInput: string;
  repairedText: string;
  formatted: string;
  minified: string;
  value: JsonValue;
  report: RepairReport;
}

export interface RepairFailure {
  ok: false;
  rawInput: string;
  report: RepairReport;
}

export type RepairResult = RepairSuccess | RepairFailure;

export type SchemaDraft = "2020-12" | "draft-07";
export type EnumInferenceMode = "off" | "conservative" | "aggressive";
export type TypeScriptStyle = "interface" | "type";
export type MockLocale = "en" | "zh_CN";

export interface GeneratorSettings {
  schemaDraft: SchemaDraft;
  strictObjects: boolean;
  enumInference: EnumInferenceMode;
  typeScriptStyle: TypeScriptStyle;
  camelCaseFields: boolean;
  mockLocale: MockLocale;
  mockArraySize: number;
  mockSeed: number;
}

export const defaultSettings: GeneratorSettings = {
  schemaDraft: "2020-12",
  strictObjects: false,
  enumInference: "conservative",
  typeScriptStyle: "interface",
  camelCaseFields: false,
  mockLocale: "en",
  mockArraySize: 3,
  mockSeed: 1
};

export interface FieldShape {
  kind:
    | "string"
    | "number"
    | "integer"
    | "boolean"
    | "null"
    | "array"
    | "object"
    | "union"
    | "unknown";
  optional?: boolean;
  nullable?: boolean;
  format?: SemanticFormat;
  enumValues?: string[];
  objectFields?: Record<string, FieldShape>;
  arrayItem?: FieldShape;
  unionMembers?: FieldShape[];
  samples?: JsonValue[];
}

export type SemanticFormat =
  | "uuid"
  | "email"
  | "url"
  | "date"
  | "date-time"
  | "ipv4"
  | "ipv6"
  | "phone"
  | "color"
  | "city"
  | "country"
  | "name"
  | "first-name"
  | "last-name"
  | "username"
  | "company"
  | "currency"
  | "price"
  | "latitude"
  | "longitude"
  | "id"
  | "slug"
  | "status"
  | "image";

export interface HistoryItem {
  id: string;
  inputHash: string;
  rawInput: string;
  repairedJson: string;
  source: InputSource;
  repairStatus: RepairStatus;
  sensitive: boolean;
  topLevelKeys: string[];
  size: number;
  mockLocale: MockLocale;
  mockSeed: number;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string;
  useCount: number;
}

