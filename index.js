'use strict';
var path = require('path');
var gutil = require('gulp-util');
var through = require('through2');
var chalk = require('chalk');
var JSZip = require('jszip');

module.exports = function (filename) {
	if (!filename) {
		throw new gutil.PluginError('gulp-zip', chalk.blue('filename') + ' required');
	}

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

		var relativePath = file.path.replace(file.cwd + path.sep, '');
		zip.file(relativePath, file.contents);

		cb();
	}, function (cb) {
		if (!firstFile) {
			return cb();
		}

		this.push(new gutil.File({
			cwd: firstFile.cwd,
			base: firstFile.cwd,
			path: path.join(firstFile.cwd, filename),
			contents: zip.generate({
				type: 'nodebuffer',
				compression: 'DEFLATE'
			})
		}));

		cb();
	});
};
