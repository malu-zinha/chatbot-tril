export interface InterpretedMessage {
  intent: "view" | "edit" | "list_obras" | "list_areas" | "confirm" | "cancel" | "other";
  confidence: "high" | "medium" | "low";
  obra: string | null;
  area: "Elétrico" | "Hidrossanitário" | "Climatização" | "Drenagem" | "Solar" | null;
  fields: Array<{ name: string; value: string }>;
  field_to_edit: { name: string; new_value: string } | null;
  clarify: boolean;
  clarify_text: string;
}

export interface UserState {
  step: string | null;
  obraId?: string;
  obraNome?: string;
  areaNome?: string;
  projetoId?: string;
  dadosAtuais?: string;
  campos?: Array<{ nome: string; valor: string }>;
  campoIndex?: number;
}

export interface Campo {
  nome: string;
  valor: string;
}
