export interface NomadVariableMetadata {
  Path: string;
  Namespace?: string;
  CreateIndex: number;
  ModifyIndex: number;
  CreateTime: number;
  ModifyTime: number;
}

export interface NomadVariable extends NomadVariableMetadata {
  Items: Record<string, string>;
}

export interface NomadVariableInput {
  Path: string;
  Namespace?: string;
  Items: Record<string, string>;
}
