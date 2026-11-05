import type { Hono } from "hono";
import { catalogIntegration } from "../../../../integration/catalogIntegration";
import { parseId } from "../../../../shared/validation";
import { bookJson } from "../../infrastructure/json";
import { getBook } from "./getBook";
import { searchBooks } from "./searchBooks";

/** UC02: consulta um livro pelo identificador. A listagem com ?q= fica na fatia list-books. */
export function registerRoutes(api: Hono): void {
  api.get("/livros/id/:id", async (c) => c.json(bookJson(await getBook(parseId(c.req.param("id")), catalogIntegration))));
  // Mantém o endereço da busca original durante a integração gradual dos PRs.
  api.get("/livros/:q", async (c) => c.json((await searchBooks(c.req.param("q"), catalogIntegration)).map(bookJson)));
}
