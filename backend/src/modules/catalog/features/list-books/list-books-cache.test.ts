import { expect, test } from "bun:test";
import { api, testAuthor, testBook, testIsbn, testName } from "#tests/api";
import { createRedis } from "../../../../infrastructure/redis";
import { catalogIntegration } from "../../../../integration/catalogIntegration";
import { invalidateBookList, readCachedList, writeCachedList } from "../../infrastructure/listCache";
import { listBooksCached } from "./listBooksCached";

type ListedBook = { id: number; titulo: string; autor: string; totalExemplares: number };

async function list(q: string) {
  const response = await api("GET", `/livros?q=${encodeURIComponent(q)}`);
  expect(response.status).toBe(200);
  return { cache: response.headers.get("X-Cache"), books: await response.json() as ListedBook[] };
}

test("UC02: a segunda listagem vem do cache", async () => {
  const book = await testBook();
  const first = await list(book.titulo);
  expect(first.cache).toBe("MISS");
  const second = await list(book.titulo);
  expect(second.cache).toBe("HIT");
  expect(second.books).toEqual(first.books);
});

test("UC02: cadastrar, editar e excluir livro invalidam o cache", async () => {
  const author = await testAuthor();
  await list(author.nome);
  expect((await list(author.nome)).cache).toBe("HIT");
  const book = await (await api("POST", "/livros", { isbn: testIsbn(), titulo: testName("Livro"), autorId: author.id })).json();
  const afterCreate = await list(author.nome);
  expect(afterCreate.cache).toBe("MISS");
  expect(afterCreate.books.map((l) => l.id)).toEqual([book.id]);

  const renamed = testName("Livro");
  expect((await api("PUT", `/livros/${book.id}`, { isbn: book.isbn, titulo: renamed, autorId: author.id })).status).toBe(200);
  const afterUpdate = await list(author.nome);
  expect(afterUpdate.cache).toBe("MISS");
  expect(afterUpdate.books).toEqual([expect.objectContaining({ id: book.id, titulo: renamed })]);

  expect((await api("DELETE", `/livros/${book.id}`)).status).toBe(204);
  const afterDelete = await list(author.nome);
  expect(afterDelete.cache).toBe("MISS");
  expect(afterDelete.books).toEqual([]);
});

test("UC02: cadastrar e excluir exemplar atualiza totalExemplares no cache", async () => {
  const book = await testBook();
  await list(book.titulo);
  const warm = await list(book.titulo);
  expect(warm.cache).toBe("HIT");
  expect(warm.books).toEqual([expect.objectContaining({ id: book.id, totalExemplares: 0 })]);

  const copy = await (await api("POST", "/exemplares", { livroId: book.id, localizacao: "Estante T", estadoConservacao: "bom" })).json();
  const afterCreate = await list(book.titulo);
  expect(afterCreate.cache).toBe("MISS");
  expect(afterCreate.books).toEqual([expect.objectContaining({ totalExemplares: 1 })]);

  expect((await api("DELETE", `/exemplares/${copy.id}`)).status).toBe(204);
  const afterDelete = await list(book.titulo);
  expect(afterDelete.cache).toBe("MISS");
  expect(afterDelete.books).toEqual([expect.objectContaining({ totalExemplares: 0 })]);
});

test("UC02: renomear o autor atualiza o nome nos livros em cache", async () => {
  const book = await testBook();
  await list(book.titulo);
  expect((await list(book.titulo)).cache).toBe("HIT");

  const renamed = testName("Autor");
  expect((await api("PUT", `/autores/${book.autorId}`, { nome: renamed, tipo: "literatura" })).status).toBe(200);
  const afterRename = await list(book.titulo);
  expect(afterRename.cache).toBe("MISS");
  expect(afterRename.books).toEqual([expect.objectContaining({ id: book.id, autor: renamed })]);
});

test("UC02: resultado velho gravado numa geração antiga não é lido", async () => {
  const term = testName("Termo");
  const read = await readCachedList(term);
  expect(read!.books).toBeNull();
  // uma escrita termina entre a leitura no Postgres e a gravação no cache
  await invalidateBookList();
  await writeCachedList(term, read!.generation, [{
    id: 1, isbn: "9788535914849", title: "Velho", authorId: 1, authorName: "Velho",
    catalogedOn: "2026-01-01", authorBookCount: 1, totalCopies: 0, availableCopies: 0,
  }]);
  expect((await readCachedList(term))!.books).toBeNull();
});

test("UC02: sem Redis a listagem responde do Postgres", async () => {
  const book = await testBook();
  const dead = createRedis("redis://127.0.0.1:1", { autoReconnect: false });
  const result = await listBooksCached(book.titulo, catalogIntegration, dead);
  expect(result.cache).toBe("BYPASS");
  expect(result.books.map((l) => l.id)).toEqual([book.id]);
  await invalidateBookList(dead);
});
