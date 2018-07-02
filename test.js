import fs from 'fs';
import path from 'path';
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

test.cb(`when 'options.mtimes' is specified, should override files' actual mtimes`, t => {
	// Create an arbitrary modification timestamp.
	const mtime = new Date();

	// Set up a pipeline to zip and unzip files.
	const stream = zip('test.zip', {mtime});
	const unzipper = unzip();
	stream.pipe(vinylAssign({extract: true})).pipe(unzipper);

	// Save each file to an array as it emerges from the end of the pipeline.
	const files = [];
	unzipper.on('data', files.push.bind(files));

	// Once the pipeline has completed, ensure that all files that went through it have the manually specified
	// timestamp (to the granularity that the zip format supports).
	unzipper.on('end', () => {
		for (const file of files) {
			t.deepEqual(yazl.dateToDosDateTime(file.stat.mtime), yazl.dateToDosDateTime(mtime));
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

test.cb(`when 'options.mtime' is specified, should create identical zips when ` +
	`file timestamps change but their content doesn't`, t => {
	// Create an arbitrary modification timestamp.
	const mtime = new Date();

	// Set up two independent pipelines to create and capture zip files as a Vinyl objects.
	const stream1 = zip('test1.zip', {mtime});
	let zipFile1;
	stream1.pipe(through2.obj((chunk, encoding, callback) => {
		zipFile1 = chunk;
		callback();
	}));

	const stream2 = zip('test2.zip', {mtime});
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
