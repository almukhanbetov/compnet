export interface CreateProjectRequestPayload {
  name: string;
  phone: string;
  email: string;
  company: string;
  project_type: string;
  description: string;
  budget_range: string;
  desired_timeline: string;
  contact_method: string;
  consent: boolean;
  calculator: {
    scale_tier_id: string;
    selected_module_ids: string[];
    external_api_count: number;
    multilingual: boolean;
    design_level_id: string;
    complexity_id: string;
    urgency_id: string;
  };
}

export interface ProjectRequestEstimate {
  is_individual: boolean;
  minimum_tenge: number | null;
  maximum_tenge: number | null;
  duration_label: string;
  pricing_rules_version: string;
}

export interface ProjectRequestData {
  id: string;
  status: string;
  estimate: ProjectRequestEstimate;
  created_at: string;
}

export interface ApiSuccessEnvelope<T> {
  data: T;
  meta: unknown;
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    fields: Record<string, string>;
  };
}

export type SubmitProjectRequestResult =
  | { kind: "success"; data: ProjectRequestData }
  | { kind: "validation_error"; fields: Record<string, string>; message: string }
  | { kind: "error"; message: string };
