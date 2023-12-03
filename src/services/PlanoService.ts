import { Entity, EntityNotFoundError, Repository } from 'typeorm';

import { Plano } from '../entities/Plano';

export class PlanoService {
  private readonly repositorio: Repository<Plano>;

  constructor(repositorio: Repository<Plano>) {
    this.repositorio = repositorio;
  }

  public async listar(todos = false): Promise<Plano[]> {
    return this.repositorio.findBy(todos ? {} : { ativo: true });
  }

  public async buscarPorId(id: string): Promise<Plano | null> {
    return this.repositorio.findOneBy({ id });
  }

  public async criar(data: ConstructorParameters<typeof Plano>[0]): Promise<Plano> {
    return this.repositorio.save(new Plano(data));
  }

  public async atualizar(
    id: string,
    data: Partial<ConstructorParameters<typeof Plano>[0]> & { ativo: boolean },
  ): Promise<Plano> {
    const plano = await this.repositorio.findOneBy({ id });
    if (!plano) throw new EntityNotFoundError(Plano, id);
    return this.repositorio.save(this.repositorio.merge(plano, data));
  }

  public async remover(id: string): Promise<void> {
    await this.repositorio.delete({ id });
  }
}
