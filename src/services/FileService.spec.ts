import { readFile } from 'fs/promises';
import { join } from 'path';
import { DirectoryResult, dir } from 'tmp-promise';

import { LocalFileService } from './FileService';

describe('Testa implementações de FileService', () => {
  describe('Testa FileServiceLocal', () => {
    let tmpDir: DirectoryResult | undefined;
    let fileService: LocalFileService | undefined;

    beforeAll(async () => {
      tmpDir = await dir({ unsafeCleanup: true });
      fileService = new LocalFileService(tmpDir.path);
    });

    afterAll(async () => {
      await tmpDir?.cleanup();
    });

    it('deve salvar um arquivo', async () => {
      if (!tmpDir || !fileService) throw new Error('Falha ao criar diretório temporário');

      const file = 'teste.txt';
      const data = Buffer.from('Teste');

      await fileService?.save(file, data);

      expect(await readFile(join(tmpDir?.path, file))).toEqual(data);
    });
  });
});
