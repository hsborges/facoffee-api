import { mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { cwd } from 'process';

export interface FileService {
  save(file: string, data: Buffer): Promise<void>;
}

export class LocalFileService implements FileService {
  private baseDir: string;

  constructor(baseDir: string = process.env.DATA_DIR || join(cwd(), 'data', 'uploads')) {
    mkdirSync(baseDir, { recursive: true });
    this.baseDir = baseDir;
  }

  async save(file: string, data: Buffer): Promise<void> {
    return writeFile(join(this.baseDir, file), data);
  }
}
