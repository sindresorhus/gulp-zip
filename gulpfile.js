var gulp = require('gulp');
var zip = require('./index');
var through = require('through2');
var exec = require("child_process").exec;

var filename='fail';

gulp.task('string-test', function () {
	gulp.src('fixture/fixture.txt')
		.pipe(through.obj(function (file, enc, cb) {
			exec("whoami", {cwd: file.cwd}, function (err, stdout, stderr) {
				if (err) {
					return cb(err);
				}
				filename = stdout.trim();
				this.push(file);
				cb();
			}.bind(this));
		}))
		.pipe(zip(function () {
			return filename + '.zip';
		}))
		.pipe(gulp.dest('dest'));
});

gulp.task('function-test', function () {
	gulp.src('fixture/fixture.txt')
		.pipe(zip('test.zip'))
		.pipe(gulp.dest('dest'));
});

gulp.task('default', ['string-test', 'function-test']);
