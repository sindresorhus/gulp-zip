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
		contents: new Buffer('hello world'),
		stat: {
			mtime: new Date()
		}
	}));

	stream.write(new gutil.File({
		cwd: __dirname,
		base: __dirname + '/fixture',
		path: __dirname + '/fixture/fixture2.txt',
		contents: new Buffer('hello world 2'),
		stat: {
			mtime: new Date()
		}
	}));

	stream.end();
});

it('should not push empty files', function (cb) {
	var stream = zip('test.zip');

	stream.on('data', assert.bind(null, false));
	stream.on('end', cb);

	stream.write(new gutil.File({
		path: __dirname + 'fixture.txt'
	}));

	stream.end();
});
