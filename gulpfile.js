import gulp from 'gulp';
import zip from './index.js';

export default function main() {
	return gulp.src('fixture/fixture.txt')
		.pipe(zip('test.zip'))
		.pipe(gulp.dest('dest'));
}

