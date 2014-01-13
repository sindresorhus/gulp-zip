'use strict';
var assert = require('assert');
var gutil = require('gulp-util');
var zip = require('./index');
var path = require('path');

function fixPath(p) {
	return p.replace(/\//g, path.sep);
}

it('should zip files', function (cb) {
	var stream = zip('test.zip');

	stream.on('data', function (file) {
		assert.equal(fixPath(file.path), fixPath('~/dev/gulp-zip/test.zip'));
		assert.equal(file.relative, 'test.zip');
		assert(file.contents.length > 0);
		cb();
	});

	stream.write(new gutil.File({
		cwd: '~/dev/gulp-zip',
		base: '~/dev/gulp-zip/fixture',
		path: '~/dev/gulp-zip/fixture/fixture.txt',
		contents: new Buffer('hello world')
	}));

	stream.write(new gutil.File({
		cwd: '~/dev/gulp-zip',
		base: '~/dev/gulp-zip/fixture',
		path: '~/dev/gulp-zip/fixture/fixture2.txt',
		contents: new Buffer('hello world 2')
	}));

	stream.end();
});
