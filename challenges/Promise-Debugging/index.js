var test = require('tape');
var task = require('./task');

test('Should load correct files', function(t){
	t.plan(4);

	task().then(function(result){
		t.equal(result.length, 3, 'Three files loaded');

		t.equal(result[0], 'things!!', 'First file has correct contents');
		t.equal(result[1], 'Stufffff!', 'Second file has correct contents');
		t.equal(result[2], 'majiggers....???', 'Third file has correct contents');
	});
});