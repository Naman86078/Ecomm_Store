import multer from "multer";
import path from "path";
import fs from "fs";


// STEP 1: Make sure destination folder "public/uploads" exists
const uploadDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// STEP 2: Configure Multer diskStorage
export const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

export async function saveUploadedFile(file) {
  if (!file || typeof file === "string" || !file.name || file.size === 0) {
    return "";
  }

  return new Promise((resolve, reject) => {
    // 1. Get destination from diskStorage
    storage.getDestination({}, { originalname: file.name }, (err, dest) => {
      if (err) 
        return reject(err);

      // 2. Get unique filename from diskStorage
      storage.getFilename({}, { originalname: file.name }, async (err, filename) => {
        if (err) 
          return reject(err);
        try { 
          const targetPath = path.join(dest, filename);
          const fileBytes = await file.arrayBuffer();
          fs.writeFileSync(targetPath, Buffer.from(fileBytes));
          resolve(`/uploads/${filename}`);
        } catch (writeErr) {
          reject(writeErr);
        }
      });
    });
  });
}
