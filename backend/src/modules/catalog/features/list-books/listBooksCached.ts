import type { RedisClient } from "bun";
import { redis } from "../../../../infrastructure/redis";
import type { BookView } from "../../domain/Book";
import type { CatalogIntegration } from "../../domain/CatalogIntegration";
import { readCachedList, writeCachedList, type CacheStatus } from "../../infrastructure/listCache";
import { listBooks } from "./listBooks";

/**
 * Cache-aside: procura no Redis; se não estiver lá, busca no Postgres e guarda.
 * A listagem original continua igual: para cada livro, consulta o autor, a
 * contagem, os exemplares e a situação de cada exemplar; é esse custo que o
 * cache evita na segunda vez.
 */
export async function listBooksCached(term: string, integration: CatalogIntegration, client: RedisClient | null = redis): Promise<{ books: BookView[]; cache: CacheStatus }> {
  const cached = await readCachedList(term, client);
  if (cached?.books) return { books: cached.books, cache: "HIT" };
  const books = await listBooks(term, integration);
  if (!cached) return { books, cache: "BYPASS" };
  await writeCachedList(term, cached.generation, books, client);
  return { books, cache: "MISS" };
}
