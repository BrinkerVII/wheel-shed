import { Wheel } from "./wheel";

export class JSONWheel extends Wheel {
	getContet(): Promise<any> {
		return new Promise((resolve, reject) => {
			super.getContent()
				.then(contentString => {
					try {
						resolve(JSON.parse(contentString));
					} catch (e) {
						reject(new Error(e));
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
}
