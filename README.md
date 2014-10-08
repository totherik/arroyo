arroyo
=====


```javascript
'use strict';

var arroyo = require('../');


var stream = arroyo(/*{ url: 'https://api.github.com/events' } */);
stream.on('data', function (data) {
    console.log(data.id, data.type, new Date(data.created_at));
});
```
