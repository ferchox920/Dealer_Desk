import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFilePath);
const repoRootDirectory = path.resolve(currentDirectory, '../../../');

dotenv.config({
  path: path.join(repoRootDirectory, '.env'),
});
