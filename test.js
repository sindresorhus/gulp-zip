'use strict';
var path = require('path');
var assert = require('assert');
var gutil = require('gulp-util');
var zip = require('./index');

it('should zip files', function (cb) {
	var stream = zip('test.zip');

	stream.on('data', function (file) {
		assert.equal(path.normalize(file.path), path.join(__dirname, './fixture/test.zip'));
		assert.equal(file.relative, 'test.zip');
		assert(file.contents.length > 0);
		cb();
	});

	stream.write(new gutil.File({
		cwd: __dirname,
		base: __dirname + '/fixture',
		path: __dirname + '/fixture/fixture.txt',
		contents: new Buffer('hello world')
	}));

	stream.write(new gutil.File({
		cwd: __dirname,
		base: __dirname + '/fixture',
		path: __dirname + '/fixture/fixture2.txt',
		contents: new Buffer('hello world 2')
	}));

	stream.end();
});
