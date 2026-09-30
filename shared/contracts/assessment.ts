import type { AssessmentId, DeviceCategory, MetricDirection } from './common';

export interface AssessmentDefinition {
  id: AssessmentId;
  displayName: string;
  aliases: readonly string[];
  category?: string;
  primaryMetric: string;
  metricDirection: MetricDirection;
  unit: string;
  supportedDevices: readonly DeviceCategory[];
  engine?: string;
  protocolVersion?: string;
}
