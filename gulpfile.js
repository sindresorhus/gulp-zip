'use strict';
const gulp = require('gulp');
const zip = require('.');

exports.default = () => (
	gulp.src('fixture/fixture.txt')
		.pipe(zip('test.zip'))
		.pipe(gulp.dest('dest'))
);
