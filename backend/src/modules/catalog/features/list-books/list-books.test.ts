import { expect, test } from "bun:test";
import { api, testAuthor, testIsbn, testName } from "#tests/api";

test("UC02: lista o acervo e filtra por ISBN, título e autor", async () => {
  const author = await testAuthor();
  const input = { isbn: testIsbn(), titulo: testName("Pesquisa"), autorId: author.id };
  const book = await (await api("POST", "/livros", input)).json();
  for (const term of ["", input.isbn, input.titulo, author.nome]) {
    const response = await api("GET", `/livros?q=${encodeURIComponent(term)}`);
    expect(response.status).toBe(200);
    expect((await response.json()).some((l: { id: number }) => l.id === book.id)).toBe(true);
  }
  expect((await (await api("GET", `/livros?q=${encodeURIComponent(testName("Nenhum"))}`)).json()).length).toBe(0);
});
