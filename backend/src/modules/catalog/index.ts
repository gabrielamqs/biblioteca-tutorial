/**
 * API pública do módulo Acervo: a preparação das tabelas, o contrato que a
 * integração implementa e a invalidação do cache de listagens de livros, que
 * outros módulos disparam quando mudam algo que a listagem mostra.
 */
export { prepareCatalog } from "./infrastructure/schema";
export type { CatalogAuthor, CatalogDb, CatalogIntegration, CopyAvailability } from "./domain/CatalogIntegration";
export { Isbn } from "./domain/Isbn";
export { invalidateBookList } from "./infrastructure/listCache";
