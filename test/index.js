'use strict';

var arroyo = require('../');


arroyo().on('data', function (data) {
    console.log(data.id, data.type, new Date(data.created_at));
});