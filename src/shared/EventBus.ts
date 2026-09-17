export type Event = { readonly nome: string };

export type Listener<E extends Event> = (event: E) => void;

/**
 * Barramento in-process: publicar um evento é uma chamada de função. Não há
 * fila, nem rede, nem broker — mas o ACOPLAMENTO já é o de mensageria: quem
 * publica não sabe quem escuta.
 */
export class EventBus {
  private readonly listeners = new Map<string, Listener<never>[]>();

  subscribe<E extends Event>(nome: E["nome"], listener: Listener<E>): void {
    const atuais = this.listeners.get(nome) ?? [];

<<<<<<< HEAD
    this.listeners.set(nome, [...atuais, listener as Listener<never>]);
=======
    this.listeners.set(nome, [...atuais, listener]);
>>>>>>> f9e0124aa7bd1a555dfda973c734390690e669e7
  }

  publish<E extends Event>(event: E): void {
    for (const listener of this.listeners.get(event.nome) ?? []) {
<<<<<<< HEAD
      (listener as unknown as Listener<E>)(event);
=======
      (listener as Listener<E>)(event);
>>>>>>> f9e0124aa7bd1a555dfda973c734390690e669e7
    }
  }
}
