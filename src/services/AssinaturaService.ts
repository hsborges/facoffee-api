import dayjs from 'dayjs';
import { Repository } from 'typeorm';

import { Assinatura } from '../entities/Assinatura';
import { Plano } from '../entities/Plano';
import { AppDataSource } from '../utils/data-source';
import { BadRequestError } from '../utils/errors';

export class AssinaturaError extends BadRequestError {
  constructor(message: string) {
    super(message);
  }
}

export class AssinaturaService {
  private readonly assinaturaRepo: Repository<Assinatura>;
  private readonly planoRepo: Repository<Plano>;

  constructor(props?: Partial<{ repositories: { assinatura: Repository<Assinatura>; plano: Repository<Plano> } }>) {
    this.assinaturaRepo = props?.repositories?.assinatura || AppDataSource.getRepository(Assinatura);
    this.planoRepo = props?.repositories?.plano || AppDataSource.getRepository(Plano);
  }

  async inscrever(usuarioId: string, planoId: string, opts?: { duracaoEmMeses: number }): Promise<Assinatura> {
    const antiga = await this.assinaturaRepo.findOneBy({ usuario: usuarioId, status: 'ativa' });
    if (antiga) throw new AssinaturaError('Usuário já possui uma assinatura ativa');
    const plano = await this.planoRepo.findOneBy({ id: planoId });
    if (!plano) throw new AssinaturaError('Plano não encontrado');
    const fim = opts?.duracaoEmMeses ? dayjs().add(opts.duracaoEmMeses, 'month').toDate() : undefined;
    return this.assinaturaRepo.save(new Assinatura({ plano, usuario: usuarioId, fim_em: fim }));
  }

  async encerrar(assinaturaId: string, motivo: 'cancelamento' | 'finalizacao' = 'finalizacao'): Promise<Assinatura> {
    const assinatura = await this.assinaturaRepo.findOneBy({ id: assinaturaId });
    if (!assinatura) throw new AssinaturaError('Assinatura não encontrada');
    if (assinatura.status !== 'ativa') throw new AssinaturaError('Assinaura não está ativa');
    return this.assinaturaRepo.save(assinatura.encerrar(motivo));
  }

  async buscarPorUsuario(usuarioId: string): Promise<Array<Assinatura>> {
    return (await this.assinaturaRepo.findBy({ usuario: usuarioId })).sort(
      (a, b) => b.inicio_em.getTime() - a.inicio_em.getTime(),
    );
  }
}
