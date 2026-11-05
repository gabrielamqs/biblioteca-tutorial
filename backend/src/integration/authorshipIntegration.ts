import type { AuthorshipIntegration } from "../modules/authorship";
import { invalidateBookList } from "../modules/catalog";

export const authorshipIntegration: AuthorshipIntegration = {
  async countBooks(db, authorId) {
    const [row] = await db`SELECT COUNT(*)::int AS total FROM livros WHERE autor_id = ${authorId}` as { total: number }[];
    return row!.total;
  },
  async authorChanged() {
    // a listagem de livros mostra o nome do autor: qualquer mudança invalida a geração inteira
    await invalidateBookList();
  },
};
