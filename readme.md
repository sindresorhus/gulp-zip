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

exports.default = () => (
	gulp.src('src/*')
		.pipe(zip('archive.zip'))
		.pipe(gulp.dest('dist'))
);
```


## API

Supports [streaming mode](https://github.com/gulpjs/gulp/blob/master/docs/API.md#optionsbuffer).

### zip(filename, options?)

#### filename

Type: `string`

#### options

Type: `object`

##### compress

Type: `boolean`<br>
Default: `true`

##### modifiedTime

Type: `Date`<br>
Default: `undefined`

Overrides the modification timestamp for all files added to the archive.

Tip: Setting it to the same value across executions enables you to create stable archives that change only when the contents of their entries change, regardless of whether those entries were "touched" or regenerated.
