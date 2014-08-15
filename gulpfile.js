'use strict';
var gulp = require('gulp');
var zip = require('./');

gulp.task('default', function () {
	return gulp.src('fixture/fixture.txt')
		.pipe(zip('test.zip'))
		.pipe(gulp.dest('dest'));
});
