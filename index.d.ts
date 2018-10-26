interface Options {
	/**
	 * @default true
	 */
	compress?: boolean;
	/**
	 * Overrides the modification timestamp for all files added to the archive.
	 *
	 * Tip: Setting it to the same value across executions enables you to create stable archives—archives that change only when the contents of their entries change, regardless of whether those entries were "touched" or regenerated.
	 */
	modifiedTime?: Date;
}

/** ZIP compress files */
export default function (filename: string, options?: Options): NodeJS.ReadStream;
