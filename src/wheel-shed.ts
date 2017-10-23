import * as fsextra from 'fs-extra-promise';
import * as debug from 'debug';
import * as path from 'path';

const d = debug('wheel-shed');

export class WheelShed {
	private objectsDirectory: string;

	constructor(private basePath: string) {
		this.initPath(this.basePath)
			.then(() => {
				d(`Base path initialized: ${this.basePath}`);
				this.objectsDirectory = path.join(this.basePath, "objects");
				
				this.initPath(this.objectsDirectory)
					.then(() => {
						d(`Objects path initialized: ${this.objectsDirectory}`);
					})
					.catch(err => {
						d(`Failed to initialize objects directory: ${this.objectsDirectory}`);
						console.error(err);
					})
			})
			.catch(err => {
				d(`Failed to initialize base path: ${this.basePath}`);
				console.error(err);
			})
	}

	private initPath(pathString: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			let mkdirs = () => {
				fsextra.mkdirsAsync(pathString)
					.then(() => {
						resolve();
					})
					.catch(reject);
			}

			fsextra.existsAsync(pathString)
				.then(exists => {
					if (exists) {
						resolve();
					} else {
						mkdirs();
					}
				})
				.catch(err => {
					mkdirs();
					console.error(err);
				})
		});
	}
}
