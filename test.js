'use strict';
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var gutil = require('gulp-util');
var unzip = require('decompress-unzip');
var vinylAssign = require('vinyl-assign');
var zip = require('./');

it('should zip files', function (cb) {
	var stream = zip('test.zip');
	var unzipper = unzip();
	var stats = fs.statSync(__dirname + '/fixture/fixture.txt');
	var files = [];

	unzipper.on('data', files.push.bind(files));
	unzipper.on('end', function () {
		assert.equal(files[0].path, 'fixture.txt');
		assert.equal(files[1].path, 'fixture2.txt');
		assert.equal(files[0].contents.toString(), 'hello world');
		assert.equal(files[1].contents.toString(), 'hello world 2');
		assert.equal(files[0].stat.mode, stats.mode);
		assert.equal(files[1].stat.mode, stats.mode);
		cb();
	});

	stream.on('data', function (file) {
		assert.equal(path.normalize(file.path), path.join(__dirname, 'fixture/test.zip'));
		assert.equal(file.relative, 'test.zip');
		assert(file.contents.length > 0);
	});

	stream.write(new gutil.File({
		cwd: __dirname,
		base: __dirname + '/fixture',
		path: __dirname + '/fixture/fixture.txt',
		contents: new Buffer('hello world'),
		stat: {
			mode: stats.mode,
			mtime: stats.mtime
		}
	}));

	stream.write(new gutil.File({
		cwd: __dirname,
		base: __dirname + '/fixture',
		path: __dirname + '/fixture/fixture2.txt',
		contents: new Buffer('hello world 2'),
		stat: {
			mode: stats.mode,
			mtime: stats.mtime
		}
	}));

	stream.pipe(vinylAssign({extract:true})).pipe(unzipper);
	stream.end();
});
