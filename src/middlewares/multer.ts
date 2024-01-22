import multer, { memoryStorage } from 'multer';

// Create the multer instance
export const upload = multer({ storage: memoryStorage() });
