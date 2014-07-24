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
        
        // ensure the corresponding folders are being created by
        // using the corresponding folder functions.
        var pathFragments = pathname.split('/');
        var folderFragments = pathFragments.slice(0, -1);
        var filename = pathFragments[pathFragments.length - 1];
        var folder = folderFragments.reduce(function(parent, name) {
            return parent.folder(name);
        }, zip);

		folder.file(filename, file.contents, {
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
				compression: 'DEFLATE',
				comment: opts.comment
			})
		}));

		cb();
	});
};
