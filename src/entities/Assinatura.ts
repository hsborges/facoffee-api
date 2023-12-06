import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Plano } from './Plano';

@Entity()
export class Assinatura {
  @PrimaryGeneratedColumn('uuid')
  public readonly id!: string;

  @Column()
  public readonly usuario!: string;

  @ManyToOne(() => Plano, (plano) => plano.id, { eager: true })
  public readonly plano!: Plano;

  @Column()
  public readonly inicio_em!: Date;

  @Column({ nullable: true })
  public readonly fim_em?: Date;

  @Column({ enum: ['ativa', 'cancelada', 'finalizada'], default: 'ativa' })
  public readonly status!: 'ativa' | 'cancelada' | 'finalizada';

  @Column({ nullable: true })
  public readonly encerrada_em?: Date;

  constructor(props: { usuario: string; plano: Plano; fim_em?: Date }) {
    this.usuario = props.usuario;
    this.plano = props.plano;
    this.fim_em = props.fim_em;
    this.inicio_em = new Date();
    this.status = 'ativa';
  }

  public encerrar(motivo: 'cancelamento' | 'finalizacao'): Assinatura {
    if (this.status !== 'ativa') throw new Error('Assinatura não está ativa');
    return Object.assign(this, {
      status: motivo === 'cancelamento' ? 'cancelada' : 'finalizada',
      encerrada_em: new Date(),
    });
  }

  toJSON() {
    return {
      id: this.id,
      usuario: this.usuario,
      plano: this.plano.id,
      inicio_em: this.inicio_em,
      fim_em: this.fim_em,
      status: this.status,
      encerrada_em: this.encerrada_em,
    };
  }
}
