import { MetadataItem } from "./metadata-item";
import * as fsextra from 'fs-extra-promise';
import * as debug from 'debug';

const d = debug("metadata");

export class Metadata {
	private data: MetadataItem[] = [];

	constructor(private filePath: string, autoLoad: boolean = false) {
		if (autoLoad) {
			this.load()
				.then(() => {
					d(`Loaded metadata file ${this.filePath}`);
				})
				.catch(err => {
					d(`Failed to load metadata file ${this.filePath}`);
					console.error(err);
				});
		}
	}

	public load(): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			fsextra.readFileAsync(this.filePath)
				.then(content => {
					try {
						this.data = content.toJSON().data;
					} catch (e) {
						console.warn(e);
						this.data = [];
					}

					resolve();
				})
				.catch(reject)
		});
	}

	public write(): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			fsextra.writeFileAsync(this.filePath, JSON.stringify(this.data))
				.then(resolve)
				.catch(reject);
		});
	}
}
