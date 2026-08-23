import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
  'text/markdown': 'md',
  'application/octet-stream': 'txt', // sometimes sent for .md
};

const MAX_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = uuidv4();
    cb(null, `${safe}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const mimeAllowed = ALLOWED_TYPES[file.mimetype];
    const extAllowed = ['pdf', 'docx', 'txt', 'md'].includes(ext);

    if (mimeAllowed || extAllowed) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed. Accepted: PDF, DOCX, TXT, MD`));
    }
  },
});
