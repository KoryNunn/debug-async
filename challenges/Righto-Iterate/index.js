var test = require('tape');
var task = require('./task');
var righto = require('righto');

test('Should load correct files', function(t){
	t.plan(5);

	var result = righto(task);

	result(function(error, result){
		t.notOk(error, 'Got no error');

		t.equal(result.length, 3, 'Three files loaded');

		t.equal(result[0], 'things!!', 'First file has correct contents');
		t.equal(result[1], 'Stufffff!', 'Second file has correct contents');
		t.equal(result[2], 'majiggers....???', 'Third file has correct contents');
	});
});