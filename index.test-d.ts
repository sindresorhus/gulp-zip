import {expectType} from 'tsd-check';
import zip from '.';

expectType<NodeJS.ReadStream>(zip('fixture'));
expectType<NodeJS.ReadStream>(zip('fixture', {
	compress: false,
	modifiedTime: new Date()
}));
