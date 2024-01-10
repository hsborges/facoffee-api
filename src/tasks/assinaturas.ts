import { CronJob } from 'cron';

import { AssinaturaService } from '../services/AssinaturaService';

export default function processar(cron: string) {
  const assinaturaService = new AssinaturaService();

  return CronJob.from({
    cronTime: cron || '0 0 * * *',
    start: true,
    timeZone: 'system',
    onTick: async () => {
      const ativas = await assinaturaService.buscarAssinaturas({ status: 'ativa' });
      await Promise.all(ativas.map((assinatura) => assinaturaService.processar(assinatura.id)));
    },
  });
}
