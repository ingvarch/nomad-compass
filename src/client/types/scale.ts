export interface NomadJobScaleRequest {
  Target: {
    Group: string;
  };
  Count?: number;
  Message?: string;
  Error?: string;
  JobModifyIndex?: number;
  EnforceIndex?: boolean;
  PolicyOverride?: boolean;
}

export interface NomadJobScaleResponse {
  EvalID: string;
  EvalCreateIndex?: number;
  JobModifyIndex?: number;
}
