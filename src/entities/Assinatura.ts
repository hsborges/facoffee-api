import { Column, PrimaryGeneratedColumn } from 'typeorm';

import { Plano } from './Plano';

export class Assinatura {
  @PrimaryGeneratedColumn('uuid')
  public readonly id!: string;

  @Column()
  public readonly usuario!: string;

  @Column()
  public readonly plano!: Plano;

  @Column()
  public readonly inicio_em!: Date;

  @Column()
  public readonly fim_em?: Date;

  @Column({ enum: ['ativa', 'cancelada', 'finalizada'], default: 'ativa' })
  protected _status!: 'ativa' | 'cancelada' | 'finalizada';

  get status() {
    return this._status;
  }

  @Column({ nullable: true })
  protected _encerrada_em?: Date;

  get encerrada_em() {
    return this._encerrada_em;
  }

  constructor(props: { usuario: string; plano: Plano; fim_em?: Date }) {
    this.usuario = props.usuario;
    this.plano = props.plano;
    this.fim_em = props.fim_em;
    this.inicio_em = new Date();
    this._status = 'ativa';
  }

  public encerrar(motivo: 'cancelamento' | 'finalizacao') {
    if (this.status !== 'ativa') throw new Error('Assinatura não está ativa');
    this._status = motivo === 'cancelamento' ? 'cancelada' : 'finalizada';
    this._encerrada_em = new Date();
  }

  toJSON() {
    return {
      id: this.id,
      usuario: this.usuario,
      plano: this.plano,
      inicio_em: this.inicio_em,
      fim_em: this.fim_em,
      status: this.status,
      encerrada_em: this.encerrada_em,
    };
  }
}
