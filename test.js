import {Buffer} from 'node:buffer';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'ava';
import Vinyl from 'vinyl';
import unzip from 'decompress-unzip';
import vinylAssign from 'vinyl-assign';
import {vinylFileSync} from 'vinyl-file';
import yazl from 'yazl';
import {pEvent} from 'p-event';
import easyTransformStream from 'easy-transform-stream';
import zip from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('should zip files', async t => {
	const zipStream = zip('test.zip');
	const unzipStream = unzip();
	const stats = fs.statSync(path.join(__dirname, 'fixture/fixture.txt'));
	const files = [];

	const finalStream = zipStream.pipe(vinylAssign({extract: true})).pipe(unzipStream);
	const promise = pEvent(finalStream, 'end');

	unzipStream.on('data', file => {
		files.push(file);
	});

	zipStream.on('data', file => {
		t.is(path.normalize(file.path), path.join(__dirname, 'fixture/test.zip'));
		t.is(file.relative, 'test.zip');
		t.true(file.isBuffer());
		t.true(file.contents.length > 0);
	});

	zipStream.write(new Vinyl({
		cwd: __dirname,
		base: path.join(__dirname, 'fixture'),
		path: path.join(__dirname, 'fixture/fixture.txt'),
		contents: Buffer.from('hello world'),
		stat: {
			mode: stats.mode,
			mtime: stats.mtime,
		},
	}));

	zipStream.write(new Vinyl({
		cwd: __dirname,
		base: path.join(__dirname, 'fixture'),
		path: path.join(__dirname, 'fixture/fixture2.txt'),
		contents: Buffer.from('hello world 2'),
		stat: {
			mode: stats.mode,
			mtime: stats.mtime,
		},
	}));

	zipStream.end();

	await promise;

	t.is(files[0].path, 'fixture.txt');
	t.is(files[1].path, 'fixture2.txt');
	t.is(files[0].contents.toString(), 'hello world');
	t.is(files[1].contents.toString(), 'hello world 2');
	t.is(files[0].stat.mode, stats.mode);
	t.is(files[1].stat.mode, stats.mode);
});

test('should zip files (using streams)', async t => {
	const file = vinylFileSync(path.join(__dirname, 'fixture/fixture.txt'), {buffer: false});
	const stats = fs.statSync(path.join(__dirname, 'fixture/fixture.txt'));
	const zipStream = zip('test.zip');
	const unzipStream = unzip();
	const files = [];

	zipStream.pipe(vinylAssign({extract: true})).pipe(unzipStream);

	unzipStream.on('data', file => {
		files.push(file);
	});

	zipStream.on('data', file => {
		t.is(path.normalize(file.path), path.join(__dirname, 'test.zip'));
		t.is(file.relative, 'test.zip');
		t.true(file.contents.length > 0);
	});

	zipStream.end(file);

	await pEvent(unzipStream, 'end');

	t.is(path.normalize(files[0].path), path.normalize('fixture/fixture.txt'));
	t.is(files[0].contents.toString(), 'hello world\n');
	t.is(files[0].stat.mode, stats.mode);
});

test('should not skip empty directories', async t => {
	const zipStream = zip('test.zip');
	const unzipStream = unzip();
	const files = [];

	const stats = {
		isDirectory() {
			return true;
		},
		mode: 0o664,
	};

	const promise = pEvent(unzipStream, 'end');

	zipStream.pipe(vinylAssign({extract: true})).pipe(unzipStream);

	unzipStream.on('data', file => {
		files.push(file);
	});

	zipStream.on('data', file => {
		t.is(path.normalize(file.path), path.join(__dirname, 'test.zip'));
		t.is(file.relative, 'test.zip');
		t.true(file.contents.length > 0);
	});

	zipStream.write(new Vinyl({
		cwd: __dirname,
		base: __dirname,
		path: path.join(__dirname, 'foo'),
		contents: null,
		stat: stats,
	}));

	zipStream.end();

	await promise;

	t.is(files[0].path, 'foo');
	t.is(files[0].stat.mode & 0o777, 0o775); // eslint-disable-line no-bitwise
});

test('when `options.modifiedTime` is specified, should override files\' actual `mtime`s', async t => {
	const modifiedTime = new Date();
	const zipStream = zip('test.zip', {modifiedTime});
	const unzipStream = unzip();
	zipStream.pipe(vinylAssign({extract: true})).pipe(unzipStream);
	const promise = pEvent(unzipStream, 'end');

	const files = [];
	unzipStream.on('data', file => {
		files.push(file);
	});

	// Send the fixture file through the pipeline as a test case of a file having a real modification timestamp.
	const fixtureFile = vinylFileSync(path.join(__dirname, 'fixture/fixture.txt'), {buffer: false});
	zipStream.write(fixtureFile);

	// Send a fake file through the pipeline as another test case of a file with a different modification timestamp.
	const fakeFile = new Vinyl({
		cwd: __dirname,
		base: path.join(__dirname, 'fixture'),
		path: path.join(__dirname, 'fixture/fake.txt'),
		contents: Buffer.from('hello world'),
		stat: {
			mode: 0,
			mtime: new Date(0),
		},
	});
	zipStream.write(fakeFile);

	zipStream.end();

	await promise;

	for (const file of files) {
		t.deepEqual(yazl.dateToDosDateTime(file.stat.mtime), yazl.dateToDosDateTime(modifiedTime));
	}
});

test('when `options.modifiedTime` is specified, should create identical zips when files\' `mtime`s change but their content doesn\'t', async t => {
	const modifiedTime = new Date();
	const stream1 = zip('test1.zip', {modifiedTime});
	let zipFile1;
	stream1.pipe(easyTransformStream({objectMode: true}, chunk => {
		zipFile1 = chunk;
		return chunk;
	}));

	const stream2 = zip('test2.zip', {modifiedTime});
	let zipFile2;
	stream2.pipe(easyTransformStream({objectMode: true}, chunk => {
		zipFile2 = chunk;
		return chunk;
	}));

	// Send a fake file through the first pipeline.
	stream1.end(new Vinyl({
		cwd: __dirname,
		base: path.join(__dirname, 'fixture'),
		path: path.join(__dirname, 'fixture/fake.txt'),
		contents: Buffer.from('hello world'),
		stat: {
			mode: 0,
			mtime: new Date(0),
		},
	}));

	// Send a fake file through the second pipeline with the same contents but a different timestamp.
	stream2.end(new Vinyl({
		cwd: __dirname,
		base: path.join(__dirname, 'fixture'),
		path: path.join(__dirname, 'fixture/fake.txt'),
		contents: Buffer.from('hello world'),
		stat: {
			mode: 0,
			mtime: new Date(999_999_999_999),
		},
	}));

	await Promise.all([pEvent(stream1, 'end'), pEvent(stream2, 'end')]);

	t.true(zipFile1.contents.equals(zipFile2.contents));
});

test('should produce a buffer by default', async t => {
	t.plan(1);

	const zipStream = zip('test.zip');
	const promise = pEvent(zipStream, 'end');
	const file = vinylFileSync(path.join(__dirname, 'fixture/fixture.txt'));

	zipStream.on('data', file => {
		t.true(file.isBuffer());
	});

	zipStream.write(file);
	zipStream.end();

	await promise;
});

test('should produce a stream if requested', async t => {
	t.plan(1);

	const zipStream = zip('test.zip', {buffer: false});
	const promise = pEvent(zipStream, 'end');
	const file = vinylFileSync(path.join(__dirname, 'fixture/fixture.txt'));

	zipStream.on('data', file => {
		t.true(file.isStream());
	});

	zipStream.write(file);
	zipStream.end();

	await promise;
});

// FIXME
// test('should explain buffer size errors', async t => {
// 	const zipStream = zip('test.zip', {compress: false});
// 	const unzipStream = unzip();
// 	const stats = fs.statSync(path.join(__dirname, 'fixture/fixture.txt'));
// 	zipStream.pipe(vinylAssign({extract: true})).pipe(unzipStream);

// 	const errorPromise = pEvent(zipStream, 'error');

// 	function addFile(contents) {
// 		zipStream.write(new Vinyl({
// 			cwd: __dirname,
// 			base: path.join(__dirname, 'fixture'),
// 			path: path.join(__dirname, 'fixture/file.txt'),
// 			contents,
// 			stat: stats,
// 		}));
// 	}

// 	const maxYazlBuffer = 1_073_741_823;
// 	const filesNeeded = Math.floor(BufferConstants.MAX_LENGTH / maxYazlBuffer);
// 	for (let files = 0; files < filesNeeded; files++) {
// 		addFile(Buffer.allocUnsafe(maxYazlBuffer));
// 	}

// 	addFile(Buffer.allocUnsafe(BufferConstants.MAX_LENGTH % maxYazlBuffer));

// 	zipStream.end();

// 	const error = await errorPromise;
// 	t.is(error.message, 'The output ZIP file is too big to store in a buffer (larger than Buffer MAX_LENGTH). To output a stream instead, set the gulp-zip buffer option to `false`.');
// });
