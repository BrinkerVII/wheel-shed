import * as uuid from 'uuid';
import * as fsextra from 'fs-extra-promise';
import * as path from 'path';
import * as debug from 'debug';
import { MetadataItem } from './metadata-item';
import { WheelShed } from './wheel-shed';
import { ContentType } from './content-type';

const d = debug("wheel");

export class Wheel {
	private fspath: string = ".dead.wheel";
	private buffer: Buffer = new Buffer(0);
	private isReady: boolean = false;
	private good = true;

	protected metadata: MetadataItem = {
		id: uuid.v4(),
		created: (new Date()).getTime(),
		modified: (new Date()).getTime(),
		name: "New Object",
		contentType: ContentType.PlainText
	};

	public constructor(protected shed: WheelShed, initializeFile: boolean = true) {
		this.updateFSPath();

		let onError = (err) => {
			console.error(err);
			this.good = false;
		}

		if (initializeFile) {
			let tryWrite = () => {
				fsextra.writeFileAsync(this.fspath, "")
					.then(() => {
						d(`Initialized wheel file during init ${this.fspath}`);
						this.shed.addWheel(this, false)
							.then(() => this.isReady = true)
							.catch(onError);
					})
					.catch(onError);
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
					onError(err);
				});
		} else {
			this.isReady = true;
		}
	}

	private updateFSPath() {
		this.fspath = path.join(this.shed.getObjectsDirectoryPath(), this.metadata.id);
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

	public isGood(): boolean {
		return this.good;
	}

	public setName(name: string) {
		this.metadata.name = name;
		this.updateModifiedTime();
	}

	protected setMetadata(metadata: MetadataItem) {
		this.metadata = metadata
		this.updateFSPath();
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

	private readFromFile(): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			fsextra.readFileAsync(this.fspath)
				.then(content => {
					this.buffer = new Buffer(content);
					resolve();
				})
				.catch(reject);
		});
	}

	public removeFile(): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			fsextra.removeAsync(this.fspath)
				.then(() => {
					this.good = false;
					this.buffer = new Buffer(0);
					resolve();
				})
				.catch(reject);
		});
	}

	public remove(): Promise<void> {
		return this.shed.removeWheel(this);
	}

	public getContent(): Promise<string> {
		return new Promise<string>((resolve, reject) => {
			this.readFromFile()
				.then(() => {
					try {
						let content: string = this.buffer.toString();
						resolve(content);
					} catch (e) {
						reject(e);
					}
				})
				.catch(reject);
		});
	}

	public setContent(content: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			this.buffer = new Buffer(content);
			this.writeToFile()
				.then(resolve)
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

				if (!this.good) {
					clearInterval(timer);
					reject(new Error("Object initialization failed"));
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
