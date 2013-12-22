var gulp = require('gulp');
var zip = require('./index');

gulp.task('default', function () {
	gulp.src('fixture/fixture.txt')
		.pipe(zip('test.zip'))
		.pipe(gulp.dest('dest'));
});
