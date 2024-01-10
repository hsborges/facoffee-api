import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { orderBy } from 'lodash';
import { FindOptionsWhere, Repository } from 'typeorm';

import { Assinatura } from '../entities/Assinatura';
import { Operacao } from '../entities/Operacao';
import { Plano } from '../entities/Plano';
import { AppDataSource } from '../utils/data-source';
import { BadRequestError } from '../utils/errors';
import { OperacaoService } from './OperacaoService';

dayjs.extend(isSameOrBefore);

export class AssinaturaError extends BadRequestError {
  constructor(message: string) {
    super(message);
  }
}

export class AssinaturaService {
  private readonly assinaturaRepo: Repository<Assinatura>;
  private readonly planoRepo: Repository<Plano>;
  private readonly operacaoService: OperacaoService;

  constructor(
    props?: Partial<{
      repositories: { assinatura: Repository<Assinatura>; plano: Repository<Plano> };
      services: { operacaoService: OperacaoService };
    }>,
  ) {
    this.assinaturaRepo = props?.repositories?.assinatura || AppDataSource.getRepository(Assinatura);
    this.planoRepo = props?.repositories?.plano || AppDataSource.getRepository(Plano);
    this.operacaoService = props?.services?.operacaoService || new OperacaoService();
  }

  async inscrever(usuarioId: string, planoId: string, opts?: { duracaoEmMeses: number }): Promise<Assinatura> {
    const antiga = await this.assinaturaRepo.findOneBy({ usuario: usuarioId, status: 'ativa' });
    if (antiga) throw new AssinaturaError('Usuário já possui uma assinatura ativa');
    const plano = await this.planoRepo.findOneBy({ id: planoId });
    if (!plano) throw new AssinaturaError('Plano não encontrado');
    const fim = opts?.duracaoEmMeses ? dayjs().add(opts.duracaoEmMeses, 'month').toDate() : undefined;
    return this.assinaturaRepo
      .save(new Assinatura({ plano, usuario: usuarioId, fim_em: fim }))
      .then((assinatura) => this.processar(assinatura.id).then(() => assinatura));
  }

  async encerrar(assinaturaId: string, motivo: 'cancelamento' | 'finalizacao' = 'finalizacao'): Promise<Assinatura> {
    const assinatura = await this.assinaturaRepo.findOneBy({ id: assinaturaId });
    if (!assinatura) throw new AssinaturaError('Assinatura não encontrada');
    if (assinatura.status !== 'ativa') throw new AssinaturaError('Assinaura não está ativa');
    return this.assinaturaRepo.save(assinatura.encerrar(motivo)).finally(() => this.processar(assinatura.id));
  }

  async buscarPorUsuario(usuarioId: string): Promise<Array<Assinatura>> {
    return this.buscarAssinaturas({ usuarioId });
  }

  async buscarAssinaturas(
    opts?: Partial<{ usuarioId: string; status: Assinatura['status'] }>,
  ): Promise<Array<Assinatura>> {
    const query: FindOptionsWhere<Assinatura> = {};

    if (opts?.usuarioId) Object.assign(query, { usuario: opts.usuarioId });
    if (opts?.status) Object.assign(query, { status: opts.status });

    return this.assinaturaRepo
      .findBy(query)
      .then((assinaturas) => orderBy(assinaturas, ['usuario', 'inicio_em'], ['asc', 'desc']));
  }

  async processar(assinaturaId: string): Promise<Array<Operacao>> {
    return this.assinaturaRepo.findOneBy({ id: assinaturaId }).then(async (assinatura) => {
      if (!assinatura) throw new AssinaturaError('Assinatura não encontrada');

      const base = { emissor: 'api-service', usuario: assinatura.usuario };
      const operacoes: Array<Operacao> = [];

      for (
        let date = dayjs(assinatura.inicio_em);
        assinatura.fim_em ? date.isBefore(assinatura.fim_em, 'day') : date.isBefore(Date.now());
        date = date.add(1, 'month')
      ) {
        await this.operacaoService
          .debitar({
            ...base,
            referencia: `DEB${date.toDate().getTime()}`,
            valor: assinatura.plano.valor,
            descricao: `Débito referente a assinatura do plano ${assinatura.plano.nome} em ${date.format(
              'DD/MM/YYYY [às] HH:mm:ss',
            )}`,
          })
          .then((debito) => operacoes.push(debito))
          .catch(() => void 0);
      }

      if (assinatura.status === 'cancelada') {
        const monthsDiff = dayjs().diff(assinatura.inicio_em, 'month');
        const days = dayjs().diff(dayjs(assinatura.inicio_em).add(monthsDiff, 'month'), 'day');

        await this.operacaoService
          .creditar({
            ...base,
            referencia: `DEP${assinatura.encerrada_em?.getTime()}`,
            valor: assinatura.plano.valor * Math.max(1 - days / 30, 0),
            comprovante: { name: 'comprovante.txt', data: Buffer.from('') },
            descricao: `Crédito referente ao cancelamento do plano ${assinatura.plano.nome} em ${dayjs().format(
              'DD/MM/YYYY [às] HH:mm:ss',
            )}`,
          })
          .then((credito) =>
            this.operacaoService.revisar(credito.id, {
              status: 'aprovado',
              revisado_por: base.emissor,
            }),
          )
          .then((credito) => operacoes.push(credito));
      }

      if (assinatura.status === 'ativa' && assinatura.fim_em && dayjs().isAfter(assinatura.fim_em)) {
        await this.encerrar(assinatura.id, 'finalizacao');
      }

      return operacoes;
    });
  }
}
