// src/client/types/nodepools.ts
// Nomad Node Pool types (Nomad 1.6+ / 2.0+)

export interface NomadNodePoolSchedulerConfig {
  SchedulerAlgorithm?: 'binpack' | 'spread';
  MemoryOversubscription?: 'enabled' | 'disabled';
}

export interface NomadNodePool {
  Name: string;
  Description?: string;
  Meta?: Record<string, string>;
  SchedulerConfiguration?: NomadNodePoolSchedulerConfig;
  CreateIndex?: number;
  ModifyIndex?: number;
}

export interface NomadNodePoolInput {
  Name: string;
  Description?: string;
  Meta?: Record<string, string>;
  SchedulerConfiguration?: NomadNodePoolSchedulerConfig;
}
