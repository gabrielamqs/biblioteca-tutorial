import type { RedisClient } from "bun";
import { ready, redis, redisKey } from "../../../infrastructure/redis";
import type { BookView } from "../domain/Book";

export type CacheStatus = "HIT" | "MISS" | "BYPASS";

/**
 * Um resultado em cache vale por 60 s mesmo que ninguém o invalide. É o TTL que
 * corrige os exemplares disponíveis: empréstimos e reservas mudam essa conta sem
 * passar pelo Acervo, e uma reserva vence só porque o dia passou.
 */
const TTL_SECONDS = 60;

const GENERATION = redisKey("acervo", "listas", "geracao");

/**
 * Cada geração é um hash: um campo por termo buscado, cada campo com o próprio
 * TTL (HSETEX, novo no Redis 8). Quando todos os campos expiram, o hash some.
 */
function generationHash(generation: number): string {
  return redisKey("acervo", "listas", String(generation));
}

/** A listagem usa ILIKE: "Dom Casmurro" e " dom casmurro " são o mesmo resultado. */
function field(term: string): string {
  return `q:${term.trim().toLocaleLowerCase("pt-BR")}`;
}

/**
 * Lê a geração atual e, nela, o resultado do termo. Devolve null quando não há
 * Redis (bypass): quem chamou segue direto para o Postgres.
 */
export async function readCachedList(term: string, client: RedisClient | null = redis): Promise<{ generation: number; books: BookView[] | null } | null> {
  if (!client) return null;
  try {
    await ready(client);
    const generation = Number(await client.get(GENERATION) ?? 0);
    const cached = await client.hget(generationHash(generation), field(term));
    return { generation, books: cached === null ? null : JSON.parse(cached) as BookView[] };
  } catch (error) {
    console.warn("Cache de livros indisponível:", (error as Error).message);
    return null;
  }
}

/**
 * Grava na geração que estava valendo quando a leitura começou. Se uma escrita
 * invalidou o cache no meio do caminho, este resultado (talvez velho) vai para
 * uma geração que ninguém mais lê, e expira sozinho.
 */
export async function writeCachedList(term: string, generation: number, books: BookView[], client: RedisClient | null = redis): Promise<void> {
  if (!client) return;
  try {
    await ready(client);
    await client.send("HSETEX", [generationHash(generation), "EX", String(TTL_SECONDS), "FIELDS", "1", field(term), JSON.stringify(books)]);
  } catch (error) {
    console.warn("Cache de livros indisponível:", (error as Error).message);
  }
}

/**
 * Invalida todas as listagens de uma vez: a próxima leitura procura na geração
 * seguinte, que começa vazia. Chame depois do COMMIT; antes dele, uma leitura
 * concorrente ainda veria o dado antigo no Postgres e o gravaria na geração nova.
 */
export async function invalidateBookList(client: RedisClient | null = redis): Promise<void> {
  if (!client) return;
  try {
    await ready(client);
    await client.incr(GENERATION);
  } catch (error) {
    console.warn("Cache de livros indisponível:", (error as Error).message);
  }
}
