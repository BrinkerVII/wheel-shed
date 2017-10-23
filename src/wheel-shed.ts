import * as fsextra from 'fs-extra-promise';
import * as debug from 'debug';
import * as path from 'path';
import { Metadata } from './metadata';
import { Wheel } from './wheel';

const d = debug('wheel-shed');

const OBJECTS_FOLDER = "objects";
const METADATA_FILENAME = ".wheel-metadata.json";

export class WheelShed {
	private objectsDirectory: string;
	private metaDataPath: string;

	private metadata: Metadata;
	private wheels: Wheel[] = [];
	private readyState: number = 0;

	constructor(private basePath: string) {
		this.initPath(this.basePath)
			.then(() => {
				d(`Base path initialized: ${this.basePath}`);
				this.readyState++;
				this.objectsDirectory = path.join(this.basePath, OBJECTS_FOLDER);
				this.metaDataPath = path.join(this.basePath, METADATA_FILENAME);

				this.initPath(this.objectsDirectory)
					.then(() => {
						d(`Objects path initialized: ${this.objectsDirectory}`);
						this.readyState++;
					})
					.catch(err => {
						d(`Failed to initialize objects directory: ${this.objectsDirectory}`);
						console.error(err);
					});

				this.touchFile(this.metaDataPath)
					.then(() => {
						d(`Initialized metadata file: ${this.metaDataPath}`);
						this.metadata = new Metadata(this.metaDataPath);
						this.readyState++;

						this.metadata.load()
							.then(() => {
								d("Loaded shed metadata, now getting the wheels");
								this.readyState++;
								this.wheels = this.metadata.getWheels(this);
							})
							.catch(err => {
								d("Failed to load shed metadata");
							});
					})
					.catch(err => {
						d(`Failed to initialize metadata file: ${this.metaDataPath}`);
						console.error(err);
					});
			})
			.catch(err => {
				d(`Failed to initialize base path: ${this.basePath}`);
				console.error(err);
			});
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

	private touchFile(filePath: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			let createFile = (): Promise<void> => {
				return new Promise<void>((resolve, reject) => {
					fsextra.createFileAsync(filePath)
						.then(resolve)
						.catch(reject);
				});
			}

			fsextra.existsAsync(filePath)
				.then(exists => {
					if (exists) {
						resolve();
					} else {
						createFile()
							.then(resolve)
							.catch(reject);
					}
				})
				.catch(err => {
					console.error(err);
					createFile()
						.then(resolve)
						.catch(reject);
				});
		});
	}

	public addWheel(wheel: Wheel): Promise<void> {
		this.wheels.push(wheel);
		this.metadata.addWheel(wheel);

		let spliceWheel = () => {
			let index = this.wheels.indexOf(wheel);
			if (index >= 0) {
				this.wheels.splice(index);
			}

			this.metadata.removeWheel(wheel);
		}

		return new Promise<void>((resolve, reject) => {
			this.metadata.write()
				.then(() => {
					wheel.writeToFile()
						.then(resolve)
						.catch(err => {
							spliceWheel();
							reject(err);
						});
				})
				.catch(err => {
					spliceWheel();
					reject(err);
				});
		});
	}

	public writeMetadata(): Promise<void> {
		return this.metadata.write();
	}

	public getObjectsDirectoryPath(): string {
		return this.objectsDirectory;
	}

	public ready(): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			let readyCondition = (): boolean => {
				return this.readyState >= 4;
			}

			if (readyCondition()) {
				return resolve();
			}

			let timer = setInterval(() => {
				if (readyCondition()) {
					clearInterval(timer);
					resolve();
				}
			}, 10)
		});
	}
}
