import { WheelShed } from "../wheel-shed";
import { Wheel } from "../wheel";

const shed = new WheelShed("./tmp")
shed.ready().then(() => {
	// let wheel = new Wheel(shed);
	// shed.addWheel(wheel)
	// 	.then(() => {
	// 		console.log("Added wheel to shed");
	// 	})
	// 	.catch(console.error);
	console.log(shed);
});
