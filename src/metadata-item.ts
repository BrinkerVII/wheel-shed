import { ContentType } from "./content-type";

export interface MetadataItem {
	id: string;
	created: number;
	modified: number
	name: string;
	contentType: ContentType,
	tags: string[]
}
