# gulp-zip [![Build Status](https://travis-ci.org/sindresorhus/gulp-zip.svg?branch=master)](https://travis-ci.org/sindresorhus/gulp-zip)

> ZIP compress files


## Install

```
$ npm install --save-dev gulp-zip
```


## Usage

```js
const gulp = require('gulp');
const zip = require('gulp-zip');

gulp.task('default', () =>
	gulp.src('src/*')
		.pipe(zip('archive.zip'))
		.pipe(gulp.dest('dist'))
);
```


## API

Supports [streaming mode](https://github.com/gulpjs/gulp/blob/master/docs/API.md#optionsbuffer).

### zip(filename, [options])

#### filename

Type: `string`

#### options

Type: `Object`

##### compress

Type: `boolean`<br>
Default: `true`

##### mtime

If this optional field is specified, then its value will be assigned as the modification timestamp for all files added to the zip archive. Setting it to an invariant across executions will make the resulting zip archive's hash a means for detecting file content changes.

Type: `Date`<br>
Default: `undefined`

## License

MIT © [Sindre Sorhus](https://sindresorhus.com)
