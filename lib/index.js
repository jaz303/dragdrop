var ev = require('dom-bind');

// Trivial stuff:
//   - configurable ghost creator
//     - default implementation should set width/height explicitly
//   - configurable acceptance test
//   - configurable dropped handler
//   - configurable on-drag-start handler

// - auto-drag child elements (drag delegation)
// - drag handles
// - reordering helper
// - drag actual element
// - scrolling drop zones
// - constraints (axis, containers, snapping)
// - touch support
// - thresholds
// - multiple objects
// - tree support

function Ghost(el, offsetX, offsetY) {
	this.el = el;
	this.ox = offsetX;
	this.oy = offsetY;
	this.adopted = false;
}

Ghost.prototype.destroy = function() {
	this.el.parentNode.removeChild(this.el);
	this.el = null;
}

Ghost.prototype.moveTo = function(x, y) {
	this.el.style.left = (x + this.ox) + 'px';
	this.el.style.top = (y + this.oy) + 'px';
}

Ghost.prototype.adopt = function() {
	this.adopted = true;
	return this.el;
}

function makeGhostElement(el) {
	var ghost = el.cloneNode(true);
	ghost.style.opacity = 0.6;
	ghost.style.pointerEvents = 'none';
	ghost.style.display = 'block';
	ghost.style.position = 'absolute';
	return ghost;
}

function getEventElementOffset(evt, target) {
	if (evt.target !== target) throw new Error("non-target element not yet supported");
	return {x: evt.offsetX, y: evt.offsetY};
}

function dropzoneFromEvent(evt) {
	var tmp = evt.target;
	while (tmp) {
		if (tmp.__dropzone) {
			return tmp.__dropzone;
		}
		tmp = tmp.parent;
	}
	return null;
}


exports.draggable = draggable;
function draggable(el) {
	ev.bind(el, 'mousedown', function(evt) {
		evt.preventDefault();
		evt.stopPropagation();

		var clickOffset = getEventElementOffset(evt, evt.target);
		var ghost = new Ghost(makeGhostElement(evt.target), -clickOffset.x, -clickOffset.y);
		document.body.appendChild(ghost.el);
		ghost.moveTo(evt.pageX, evt.pageY);

		ev.bind(document.body, 'mousemove', _move, true);
		ev.bind(document.body, 'mouseup', _up, true);

		var activeDropzone = null;

		var dropEvent = {
			domEvent 	: null,
			x 			: null,
			y 			: null,
			data 		: null,
			ghost 		: ghost
		};

		function _move(evt) {
			evt.stopPropagation();
			evt.preventDefault();
			ghost.moveTo(evt.pageX, evt.pageY);

			var dropzone = dropzoneFromEvent(evt);
			if (dropzone !== activeDropzone) {
				if (activeDropzone) {
					activeDropzone.highlight(false);
					activeDropzone = null;
				}
				_updateDropEvent(evt);
				if (dropzone && dropzone.accepts(dropEvent)) {
					activeDropzone = dropzone;
					activeDropzone.highlight(true);
				}	
			}
		}

		function _up(evt) {
			evt.stopPropagation();
			evt.preventDefault();
			_unbind();

			if (activeDropzone) {
				activeDropzone.highlight(false);
				_updateDropEvent(evt);
				if (activeDropzone.accepts(dropEvent)) {
					activeDropzone.dropped(dropEvent);
				};
				activeDropzone = null;
			}

			if (!ghost.adopted) {
				ghost.destroy();	
			}
		}

		function _updateDropEvent(evt) {
			dropEvent.domEvent = evt;
			dropEvent.x = evt.offsetX;
			dropEvent.y = evt.offsetY;
		}

		function _unbind() {
			ev.unbind(document.body, 'mousemove', _move, true);
			ev.unbind(document.body, 'mouseup', _up, true);
		}
	});
}

exports.dropzone = dropzone;
function dropzone(el) {
	el.__dropzone = {
		accepts: function(dto) {
			return true;
		},
		highlight: function(isHighlighted) {
			if (isHighlighted) {
				el.style.backgroundColor = '#f8f8f8';
			} else {
				el.style.backgroundColor = '';
			}
		},
		dropped: function(dropEvent) {
			console.log(dropEvent);
		}
	}
}