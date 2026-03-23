/**
 * Extrai uma mensagem legível de um erro de API.
 * Cobre os casos: Error nativo, string simples, ou fallback padrão.
 */
export function getErrorMessage(err: unknown, fallback = "Ocorreu um erro inesperado."): string {
  if (err instanceof Error) return err.message || fallback;
  if (typeof err === "string") return err;
  return fallback;
}
