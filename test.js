import fs from 'fs';
import path from 'path';
import {constants as BufferConstants} from 'buffer';
import test from 'ava';
import Vinyl from 'vinyl';
import through2 from 'through2';
import unzip from 'decompress-unzip';
import vinylAssign from 'vinyl-assign';
import vinylFile from 'vinyl-file';
import yazl from 'yazl';
import zip from '.';

test.cb('should zip files', t => {
	const stream = zip('test.zip');
	const unzipper = unzip();
	const stats = fs.statSync(path.join(__dirname, 'fixture/fixture.txt'));
	const files = [];

	unzipper.on('data', file => {
		files.push(file);
	});

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
		t.true(file.isBuffer());
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

	unzipper.on('data', file => {
		files.push(file);
	});

	unzipper.on('end', () => {
		t.is(path.normalize(files[0].path), path.normalize('fixture/fixture.txt'));
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
		},
		mode: 0o664
	};

	unzipper.on('data', file => {
		files.push(file);
	});

	unzipper.on('end', () => {
		t.is(files[0].path, 'foo');
		t.is(files[0].stat.mode & 0o777, 0o775);
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

test.cb('when `options.modifiedTime` is specified, should override files\' actual `mtime`s', t => {
	// Create an arbitrary modification timestamp.
	const modifiedTime = new Date();

	// Set up a pipeline to zip and unzip files.
	const stream = zip('test.zip', {modifiedTime});
	const unzipper = unzip();
	stream.pipe(vinylAssign({extract: true})).pipe(unzipper);

	// Save each file to an array as it emerges from the end of the pipeline.
	const files = [];
	unzipper.on('data', file => {
		files.push(file);
	});

	// Once the pipeline has completed, ensure that all files that went through it have the manually specified
	// timestamp (to the granularity that the zip format supports).
	unzipper.on('end', () => {
		for (const file of files) {
			t.deepEqual(yazl.dateToDosDateTime(file.stat.mtime), yazl.dateToDosDateTime(modifiedTime));
		}

		t.end();
	});

	// Send the fixture file through the pipeline as a test case of a file having a real modification timestamp.
	const fixtureFile = vinylFile.readSync(path.join(__dirname, 'fixture/fixture.txt'), {buffer: false});
	stream.write(fixtureFile);

	// Send a fake file through the pipeline as another test case of a file with a different modification timestamp.
	const fakeFile = new Vinyl({
		cwd: __dirname,
		base: path.join(__dirname, 'fixture'),
		path: path.join(__dirname, 'fixture/fake.txt'),
		contents: Buffer.from('hello world'),
		stat: {
			mode: 0,
			mtime: new Date(0)
		}
	});
	stream.write(fakeFile);

	stream.end();
});

test.cb('when `options.modifiedTime` is specified, should create identical zips when ' +
	'files\' `mtime`s change but their content doesn\'t', t => {
	// Create an arbitrary modification timestamp.
	const modifiedTime = new Date();

	// Set up two independent pipelines to create and capture zip files as a Vinyl objects.
	const stream1 = zip('test1.zip', {modifiedTime});
	let zipFile1;
	stream1.pipe(through2.obj((chunk, encoding, callback) => {
		zipFile1 = chunk;
		callback();
	}));

	const stream2 = zip('test2.zip', {modifiedTime});
	let zipFile2;
	stream2.pipe(through2.obj((chunk, encoding, callback) => {
		zipFile2 = chunk;
		callback();
	}));

	// Ensure that the binary contents of the two zip files are identical after both pipelines have completed.
	stream1.on('end', () => {
		stream2.on('end', () => {
			t.is(zipFile1.contents.compare(zipFile2.contents), 0);
			t.end();
		});
	});

	// Send a fake file through the first pipeline.
	stream1.end(new Vinyl({
		cwd: __dirname,
		base: path.join(__dirname, 'fixture'),
		path: path.join(__dirname, 'fixture/fake.txt'),
		contents: Buffer.from('hello world'),
		stat: {
			mode: 0,
			mtime: new Date(0)
		}
	}));

	// Send a fake file through the second pipeline with the same contents but a different timestamp.
	stream2.end(new Vinyl({
		cwd: __dirname,
		base: path.join(__dirname, 'fixture'),
		path: path.join(__dirname, 'fixture/fake.txt'),
		contents: Buffer.from('hello world'),
		stat: {
			mode: 0,
			mtime: new Date(999999999999)
		}
	}));
});

test.cb('should produce a buffer by default', t => {
	const stream = zip('test.zip');
	const file = vinylFile.readSync(path.join(__dirname, 'fixture/fixture.txt'));

	stream.on('data', file => {
		t.true(file.isBuffer());
	});

	stream.on('end', () => {
		t.end();
	});

	stream.write(file);
	stream.end();
});

test.cb('should produce a stream if requested', t => {
	const stream = zip('test.zip', {buffer: false});
	const file = vinylFile.readSync(path.join(__dirname, 'fixture/fixture.txt'));

	stream.on('data', file => {
		t.true(file.isStream());
	});

	stream.on('end', () => {
		t.end();
	});

	stream.write(file);
	stream.end();
});

test.cb('should explain buffer size errors', t => {
	const stream = zip('test.zip', {compress: false});
	const unzipper = unzip();
	const stats = fs.statSync(path.join(__dirname, 'fixture/fixture.txt'));
	stream.pipe(vinylAssign({extract: true})).pipe(unzipper);

	stream.on('error', error => {
		t.is(error.message, 'The output ZIP file is too big to store in a buffer (larger than Buffer MAX_LENGTH). To output a stream instead, set the gulp-zip buffer option to `false`.');
		t.end();
	});

	function addFile(contents) {
		stream.write(new Vinyl({
			cwd: __dirname,
			base: path.join(__dirname, 'fixture'),
			path: path.join(__dirname, 'fixture/file.txt'),
			contents,
			stat: stats
		}));
	}

	// Yazl internally enforces a lower max buffer size than MAX_LENGTH
	const maxYazlBuffer = 1073741823;

	// Produce some giant data files to exceed max length but staying under Yazl's maximum
	const filesNeeded = Math.floor(BufferConstants.MAX_LENGTH / maxYazlBuffer);
	for (let files = 0; files < filesNeeded; files++) {
		addFile(Buffer.allocUnsafe(maxYazlBuffer));
	}

	// Pad all the way up to BufferConstants.MAX_LENGTH
	addFile(Buffer.allocUnsafe(BufferConstants.MAX_LENGTH % maxYazlBuffer));

	stream.end();
});

