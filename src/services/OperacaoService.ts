import { Repository } from 'typeorm';

import { Credito } from '../entities/Credito';
import { Debito } from '../entities/Debito';
import { Operacao } from '../entities/Operacao';
import { AppDataSource } from '../utils/data-source';
import { NotFoundError } from '../utils/errors';
import { FileService, LocalFileService } from './FileService';

type TDebito = ConstructorParameters<typeof Debito>[0];
type TCredito = Omit<ConstructorParameters<typeof Credito>[0], 'comprovante'> & {
  comprovante: { name: string; data: Buffer };
};

export class OperacaoService {
  private readonly repository: Repository<Operacao>;
  private readonly fileService: FileService;

  constructor(props?: Partial<{ repository: Repository<Operacao>; fileService: FileService }>) {
    this.repository = props?.repository || AppDataSource.getRepository(Operacao);
    this.fileService = props?.fileService || new LocalFileService();
  }

  async creditar({ comprovante, ...deposito }: TCredito): Promise<Credito> {
    const result = await this.repository.save(new Credito({ ...deposito, comprovante: comprovante.name }));

    await this.fileService.save(`${result.id}-${comprovante.name}`, comprovante.data).catch(async (error) => {
      await this.repository.remove(result);
      throw error;
    });

    return result;
  }

  async debitar(debito: TDebito): Promise<Debito> {
    return this.repository.save(new Debito(debito));
  }

  async revisar(id: string, revisao: { status: 'aprovado' | 'rejeitado'; revisado_por: string }): Promise<Credito> {
    const deposito = (await this.repository.findOneBy({ id })) as Credito | null;
    if (!deposito) throw new NotFoundError('Depósito não encontrado');
    return this.repository.save(deposito.revisar(revisao.status, revisao.revisado_por));
  }

  async buscarPorUsuario(id: string): Promise<Operacao[]> {
    return this.repository.findBy({ usuario: id });
  }

  async resumoPorUsuario(id: string): Promise<{ saldo: number; pendente: 0 }> {
    return this.repository.findBy({ usuario: id }).then((transacoes) => {
      return transacoes.reduce(
        (acc, curr) => {
          if (curr instanceof Credito) {
            if (curr.status === 'aprovado') acc.saldo += curr.valor;
            else if (curr.status === 'pendente') acc.pendente += curr.valor;
          } else if (curr instanceof Debito) {
            acc.saldo -= curr.valor;
          }
          return acc;
        },
        { saldo: 0, pendente: 0 },
      );
    });
  }
}
