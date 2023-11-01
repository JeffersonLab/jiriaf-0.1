var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.render('joblist', { title: 'Job List' });
});

router.post('/', function(req, res, next) {
  var params= req.body;
  var keys= Object.keys(params);
  var values= Object.values(params);

  if (false)
    res.redirect('/submit_fail');

  var msg= '';
  for (let i = 0; i < keys.length; i++) {
    msg+= keys[i]+ ': '+ values[i]+ '\r\n';
  }
  console.log(msg);

  res.redirect('/job_list');
});

module.exports = router;
