'use strict';
const gulp = require('gulp');
const zip = require('.');

gulp.task('default', () =>
	gulp.src('fixture/fixture.txt')
		.pipe(zip('test.zip'))
		.pipe(gulp.dest('dest'))
);
