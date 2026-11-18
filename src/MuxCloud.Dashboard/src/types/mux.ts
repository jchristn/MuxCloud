/**
 * Shapes returned by a machine's own mux API (relayed through /m/{machineId}). Mux serializes PascalCase.
 * Source: Mux src/Mux.Server/Routes/SessionRoutes.cs and Models/ServerDtos.cs.
 */

export interface MuxSessionTag {
  Key: string;
  Value: string;
}

export interface MuxSessionSummary {
  Id: string;
  Title?: string;
  EndpointName?: string;
  Model?: string;
  CreatedUtc?: string;
  UpdatedUtc?: string;
  MessageCount?: number;
  WorkingDirectory?: string;
  Labels?: string[];
  Tags?: MuxSessionTag[];
}

export interface MuxListResponse<T> {
  Items: T[];
  Count?: number;
}
