var ev = require('dom-bind');

function DropzoneMatch(dropzone, el) {
	this.dropzone = dropzone;
	this.el = el;
}

DropzoneMatch.prototype.isValid = function() {
	return !!this.dropzone;
}

DropzoneMatch.prototype.eq = function(that) {
	return (this.dropzone === that.dropzone) && (this.el === that.el);
}

DropzoneMatch.prototype.dropped = function(evt) {
	this.dropzone.dropped(evt);
}

DropzoneMatch.prototype.isAcceptable = function(evt) {
	return this.dropzone.accepts(evt);
}

DropzoneMatch.prototype.highlightOn = function() {
	this.dropzone.highlight(this.el, true);
}

DropzoneMatch.prototype.highlightOff = function() {
	this.dropzone.highlight(this.el, false);
}

var NO_DROP = new DropzoneMatch(null, null);

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
	ghost.style.width = el.offsetWidth + 'px';
	ghost.style.height = el.offsetHeight + 'px';
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
		var dz = tmp.__dropzone;
		if (dz && dz.className) {
			var tmp2 = evt.target;
			while (tmp2 !== tmp) {
				if (tmp2.classList.contains(dz.className)) {
					return new DropzoneMatch(dz, tmp2);
				} else {
					tmp2 = tmp2.parentNode;
				}
			}
			break;
		} else if (dz) {
			return new DropzoneMatch(dz, tmp);
		} else {
			tmp = tmp.parentNode;
		}
	}
	return NO_DROP;
}

exports.draggable = draggable;
function draggable(el, opts) {
	opts = opts || {};

	if (opts.selector) {
		ev.delegate(el, 'mousedown', opts.selector, function(evt) {
			startDragging(evt.delegateTarget, evt);
		});
	} else {
		ev.bind(el, 'mousedown', function(evt) {
			startDragging(el, evt);
		});
	}

	function startDragging(el, evt) {
		evt.preventDefault();
		evt.stopPropagation();

		var data = opts ? opts.data : null;
		if (typeof data === 'function') data = data(el);

		var ghost = new Ghost(makeGhostElement(el), 5, 5);
		document.body.appendChild(ghost.el);
		ghost.moveTo(evt.pageX, evt.pageY);

		ev.bind(document.body, 'mousemove', _move, true);
		ev.bind(document.body, 'mouseup', _up, true);

		var activeDropzone = NO_DROP;

		var dropEvent = {
			domEvent 	: null,
			dropTarget 	: null,
			x 			: null,
			y 			: null,
			data 		: data,
			ghost 		: ghost
		};

		function _move(evt) {
			evt.stopPropagation();
			evt.preventDefault();
			ghost.moveTo(evt.pageX, evt.pageY);

			var dropzone = dropzoneFromEvent(evt);

			if (!dropzone.eq(activeDropzone)) {
				if (activeDropzone.isValid()) {
					activeDropzone.highlightOff();
					activeDropzone = NO_DROP;
				}
				_updateDropEvent(evt, dropzone);
				if (dropzone.isValid() && dropzone.isAcceptable(dropEvent)) {
					activeDropzone = dropzone;
					activeDropzone.highlightOn();
				}
			}
		}

		function _up(evt) {
			evt.stopPropagation();
			evt.preventDefault();
			_unbind();

			if (activeDropzone.isValid()) {
				activeDropzone.highlightOff();
				_updateDropEvent(evt, activeDropzone);
				if (activeDropzone.isAcceptable(dropEvent)) {
					activeDropzone.dropped(dropEvent);
				};
				activeDropzone = NO_DROP;
			}

			if (!ghost.adopted) {
				ghost.destroy();
			}
		}

		function _updateDropEvent(evt, dz) {
			dropEvent.domEvent = evt;
			dropEvent.dropTarget = dz.el;
			dropEvent.x = evt.offsetX;
			dropEvent.y = evt.offsetY;
		}

		function _unbind() {
			ev.unbind(document.body, 'mousemove', _move, true);
			ev.unbind(document.body, 'mouseup', _up, true);
		}
	}
}

exports.dropzone = dropzone;
function dropzone(el, className, opts) {
	if (className && typeof className === 'object') {
		opts = className;
		className = null;
	}
	el.__dropzone = {
		className: className,
		accepts: opts.accepts || function(evt) {
			return true;
		},
		highlight: opts.highlight || function(el, isHighlighted) {
			if (isHighlighted) {
				el.classList.add('is-valid-drop-target');
			} else {
				el.classList.remove('is-valid-drop-target');
			}
		},
		dropped: opts.dropped || function(evt) {}
	}
}