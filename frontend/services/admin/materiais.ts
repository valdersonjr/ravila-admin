import { apiAuth } from "../api";

export interface Material {
  id: number;
  titulo: string;
  descricao: string | null;
  tipo: "pdf" | "link" | "video" | "imagem";
  categoria: string;
  s3_key: string | null;
  url_externa: string | null;
  aula_id: number | null;
  turma_id: number | null;
  turma_nome: string | null;
  publico: boolean;
  criado_por_id: number;
  criado_em: string;
  tem_arquivo: boolean;
}

export interface MaterialCreate {
  titulo: string;
  descricao?: string;
  tipo: "pdf" | "link" | "video" | "imagem";
  categoria: string;
  url_externa?: string;
  aula_id?: number;
  turma_id?: number;
  publico?: boolean;
}

export const materiaisService = {
  listar: (params?: { aula_id?: number; turma_id?: number; categoria?: string; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.aula_id != null) qs.set("aula_id", String(params.aula_id));
    if (params?.turma_id != null) qs.set("turma_id", String(params.turma_id));
    if (params?.categoria) qs.set("categoria", params.categoria);
    if (params?.page) qs.set("page", String(params.page));
    return apiAuth.get<Material[]>(`/materiais/${qs.toString() ? `?${qs}` : ""}`);
  },

  criar: (data: MaterialCreate) => apiAuth.post<Material>("/materiais/", data),

  atualizar: (id: number, data: Partial<MaterialCreate>) =>
    apiAuth.patch<Material>(`/materiais/${id}`, data),

  deletar: (id: number) => apiAuth.delete(`/materiais/${id}`),

  upload: (id: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiAuth.upload<Material>(`/materiais/${id}/upload`, form);
  },

  download: (id: number) => apiAuth.get<{ url: string }>(`/materiais/${id}/download`),
};

export const CATEGORIAS = [
  { value: "exercicio",   label: "Exercício" },
  { value: "gramatica",   label: "Gramática" },
  { value: "vocabulario", label: "Vocabulário" },
  { value: "pronuncia",   label: "Pronúncia" },
  { value: "outro",       label: "Outro" },
];

export const TIPOS = [
  { value: "pdf",    label: "PDF" },
  { value: "link",   label: "Link" },
  { value: "video",  label: "Vídeo" },
  { value: "imagem", label: "Imagem" },
];
