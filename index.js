'use strict';
var path = require('path');
var gutil = require('gulp-util');
var through = require('through2');
var chalk = require('chalk');
var Yazl = require('yazl');
var concatStream = require('concat-stream');

module.exports = function (filename, opts) {
	if (!filename) {
		throw new gutil.PluginError('gulp-zip', chalk.blue('filename') + ' required');
	}

	opts = opts || {};
	opts.compress = typeof opts.compress === 'boolean' ? opts.compress : true;

	var firstFile;
	var zip = new Yazl.ZipFile();

	return through.obj(function (file, enc, cb) {
		if (!file.contents) {
			cb();
			return;
		}
		if (file.isStream()) {
			cb(new gutil.PluginError('gulp-zip', 'Streaming not supported'));
			return;
		}

		if (!firstFile) {
			firstFile = file;
		}

		// because Windows...
		var pathname = file.relative.replace(/\\/g, '/');

		if (file.stat && file.stat.isDirectory && file.stat.isDirectory()) {
			zip.addEmptyDirectory(pathname, {
				mtime: file.stat.mtime || new Date(),
				mode: file.stat.mode || null
			});
		} else {
			zip.addBuffer(file.contents, pathname, {
				compress: opts.compress,
				mtime: file.stat ? file.stat.mtime : new Date(),
				mode: file.stat ? file.stat.mode : null
			});
		}

		cb();
	}, function (cb) {
		if (!firstFile) {
			cb();
			return;
		}

		zip.end(function () {
			zip.outputStream.pipe(concatStream(function (data) {
				this.push(new gutil.File({
					cwd: firstFile.cwd,
					base: firstFile.base,
					path: path.join(firstFile.base, filename),
					contents: data
				}));

				cb();
			}.bind(this)));
		}.bind(this));
	});
};
