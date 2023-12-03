import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, TableInheritance } from 'typeorm';

@Entity()
@TableInheritance({ column: { type: 'varchar', name: 'tipo' } })
export abstract class Operacao {
  @PrimaryGeneratedColumn('uuid')
  public readonly id!: string;

  @Column()
  public readonly referencia!: string;

  @Column('decimal')
  public readonly valor!: number;

  @CreateDateColumn()
  public readonly data_emissao!: Date;

  @Column()
  @Index()
  public readonly usuario!: string;

  @Column()
  @Index()
  public readonly emissor!: string;

  @Column({ nullable: true })
  public readonly descricao?: string;

  @Column()
  public readonly tipo: string = this.constructor.name;

  constructor(props: { referencia: string; valor: number; usuario: string; emissor: string; descricao?: string }) {
    if (props.valor <= 0) throw new Error('Valor inválido');

    this.referencia = props.referencia;
    this.valor = props.valor;
    this.usuario = props.usuario;
    this.emissor = props.emissor;
    this.data_emissao = new Date();
    this.descricao = props.descricao;
  }

  public toJSON() {
    return {
      id: this.id,
      referencia: this.referencia,
      valor: this.valor,
      data_emissao: this.data_emissao,
      emissor: this.emissor,
      usuario: this.usuario,
      descricao: this.descricao,
      tipo: this.tipo,
    };
  }
}
