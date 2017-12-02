import * as fsextra from 'fs-extra-promise';
import * as debug from 'debug';
import * as path from 'path';
import { Metadata } from './metadata';
import { Wheel } from './wheel';
import { ContentType } from './content-type';
import { JSONWheel } from './json-wheel';

const d = debug('wheel-shed');

const OBJECTS_FOLDER = "objects";
const METADATA_FILENAME = ".wheel-metadata.json";

export type WheelFilter = (wheel: Wheel) => boolean;

export class WheelShed {
	private objectsDirectory: string;
	private metaDataPath: string;

	private metadata: Metadata;
	private wheels: Wheel[] = [];
	private readyState: number = 0;

	constructor(private basePath: string) {
		this.objectsDirectory = path.join(this.basePath, OBJECTS_FOLDER);
		this.metaDataPath = path.join(this.basePath, METADATA_FILENAME);

		this.initPath(this.basePath)
			.then(() => {
				d(`Base path initialized: ${this.basePath}`);
				this.readyState++;

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

	private spliceWheel(wheel: Wheel) {
		let index = this.wheels.indexOf(wheel);
		if (index >= 0) {
			this.wheels.splice(index);
		}

		this.metadata.removeWheel(wheel);
	}

	public addWheel(wheel: Wheel, writeFile: boolean = true): Promise<void> {
		this.wheels.push(wheel);
		this.metadata.addWheel(wheel);

		return new Promise<void>((resolve, reject) => {
			this.metadata.write()
				.then(() => {
					if (writeFile) {
						wheel.writeToFile()
							.then(resolve)
							.catch(err => {
								this.spliceWheel(wheel);
								reject(err);
							});
					} else {
						resolve();
					}
				})
				.catch(err => {
					this.spliceWheel(wheel);
					reject(err);
				});
		});
	}

	public removeWheel(wheel: Wheel): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			wheel.removeFile()
				.then(() => {
					this.spliceWheel(wheel);
					this.metadata.write()
						.then(resolve)
						.catch(reject);
				})
				.catch(reject);
		});
	}

	public writeMetadata(): Promise<void> {
		if (this.metadata) {
			this.metadata.fromWheels(this.wheels);
			return this.metadata.write();
		} else {
			return new Promise<void>((resolve, reject) => {
				resolve();
			});
		}
	}

	public getObjectsDirectoryPath(): string {
		return this.objectsDirectory;
	}

	public filter(filterFunction: WheelFilter): Promise<Wheel[]> {
		let wheels: Wheel[] = [];

		return new Promise<Wheel[]>((resolve, reject) => {
			try {
				for (let wheel of this.wheels) {
					if (filterFunction(wheel)) {
						wheels.push(wheel);
					}
				}
			} catch (e) {
				return reject(e);
			}

			resolve(wheels);
		});
	}

	private initWheel(wheelName: string, contentType: ContentType): Promise<Wheel> {
		let wheel: Wheel = null;

		return new Promise<Wheel>((resolve, reject) => {
			let finishInit = () => {
				wheel.setName(wheelName);
				wheel.writeToFile()
					.then(() => resolve(wheel))
					.catch(reject);
			}

			switch (contentType) {
				case ContentType.PlainText:
					wheel = new Wheel(this, false);
					wheel.ready()
						.then(() => {
							finishInit();
						})
						.catch(reject);
					return;
				case ContentType.JSON:
					wheel = new JSONWheel(this, false);
					wheel.ready()
						.then(() => {
							finishInit();
						})
						.catch(reject);
					return;
				default:
					return reject(new Error("Unsupported ContentType"));
			}
		});
	}

	public ensureWheelWithName<T>(wheelName: string, contentType: ContentType = ContentType.PlainText): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			this.filter(wheel => wheel.getName() === wheelName)
				.then(wheels => {
					let wheel = wheels[0];

					let doWheelInit = () => {
						this.initWheel(wheelName, contentType)
							.then(wheel => resolve(<any>wheel))
							.catch(reject);
					}

					if (wheel) {
						if (wheel.getMetadata().contentType !== ContentType.JSON) {
							return doWheelInit();
						}
					} else {
						return doWheelInit();
					}

					wheel.ready()
						.then(() => resolve(<any>wheel))
						.catch(reject);
				})
				.catch(reject);
		});
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

	public close(): Promise<void> {
		return this.writeMetadata();
	}
}
