import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Plano {
  @PrimaryGeneratedColumn('uuid')
  public readonly id!: string;

  @Column()
  public readonly nome!: string;

  @Column()
  public readonly descricao!: string;

  @Column()
  public readonly valor!: number;

  @Column()
  public readonly ativo!: boolean;

  constructor(props: { nome: string; descricao: string; valor: number }) {
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
