import { Wheel } from "./wheel";
import { WheelShed } from "./wheel-shed";
import { MetadataItem } from "./metadata-item";
import { ContentType } from "./content-type";

export class JSONWheel extends Wheel {
	public constructor(protected shed: WheelShed, initializeFile: boolean = true) {
		super(shed, initializeFile);
		this.metadata.contentType = ContentType.JSON;
	}

	getContent(defaultObject: any = []): Promise<any> {
		return new Promise((resolve, reject) => {
			super.getContent()
				.then(contentString => {
					try {
						resolve(JSON.parse(contentString));
					} catch (e) {
						if (e.toString().indexOf("Unexpected end of JSON input") >= 0) {
							resolve(defaultObject);
						} else {
							reject(new Error(e));
						}
					}
				})
				.catch(reject);
		});
	}

	setContent(jsonObject: any): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			try {
				super.setContent(JSON.stringify(jsonObject))
					.then(resolve)
					.catch(reject);
			} catch (e) {
				reject(new Error(e));
			}
		});
	}

	public static withMetadata(shed: WheelShed, metadata: MetadataItem) {
		let wheel = new JSONWheel(shed, false);
		wheel.setMetadata(metadata);
		return wheel;
	}
}
