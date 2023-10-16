import * as PIXI from 'pixi.js';

const app = new PIXI.Application({ background: '#1099bb' });

document.querySelector('#pixi-wrapper').appendChild(app.view);

// create a texture from an image path
const texture = PIXI.Texture.from('https://pixijs.com/assets/bunny.png');

// Scale mode for pixelation
texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;

console.log('ZONE', app.view.width, app.view.height);

function randomInRange(from, to) {
	return 0 * (to - from) + from;
}

function moveSpriteBoxed(sprite, x, y, box = { x1: 0, x2: 0, y1: 0, y2: 0}, relative) {
	console.log(x, y);

	const anchors = sprite.anchor;

	const x1 = box.x1 + sprite.width * anchors.x;
	const x2 = box.x2 - sprite.width * (1 - anchors.x);
	const y1 = box.y1 + sprite.height * anchors.y;
	const y2 = box.y2 - sprite.height * (1 - anchors.y);

	console.log('X-cont', x1, x2);
	console.log('Y-cont', y1, y2);

	const disX = relative.x * sprite.scale.x;
	const disY = relative.y * sprite.scale.y;

	const lessX1 = (x - disX < x1);
	const moreX2 = (x - disX > x2);
	const lessY1 = (y - disY < y1);
	const moreY2 = (y - disY > y2);

	if (!lessX1 && !moreX2) {
		sprite.x = Math.round(x - disX);
	}

	if (!lessY1 && !moreY2) {
		sprite.y = Math.round(y - disY);
	}

	if (lessX1 || moreX2 || lessY1 || moreY2) {
		const posX = window.event.clientX;
		const posY = window.event.clientY;

		dragCoords = sprite.toLocal({ x: posX, y: posY }, null);
	}

	// TODO: Update cursor pos here
}

for (let i = 0; i < 3; i++) {
	const bunny = createBunny();
	bunny.anchor.set(0);
	bunny.x = 100;
	bunny.y = 100;
}

function createBunny(x, y) {
	// create our little bunny friend..
	const bunny = new PIXI.Sprite(texture);

	// enable the bunny to be interactive... this will allow it to respond to mouse and touch events
	bunny.eventMode = 'static';

	// this button mode will mean the hand cursor appears when you roll over the bunny with your mouse
	bunny.cursor = 'pointer';

	// center the bunny's anchor point
	bunny.anchor.set(0.5);

	// make it a bit bigger, so it's easier to grab
	bunny.scale.set(3);

	// setup events for mouse + touch using
	// the pointer events
	bunny.on('pointerdown', onDragStart, bunny);

	// add it to the stage
	app.stage.addChild(bunny);

	return bunny;
}

let dragTarget = null;
let dragCoords = null;

app.stage.eventMode = 'static';
app.stage.hitArea = app.screen;
app.stage.on('pointerup', onDragEnd);
app.stage.on('pointerupoutside', onDragEnd);

function onDragMove(event) {
	const padding = 50;

	if (dragTarget) {
		moveSpriteBoxed(dragTarget, event.global.x, event.global.y, {
			x1: padding, x2: app.view.width - padding,
			y1: padding, y2: app.view.height - padding,
		}, dragCoords);
	}
}

function onDragStart(event) {
	this.alpha = 0.5;
	dragTarget = this;
	dragCoords = dragTarget.toLocal(event.global, null);
	app.stage.on('pointermove', onDragMove);

	console.log(dragCoords);
}

function onDragEnd() {
	if (dragTarget) {
		app.stage.off('pointermove', onDragMove);
		dragTarget.alpha = 1;
		dragTarget = null;
	}
}
