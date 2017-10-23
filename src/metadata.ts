import { MetadataItem } from "./metadata-item";
import * as fsextra from 'fs-extra-promise';
import * as debug from 'debug';
import { Wheel } from "./wheel";
import { WheelShed } from "./wheel-shed";

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
						this.data = JSON.parse(content.toString());
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
			fsextra.writeFileAsync(this.filePath, JSON.stringify(this.data, null, "\t"))
				.then(resolve)
				.catch(reject);
		});
	}

	public getWheels(shedThatsLoadingTheData: WheelShed): Wheel[] {
		let wheels = [];
		for (let metadataItem of this.data) {
			wheels.push(Wheel.withMetadata(shedThatsLoadingTheData, metadataItem));
		}

		return wheels;
	}

	private hasMetadataWithId(id: string) {
		for (let metadataItem of this.data) {
			if (metadataItem.id === id) {
				return true;
			}
		}

		return false;
	}

	private getMetadataWithId(id: string): MetadataItem {
		for (let metadataItem of this.data) {
			if (metadataItem.id === id) {
				return metadataItem;
			}
		}

		throw new Error(`Metadata with id '${id}' not found`);
	}

	private removeMetadataWithId(id: string): boolean {
		let index = -1;

		for (let i = 0; i < this.data.length; i++) {
			if (this.data[i].id === id) {
				index = i;
				break;
			}
		}

		if (index >= 0) {
			let splice = this.data.splice(index);
			return splice.length > 0;
		}

		return false;
	}
	
	public removeWheel(wheel: Wheel) {
		this.removeMetadataWithId(wheel.getId());
	}

	public addWheel(wheel: Wheel) {
		let wheelMetadata = wheel.getMetadata();

		try {
			let existingMetadata = this.getMetadataWithId(wheelMetadata.id);
			if (existingMetadata) {
				this.removeMetadataWithId(wheelMetadata.id);
			}
		} catch (e) {
			// console.warn(e);
		}

		this.data.push(wheelMetadata);
	}
}
