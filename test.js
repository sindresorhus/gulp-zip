import fs from 'fs';
import path from 'path';
import test from 'ava';
import Vinyl from 'vinyl';
import unzip from 'decompress-unzip';
import vinylAssign from 'vinyl-assign';
import vinylFile from 'vinyl-file';
import zip from '.';

test.cb('should zip files', t => {
	const stream = zip('test.zip');
	const unzipper = unzip();
	const stats = fs.statSync(path.join(__dirname, 'fixture/fixture.txt'));
	const files = [];

	unzipper.on('data', files.push.bind(files));
	unzipper.on('end', () => {
		t.is(files[0].path, 'fixture.txt');
		t.is(files[1].path, 'fixture2.txt');
		t.is(files[0].contents.toString(), 'hello world');
		t.is(files[1].contents.toString(), 'hello world 2');
		t.is(files[0].stat.mode, stats.mode);
		t.is(files[1].stat.mode, stats.mode);
		t.end();
	});

	stream.on('data', file => {
		t.is(path.normalize(file.path), path.join(__dirname, 'fixture/test.zip'));
		t.is(file.relative, 'test.zip');
		t.true(file.contents.length > 0);
	});

	stream.write(new Vinyl({
		cwd: __dirname,
		base: path.join(__dirname, 'fixture'),
		path: path.join(__dirname, 'fixture/fixture.txt'),
		contents: Buffer.from('hello world'),
		stat: {
			mode: stats.mode,
			mtime: stats.mtime
		}
	}));

	stream.write(new Vinyl({
		cwd: __dirname,
		base: path.join(__dirname, 'fixture'),
		path: path.join(__dirname, 'fixture/fixture2.txt'),
		contents: Buffer.from('hello world 2'),
		stat: {
			mode: stats.mode,
			mtime: stats.mtime
		}
	}));

	stream.pipe(vinylAssign({extract: true})).pipe(unzipper);
	stream.end();
});

test.cb('should zip files (using streams)', t => {
	const file = vinylFile.readSync(path.join(__dirname, 'fixture/fixture.txt'), {buffer: false});
	const stats = fs.statSync(path.join(__dirname, 'fixture/fixture.txt'));
	const stream = zip('test.zip');
	const unzipper = unzip();
	const files = [];

	unzipper.on('data', files.push.bind(files));
	unzipper.on('end', () => {
		t.is(files[0].path, 'fixture/fixture.txt');
		t.is(files[0].contents.toString(), 'hello world\n');
		t.is(files[0].stat.mode, stats.mode);
		t.end();
	});

	stream.on('data', file => {
		t.is(path.normalize(file.path), path.join(__dirname, 'test.zip'));
		t.is(file.relative, 'test.zip');
		t.true(file.contents.length > 0);
	});

	stream.pipe(vinylAssign({extract: true})).pipe(unzipper);
	stream.end(file);
});

test.cb('should not skip empty directories', t => {
	const stream = zip('test.zip');
	const unzipper = unzip();
	const files = [];
	const stats = {
		isDirectory() {
			return true;
		}
	};

	unzipper.on('data', files.push.bind(files));
	unzipper.on('end', () => {
		t.is(files[0].path, 'foo');
		t.end();
	});

	stream.on('data', file => {
		t.is(path.normalize(file.path), path.join(__dirname, 'test.zip'));
		t.is(file.relative, 'test.zip');
		t.true(file.contents.length > 0);
	});

	stream.write(new Vinyl({
		cwd: __dirname,
		base: __dirname,
		path: path.join(__dirname, 'foo'),
		contents: null,
		stat: stats
	}));

	stream.pipe(vinylAssign({extract: true})).pipe(unzipper);
	stream.end();
});
