import { WheelShed } from "../wheel-shed";
import { Wheel } from "../wheel";

const shed = new WheelShed("./tmp")
shed.ready().then(() => {
	let wheel = new Wheel(shed);
	shed.addWheel(wheel)
		.then(() => {
			console.log("Added wheel to shed");
			wheel.ready().then(() => {
				wheel.setContent("Hello World!")
					.then(() => {
						console.log("Wrote stuff to the wheel");
					})
					.catch(console.error)
			});
		})
		.catch(console.error);
});
