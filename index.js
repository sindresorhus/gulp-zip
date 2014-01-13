'use strict';
var path = require('path');
var gutil = require('gulp-util');
var through = require('through');
var chalk = require('chalk');
var AdmZip = require('adm-zip');

module.exports = function (filename) {
	if (!filename) {
		throw new gutil.PluginError('gulp-zip', chalk.blue('filename') + ' required');
	}

	var firstFile;
	var zip = new AdmZip();

	return through(function (file) {
		if (file.isNull()) {
			return;
		}

		if (file.isStream()) {
			return this.emit('error', new gutil.PluginError('gulp-zip', 'Streaming not supported'));
		}

		if (!firstFile) {
			firstFile = file;
		}

		var relativePath = file.path.replace(file.cwd + path.sep, '');
		zip.addFile(relativePath, file.contents);
	}, function () {
		if (!firstFile) {
			return this.queue(null);
		}

		var joinedPath = path.join(firstFile.cwd, filename);
		var joinedFile = new gutil.File({
			cwd: firstFile.cwd,
			base: firstFile.cwd,
			path: joinedPath,
			contents: zip.toBuffer()
		});

		this.queue(joinedFile);
		this.queue(null);
	});
};
