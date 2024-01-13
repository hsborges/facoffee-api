import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { ColumnNumericTransformer } from '../utils/transformer';

@Entity()
export class Plano {
  @PrimaryGeneratedColumn('uuid')
  public readonly id!: string;

  @Column()
  public readonly nome!: string;

  @Column()
  public readonly descricao!: string;

  @Column('decimal', { precision: 10, scale: 2, transformer: new ColumnNumericTransformer() })
  public readonly valor!: number;

  @Column()
  public readonly ativo!: boolean;

  constructor(props: { nome: string; descricao: string; valor: number }) {
    if (props.valor <= 0) throw new Error('Valor do plano deve ser maior que zero');

    this.nome = props.nome;
    this.descricao = props.descricao;
    this.valor = props.valor;
    this.ativo = true;
  }

  toJSON() {
    return {
      id: this.id,
      nome: this.nome,
      descricao: this.descricao,
      valor: this.valor,
      ativo: this.ativo,
    };
  }
}
