'use strict';
var path = require('path');
var es = require('event-stream');
var gutil = require('gulp-util');
var AdmZip = require('adm-zip');

module.exports = function (filename) {
	if (!filename) {
		throw new Error('Missing filename.');
	}

	var firstFile;
	var zip = new AdmZip();

	return es.through(function (file) {
		if (!firstFile) {
			firstFile = file;
		}

		var relativePath = file.path.replace(file.cwd + '/', '');
		zip.addFile(relativePath, file.contents);
	}, function () {
		if (!firstFile) {
			return this.emit('end');
		}

		var joinedPath = path.join(firstFile.cwd, filename);
		var joinedFile = new gutil.File({
			cwd: firstFile.cwd,
			base: firstFile.cwd,
			path: joinedPath,
			contents: zip.toBuffer()
		});

		this.emit('data', joinedFile);
		this.emit('end');
	});
};
