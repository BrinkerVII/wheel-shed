import * as uuid from 'uuid';
import * as fsextra from 'fs-extra-promise';
import * as path from 'path';
import * as debug from 'debug';
import { MetadataItem } from './metadata-item';
import { WheelShed } from './wheel-shed';

const d = debug("wheel");

export class Wheel {
	private fspath: string = ".dead.wheel";
	private buffer: Buffer = new Buffer(0);
	private isReady: boolean = false;

	private metadata: MetadataItem = {
		id: uuid.v4(),
		created: (new Date()).getTime(),
		modified: (new Date()).getTime(),
		name: "New Object"
	};

	public constructor(private shed: WheelShed, initializeFile: boolean = true) {
		this.fspath = path.join(this.shed.getObjectsDirectoryPath(), this.metadata.id);

		if (initializeFile) {
			let tryWrite = () => {
				fsextra.writeFileAsync(this.fspath, "")
					.then(() => {
						d(`Initialized wheel file during init ${this.fspath}`);
						this.isReady = true;
					})
					.catch(console.error);
			}

			fsextra.existsAsync(this.fspath)
				.then(exists => {
					if (!exists) {
						tryWrite();
					} else {
						this.isReady = true;
					}
				})
				.catch(err => {
					tryWrite();
					console.error(err);
				});
		} else {
			this.isReady = true;
		}
	}

	private updateModifiedTime() {
		this.metadata.modified = (new Date()).getTime();
	}

	public getId(): string {
		return this.metadata.id;
	}

	public getName(): string {
		return this.metadata.name;
	}

	public setName(name: string) {
		this.metadata.name = name;
		this.updateModifiedTime();
	}

	private setMetadata(metadata: MetadataItem) {
		this.metadata = metadata
	}

	public getMetadata(): MetadataItem {
		let mdcopy = {};
		for (let key in this.metadata) {
			mdcopy[key] = this.metadata[key];
		}

		return <MetadataItem>mdcopy;
	}

	public writeToFile(): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			this.updateModifiedTime();
			fsextra.writeFileAsync(this.fspath, this.buffer)
				.then(() => {
					this.shed.writeMetadata()
						.then(resolve)
						.catch(reject);
				})
				.catch(reject);
		});
	}

	public readFromFile(): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			fsextra.readFileAsync(this.fspath)
				.then(content => {
					this.buffer = new Buffer(content);
				})
				.catch(reject);
		});
	}

	public ready(): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			if (this.isReady) {
				return resolve();
			}

			let timer = setInterval(() => {
				if (this.isReady) {
					clearInterval(timer);
					resolve();
				}
			}, 10);
		});
	}

	public static withMetadata(shed: WheelShed, metadata: MetadataItem) {
		let wheel = new Wheel(shed, false);
		wheel.setMetadata(metadata);
		return wheel;
	}
}
