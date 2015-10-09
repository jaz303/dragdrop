var dnd = require('./lib/index');

window.init = function() {
	var items = document.querySelectorAll('.palette-item');
	Array.prototype.slice.call(items, 0).forEach(function(i) {
		dnd.draggable(i);
	});

	var dz1 = document.querySelector('.dropzone-1');
	dnd.dropzone(dz1);
}