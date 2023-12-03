import multer, { diskStorage, memoryStorage } from 'multer';
import { join } from 'path';

// Create the multer instance
export const upload = multer({ storage: memoryStorage() });
