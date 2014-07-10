'use strict';
var path = require('path');
var gutil = require('gulp-util');
var through = require('through2');
var chalk = require('chalk');
var JSZip = require('jszip');

module.exports = function (filename, opts) {
	if (!filename) {
		throw new gutil.PluginError('gulp-zip', chalk.blue('filename') + ' required');
	}

	if (typeof filename !== 'string' && typeof filename !== 'function') {
		throw new Error('Invalid parameters. Input filename can be a string or function');
	}

	opts = opts || {};

	var firstFile;
	var zip = new JSZip();

	return through.obj(function (file, enc, cb) {
		if (file.isNull()) {
			return cb();
		}

		if (file.isStream()) {
			this.emit('error', new gutil.PluginError('gulp-zip', 'Streaming not supported'));
			return cb();
		}

		if (!firstFile) {
			firstFile = file;
		}

		// Because Windows...
		var pathname = file.relative.replace(/\\/g, '/');

		zip.file(pathname, file.contents, {
			date: file.stat ? file.stat.mtime : new Date()
		});

		cb();
	}, function (cb) {
		if (!firstFile) {
			return cb();
		}

		var filepath;

		if (typeof filename === 'string') {
			filepath = path.resolve(firstFile.base, filename);
		}
		if (typeof filename === 'function') {
			filepath = path.resolve(firstFile.base, filename());
		}

		this.push(new gutil.File({
			cwd: firstFile.cwd,
			base: firstFile.base,
			path: filepath,
			contents: zip.generate({
				type: 'nodebuffer',
				compression: 'DEFLATE',
				comment: opts.comment
			})
		}));

		cb();
	});
};
