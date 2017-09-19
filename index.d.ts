declare module 'gulp-zip' {
  import { File } from 'gulp-util';

  interface IGulpZipOptions {
    /**
     * Compress
     * @default true
     */
    compress?: boolean;
  }

  const gulp_zip: (filename: string, options?: IGulpZipOptions) => NodeJS.ReadStream;

  export = gulp_zip;
}
