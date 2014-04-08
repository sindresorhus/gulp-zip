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

		// JSZip requires forward slashes to delimit directories
		var pathname = file.relative.replace(/\\/g,"/");
		
		zip.file(pathname, file.contents, {
			date: file.stat ? file.stat.mtime : new Date()
		});

		cb();
	}, function (cb) {
		if (!firstFile) {
			return cb();
		}

		this.push(new gutil.File({
			cwd: firstFile.cwd,
			base: firstFile.base,
			path: path.join(firstFile.base, filename),
			contents: zip.generate({
				type: 'nodebuffer',
				compression: 'DEFLATE'
			})
		}));

		cb();
	});
};
