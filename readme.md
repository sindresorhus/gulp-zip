# [gulp](https://github.com/wearefractal/gulp)-zip [![Build Status](https://secure.travis-ci.org/sindresorhus/gulp-zip.png?branch=master)](http://travis-ci.org/sindresorhus/gulp-zip)

> ZIP compress files


## Install

Install with [npm](https://npmjs.org/package/gulp-zip)

```
npm install --save-dev gulp-zip
```


## Example

```js
var gulp = require('gulp');
var zip = require('gulp-zip');

gulp.task('default', function () {
	gulp.src('src/*')
		.pipe(zip('archive.zip'))
		.pipe(gulp.dest('dist'));
});
```


## API

### zip(filename, options)
#### options.prefix
Type: `String`
Default: `''`

A filename prefix to append to each entry in the zip file. Use to alter the structure of your zip.


## License

MIT © [Sindre Sorhus](http://sindresorhus.com)
