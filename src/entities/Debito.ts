import { ChildEntity } from 'typeorm';

import { Operacao } from './Operacao';

@ChildEntity()
export class Debito extends Operacao {}
