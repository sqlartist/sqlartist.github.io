// After an import: copy Medium images to the blog and point links between
// stories at the blog instead of Medium.
import { localiseImages, relinkMedium } from './post-tools.mjs';

if (!process.argv.includes('--no-images')) await localiseImages();
relinkMedium();
