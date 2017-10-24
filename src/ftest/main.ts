import { WheelShed } from "../wheel-shed";
import { Wheel } from "../wheel";

const shed = new WheelShed("./tmp")
shed.ready().then(() => {
	let wheel = new Wheel(shed);
	wheel.ready().then(() => {
		wheel.setContent("Hello World!")
			.then(() => {
				console.log("Wrote stuff to the wheel");
			})
			.catch(console.error)
	});
});
