import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create absolute path for uploads
const uploadDir = path.join(dirname(__dirname), 'uploads');
console.log('Upload directory path:', uploadDir);

// Ensure uploads directory exists
if (!fs.existsSync(uploadDir)) {
  console.log('Creating uploads directory');
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log('Multer destination called');
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    console.log('Multer filename called for file:', file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'avatar-' + uniqueSuffix + path.extname(file.originalname);
    console.log('Generated filename:', filename);
    cb(null, filename);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  console.log('Multer fileFilter called for file:', file.originalname, 'mimetype:', file.mimetype);
  
  // Accept images only
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    console.log('File rejected: not an allowed image type');
    return cb(new Error('Only JPG, PNG, GIF, and WebP files are allowed!'), false);
  }
  
  console.log('File accepted');
  cb(null, true);
};

// Error handling
const handleMulterError = (err, req, res, next) => {
  console.error('Multer error:', err);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ message: err.message });
  }
  next(err);
};

// Create multer instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  },
  fileFilter: fileFilter
});

export { upload, handleMulterError, uploadDir }; 