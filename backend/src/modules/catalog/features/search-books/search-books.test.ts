import { expect, test } from "bun:test";
import { api, testAuthor, testIsbn, testName } from "#tests/api";

test("UC02: consulta por identificador e mantém endereço legado", async () => {
  const author = await testAuthor();
  const input = { isbn: testIsbn(), titulo: testName("Pesquisa"), autorId: author.id };
  const book = await (await api("POST", "/livros", input)).json();
  expect((await (await api("GET", `/livros/${input.isbn}`)).json())[0].id).toBe(book.id);
  expect((await (await api("GET", `/livros/id/${book.id}`)).json()).id).toBe(book.id);
  expect((await api("GET", "/livros/id/2147483647")).status).toBe(404);
});
