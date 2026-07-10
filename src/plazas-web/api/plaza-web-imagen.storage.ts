import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import type { Request } from 'express';
import type { Options } from 'multer';

export const PLAZAS_WEB_UPLOAD_DIR = join(process.cwd(), 'uploads', 'plazas-web');
export const PLAZAS_WEB_UPLOAD_PREFIX = '/uploads/plazas-web';

const MIME_A_EXTENSION: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export const plazaWebCartelMulterOptions: Options = {
  storage: diskStorage({
    destination: (_req, _file, callback) => {
      if (!existsSync(PLAZAS_WEB_UPLOAD_DIR)) {
        mkdirSync(PLAZAS_WEB_UPLOAD_DIR, { recursive: true });
      }
      callback(null, PLAZAS_WEB_UPLOAD_DIR);
    },
    filename: (_req, file, callback) => {
      const extension = MIME_A_EXTENSION[file.mimetype] ?? extname(file.originalname);
      callback(null, `${randomUUID()}${extension}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req: Request, file, callback) => {
    if (!MIME_A_EXTENSION[file.mimetype]) {
      callback(new BadRequestException('El cartel debe ser JPEG, PNG o WEBP'));
      return;
    }
    callback(null, true);
  },
};
